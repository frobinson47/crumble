<?php

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/GroceryList.php';
require_once __DIR__ . '/GroceryItem.php';

class MealPlan {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Get or create a meal plan for a given week, returning plan with all items.
     */
    public function getByWeek(int $userId, string $weekStart): array {
        // Snap weekStart to Monday
        $snappedDate = date('Y-m-d', strtotime('monday this week', strtotime($weekStart)));

        // Atomic upsert — find or create the plan
        $stmt = $this->db->prepare('
            INSERT INTO meal_plans (user_id, week_start)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)
        ');
        $stmt->execute([$userId, $snappedDate]);
        $planId = (int) $this->db->lastInsertId();

        // Fetch all items for this plan with recipe data
        $itemStmt = $this->db->prepare('
            SELECT mpi.id, mpi.recipe_id, mpi.day_of_week, mpi.sort_order, mpi.servings_override,
                   r.id AS r_id, r.title, r.image_path, r.servings, r.prep_time, r.cook_time
            FROM meal_plan_items mpi
            INNER JOIN recipes r ON mpi.recipe_id = r.id
            WHERE mpi.plan_id = ?
            ORDER BY mpi.sort_order ASC, mpi.id ASC
        ');
        $itemStmt->execute([$planId]);
        $rows = $itemStmt->fetchAll();

        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id' => (int) $row['id'],
                'recipe_id' => (int) $row['recipe_id'],
                'day_of_week' => (int) $row['day_of_week'],
                'sort_order' => (int) $row['sort_order'],
                'servings_override' => $row['servings_override'] !== null ? (int) $row['servings_override'] : null,
                'recipe' => [
                    'id' => (int) $row['r_id'],
                    'title' => $row['title'],
                    'image_path' => $row['image_path'],
                    'servings' => $row['servings'] !== null ? (int) $row['servings'] : null,
                    'prep_time' => $row['prep_time'] !== null ? (int) $row['prep_time'] : null,
                    'cook_time' => $row['cook_time'] !== null ? (int) $row['cook_time'] : null,
                ],
            ];
        }

