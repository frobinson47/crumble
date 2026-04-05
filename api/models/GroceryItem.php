<?php

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/../services/UnitConverter.php';

class GroceryItem {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Get all items for a grocery list, unchecked first then checked.
     */
    public function getAllForList(int $listId): array {
        $sql = '
            SELECT gi.id, gi.list_id, gi.name, gi.amount, gi.unit, gi.checked, gi.in_pantry, gi.recipe_id,
                   r.title AS recipe_title
            FROM grocery_items gi
            LEFT JOIN recipes r ON gi.recipe_id = r.id
            WHERE gi.list_id = ?
            ORDER BY gi.checked ASC, gi.id ASC
        ';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$listId]);
        return $stmt->fetchAll();
    }

    /**
     * Find a single item by ID.
     */
    public function findById(int $id): ?array {
        $stmt = $this->db->prepare('
            SELECT gi.id, gi.list_id, gi.name, gi.amount, gi.unit, gi.checked, gi.in_pantry, gi.recipe_id,
                   r.title AS recipe_title
            FROM grocery_items gi
            LEFT JOIN recipes r ON gi.recipe_id = r.id
            WHERE gi.id = ?
        ');
        $stmt->execute([$id]);
        $item = $stmt->fetch();
        return $item ?: null;
    }

    /**
     * Add a single item to a grocery list.
     */
    public function create(int $listId, string $name, ?string $amount = null, ?string $unit = null, ?int $recipeId = null): array {
        $stmt = $this->db->prepare('INSERT INTO grocery_items (list_id, name, amount, unit, recipe_id) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$listId, $name, $amount, $unit, $recipeId]);
        $id = (int) $this->db->lastInsertId();
        return $this->findById($id);
    }

    /**
     * Update an item (checked, name, amount, unit).
     */
    public function update(int $id, array $fields): array {
        $allowed = ['name', 'amount', 'unit', 'checked', 'in_pantry'];
        $sets = [];
        $values = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $fields)) {
                $sets[] = "$field = ?";
                $values[] = $fields[$field];
            }
        }

        if (empty($sets)) {
            return $this->findById($id);
        }

        $values[] = $id;
        $sql = 'UPDATE grocery_items SET ' . implode(', ', $sets) . ' WHERE id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($values);

        return $this->findById($id);
    }

    /**
     * Delete an item.
     */
    public function delete(int $id): bool {
        $stmt = $this->db->prepare('DELETE FROM grocery_items WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Delete all checked items from a grocery list.
     */
    public function clearChecked(int $listId): int {
        $stmt = $this->db->prepare('DELETE FROM grocery_items WHERE list_id = ? AND checked = 1');
        $stmt->execute([$listId]);
        return $stmt->rowCount();
    }

    /**
     * Bulk add all ingredients from a recipe to a grocery list.
     * If an item with the same name already exists, combine amounts when units match.
     * Marks items as in_pantry if they match the user's pantry.
     */
    public function addFromRecipe(int $listId, int $recipeId, int $userId): array {
        // Fetch recipe ingredients
        $stmt = $this->db->prepare('SELECT name, amount, unit FROM ingredients WHERE recipe_id = ? ORDER BY sort_order ASC');
        $stmt->execute([$recipeId]);
        $ingredients = $stmt->fetchAll();

        // Check pantry for matches
        require_once __DIR__ . '/Pantry.php';
        $pantry = new Pantry();
        $ingredientNames = array_column($ingredients, 'name');
        $pantryMatches = $pantry->getPantryMatches($userId, $ingredientNames);

        // Fetch existing items in the list
        $existingStmt = $this->db->prepare('SELECT id, name, amount, unit FROM grocery_items WHERE list_id = ?');
        $existingStmt->execute([$listId]);
        $existingItems = $existingStmt->fetchAll();

        // Index existing items by lowercase name
        $existingByName = [];
        foreach ($existingItems as $item) {
            $existingByName[strtolower(trim($item['name']))] = $item;
        }

        foreach ($ingredients as $ingredient) {
            $key = strtolower(trim($ingredient['name']));
            $inPantry = in_array($key, $pantryMatches, true);

            if (isset($existingByName[$key])) {
                $existing = $existingByName[$key];
                $existingVal = UnitConverter::parseAmount($existing['amount']);
                $newVal = UnitConverter::parseAmount($ingredient['amount']);

                // Update in_pantry flag if now matched
                if ($inPantry) {
                    $this->update($existing['id'], ['in_pantry' => true]);
                }

                if ($existingVal !== null && $newVal !== null) {
                    if ($existing['unit'] === $ingredient['unit']) {
                        $newAmount = UnitConverter::formatAmount($existingVal + $newVal);
                        $this->update($existing['id'], ['amount' => $newAmount]);
                    } elseif (UnitConverter::canConvert($existing['unit'], $ingredient['unit'])) {
                        $convertedVal = UnitConverter::convert($newVal, $ingredient['unit'], $existing['unit']);
                        if ($convertedVal !== null) {
                            $total = $existingVal + $convertedVal;
                            $measureType = UnitConverter::getMeasureType($existing['unit']);
                            $baseAmount = UnitConverter::convert($total, $existing['unit'], $measureType === 'volume' ? 'tsp' : 'g');
                            $best = UnitConverter::bestUnit($baseAmount, $existing['unit'], $measureType);
                            $newAmount = UnitConverter::formatAmount($best['amount']);
                            $this->update($existing['id'], ['amount' => $newAmount, 'unit' => $best['unit']]);
                        }
                    }
                }
            } else {
                $newItem = $this->createWithPantry($listId, $ingredient['name'], $ingredient['amount'], $ingredient['unit'], $recipeId, $inPantry);
                $existingByName[$key] = $newItem;
            }
        }

        return $this->getAllForList($listId);
    }

    /**
     * Enrich grocery items with shoppable package info from ingredient_data.
     */
    public function enrichWithPackageInfo(array $items): array {
        require_once __DIR__ . '/../services/ShoppableQuantity.php';
        $service = new ShoppableQuantity();

        return array_map(function ($item) use ($service) {
            $result = $service->convert($item['amount'], $item['unit'], $item['name']);
            if ($result) {
                $item['package_info'] = $result;
                if ($result['fraction_of_package'] < 0.25) {
                    $item['package_display'] = 'You probably have this';
                    $item['package_suggestion'] = 'pantry';
                } else {
                    $item['package_display'] = $result['packages_needed'] . ' ' .
                        $result['package_description'] .
                        ' (' . $result['package_label'] . ')';
                    $item['package_suggestion'] = null;
                }
            } else {
                $item['package_display'] = null;
                $item['package_info'] = null;
                $item['package_suggestion'] = null;
            }
            return $item;
        }, $items);
    }

    /**
     * Create a grocery item with pantry flag.
     */
    private function createWithPantry(int $listId, string $name, ?string $amount, ?string $unit, ?int $recipeId, bool $inPantry): array {
        $stmt = $this->db->prepare('INSERT INTO grocery_items (list_id, name, amount, unit, recipe_id, in_pantry) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$listId, $name, $amount, $unit, $recipeId, $inPantry ? 1 : 0]);
        $id = (int) $this->db->lastInsertId();
        return $this->findById($id);
    }
}
