<?php

require_once __DIR__ . '/Database.php';

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
            SELECT gi.id, gi.list_id, gi.name, gi.amount, gi.unit, gi.checked, gi.recipe_id,
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
            SELECT gi.id, gi.list_id, gi.name, gi.amount, gi.unit, gi.checked, gi.recipe_id,
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
        $allowed = ['name', 'amount', 'unit', 'checked'];
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
     * Bulk add all ingredients from a recipe to a grocery list.
     * If an item with the same name already exists, combine amounts when units match.
     */
    public function addFromRecipe(int $listId, int $recipeId): array {
        // Fetch recipe ingredients
        $stmt = $this->db->prepare('SELECT name, amount, unit FROM ingredients WHERE recipe_id = ? ORDER BY sort_order ASC');
        $stmt->execute([$recipeId]);
        $ingredients = $stmt->fetchAll();

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

            if (isset($existingByName[$key])) {
                $existing = $existingByName[$key];
                // Combine amounts if units match
                if ($existing['unit'] === $ingredient['unit'] && is_numeric($existing['amount']) && is_numeric($ingredient['amount'])) {
                    $newAmount = (string)((float)$existing['amount'] + (float)$ingredient['amount']);
                    $this->update($existing['id'], ['amount' => $newAmount]);
                }
                // If units don't match or amounts aren't numeric, skip combining (item already exists)
            } else {
                $this->create($listId, $ingredient['name'], $ingredient['amount'], $ingredient['unit'], $recipeId);
            }
        }

        return $this->getAllForList($listId);
    }
}