        return [
            'id' => $planId,
            'week_start' => $snappedDate,
            'items' => $items,
        ];
    }

    /**
     * Add a recipe to a meal plan day.
     * Returns the new item with recipe data, or null if unauthorized.
     */
    public function addItem(int $planId, int $recipeId, int $dayOfWeek, int $userId): ?array {
        // Verify plan ownership
        $stmt = $this->db->prepare('SELECT user_id FROM meal_plans WHERE id = ?');
        $stmt->execute([$planId]);
        $row = $stmt->fetch();

        if (!$row || (int) $row['user_id'] !== $userId) {
            return null;
        }

        // Validate day_of_week
        if ($dayOfWeek < 0 || $dayOfWeek > 6) {
            return null;
        }

        // Calculate sort_order
        $sortStmt = $this->db->prepare('
            SELECT COALESCE(MAX(sort_order), -1) + 1
            FROM meal_plan_items
            WHERE plan_id = ? AND day_of_week = ?
        ');
        $sortStmt->execute([$planId, $dayOfWeek]);
        $sortOrder = (int) $sortStmt->fetchColumn();

        // Insert item
        $insertStmt = $this->db->prepare('
            INSERT INTO meal_plan_items (plan_id, recipe_id, day_of_week, sort_order)
            VALUES (?, ?, ?, ?)
        ');
        $insertStmt->execute([$planId, $recipeId, $dayOfWeek, $sortOrder]);
        $itemId = (int) $this->db->lastInsertId();

        // Return with recipe data
        $fetchStmt = $this->db->prepare('
            SELECT mpi.id, mpi.recipe_id, mpi.day_of_week, mpi.sort_order, mpi.servings_override,
                   r.id AS r_id, r.title, r.image_path, r.servings, r.prep_time, r.cook_time
            FROM meal_plan_items mpi
            INNER JOIN recipes r ON mpi.recipe_id = r.id
            WHERE mpi.id = ?
        ');
        $fetchStmt->execute([$itemId]);
        $item = $fetchStmt->fetch();

        if (!$item) {
            return null;
        }

        return [
            'id' => (int) $item['id'],
            'recipe_id' => (int) $item['recipe_id'],
            'day_of_week' => (int) $item['day_of_week'],
            'sort_order' => (int) $item['sort_order'],
            'servings_override' => $item['servings_override'] !== null ? (int) $item['servings_override'] : null,
            'recipe' => [
                'id' => (int) $item['r_id'],
                'title' => $item['title'],
                'image_path' => $item['image_path'],
                'servings' => $item['servings'] !== null ? (int) $item['servings'] : null,
                'prep_time' => $item['prep_time'] !== null ? (int) $item['prep_time'] : null,
                'cook_time' => $item['cook_time'] !== null ? (int) $item['cook_time'] : null,
            ],
        ];
    }

    /**
     * Update a meal plan item. Only updates fields present in $data.
     * Returns true on success, false if not found or unauthorized.
     */
    public function updateItem(int $itemId, array $data, int $userId): bool {
        // Verify ownership via JOIN
        $stmt = $this->db->prepare('
            SELECT mpi.id
            FROM meal_plan_items mpi
            INNER JOIN meal_plans mp ON mpi.plan_id = mp.id
            WHERE mpi.id = ? AND mp.user_id = ?
        ');
        $stmt->execute([$itemId, $userId]);

        if (!$stmt->fetch()) {
            return false;
        }

        // Build dynamic update
        $allowed = ['day_of_week', 'sort_order', 'servings_override'];
        $sets = [];
        $values = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $sets[] = "$field = ?";
                $values[] = $data[$field];
            }
        }

        if (empty($sets)) {
            return true;
        }

        $values[] = $itemId;
        $sql = 'UPDATE meal_plan_items SET ' . implode(', ', $sets) . ' WHERE id = ?';
        $updateStmt = $this->db->prepare($sql);
        $updateStmt->execute($values);

        return true;
    }

    /**
     * Remove a meal plan item. Returns true on success, false if not found or unauthorized.
     */
    public function removeItem(int $itemId, int $userId): bool {
        // DELETE with JOIN to verify ownership
        $stmt = $this->db->prepare('
            DELETE mpi FROM meal_plan_items mpi
            INNER JOIN meal_plans mp ON mpi.plan_id = mp.id
            WHERE mpi.id = ? AND mp.user_id = ?
        ');
        $stmt->execute([$itemId, $userId]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Generate a grocery list from all items in a meal plan.
     * Returns the new grocery list ID, or null if unauthorized.
     */
    public function generateGroceryList(int $planId, string $listName, int $userId): ?int {
        // Verify plan ownership
        $stmt = $this->db->prepare('SELECT user_id FROM meal_plans WHERE id = ?');
        $stmt->execute([$planId]);
        $row = $stmt->fetch();

        if (!$row || (int) $row['user_id'] !== $userId) {
            return null;
        }

        // Fetch all meal plan items with their recipe ingredients
        $itemStmt = $this->db->prepare('
            SELECT mpi.servings_override, r.servings AS recipe_servings,
                   i.name, i.amount, i.unit, r.id AS recipe_id
            FROM meal_plan_items mpi
            INNER JOIN recipes r ON mpi.recipe_id = r.id
            INNER JOIN ingredients i ON i.recipe_id = r.id
            WHERE mpi.plan_id = ?
            ORDER BY i.sort_order ASC
        ');
        $itemStmt->execute([$planId]);
        $ingredients = $itemStmt->fetchAll();

        // Create the grocery list
        $groceryListModel = new GroceryList();
        $list = $groceryListModel->create($listName, $userId);
        $listId = (int) $list['id'];

        // Add each ingredient to the grocery list
        $groceryItemModel = new GroceryItem();

        foreach ($ingredients as $ingredient) {
            $amount = $ingredient['amount'];

            // Scale amount if servings_override differs from recipe servings
            if ($ingredient['servings_override'] !== null
                && $ingredient['recipe_servings'] !== null
                && (int) $ingredient['recipe_servings'] > 0
                && (int) $ingredient['servings_override'] !== (int) $ingredient['recipe_servings']
            ) {
                $parsedAmount = $this->parseAmount($amount);
                if ($parsedAmount !== null) {
                    $scale = (int) $ingredient['servings_override'] / (int) $ingredient['recipe_servings'];
                    $scaledAmount = $parsedAmount * $scale;
                    $amount = $this->formatAmount($scaledAmount);
                }
            }

            $groceryItemModel->create(
                $listId,
                $ingredient['name'],
                $amount,
                $ingredient['unit'],
                (int) $ingredient['recipe_id']
            );
        }

        return $listId;
    }

    /**
     * Parse an amount string to a float.
     * Handles: "2", "1/2", "1 1/2", "2-3" (averages range).
     * Returns null for empty, null, or non-numeric strings like "to taste".
     */
    private function parseAmount(?string $amount): ?float {
        if ($amount === null || trim($amount) === '') {
            return null;
        }

        $amount = trim($amount);

        // Range: "2-3" → average
        if (preg_match('/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/', $amount, $matches)) {
            return ((float) $matches[1] + (float) $matches[2]) / 2;
        }

        // Mixed number: "1 1/2"
        if (preg_match('/^(\d+)\s+(\d+)\/(\d+)$/', $amount, $matches)) {
            return (float) $matches[1] + (float) $matches[2] / (float) $matches[3];
        }

        // Fraction: "1/2"
        if (preg_match('/^(\d+)\/(\d+)$/', $amount, $matches)) {
            return (float) $matches[1] / (float) $matches[2];
        }

        // Simple number: "2" or "2.5"
        if (is_numeric($amount)) {
            return (float) $amount;
        }

        // Non-numeric (e.g., "to taste")
        return null;
    }

    /**
     * Format a float amount back to a human-readable string.
     * 1.5 → "1 1/2", 0.5 → "1/2", 2.0 → "2", 0.333 → "1/3"
     */
    private function formatAmount(float $amount): string {
        // Common fractions lookup
        $fractions = [
            1/8 => '1/8',
            1/6 => '1/6',
            1/4 => '1/4',
            1/3 => '1/3',
            3/8 => '3/8',
            1/2 => '1/2',
            5/8 => '5/8',
            2/3 => '2/3',
            3/4 => '3/4',
            5/6 => '5/6',
            7/8 => '7/8',
        ];

        // Whole number
        if (abs($amount - round($amount)) < 0.001) {
            return (string) (int) round($amount);
        }

        $whole = (int) floor($amount);
        $decimal = $amount - $whole;

        // Check if decimal part matches a common fraction
        foreach ($fractions as $value => $display) {
            if (abs($decimal - $value) < 0.01) {
                if ($whole > 0) {
                    return "$whole $display";
                }
                return $display;
            }
        }

        // Fallback: round to 2 decimal places
        if ($whole > 0) {
            return (string) round($amount, 2);
        }
        return (string) round($amount, 2);
    }
}
