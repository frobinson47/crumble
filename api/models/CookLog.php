<?php

require_once __DIR__ . '/Database.php';

class CookLog {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function log(int $userId, int $recipeId, ?string $notes = null): array {
        $stmt = $this->db->prepare('INSERT INTO cook_log (user_id, recipe_id, notes) VALUES (?, ?, ?)');
        $stmt->execute([$userId, $recipeId, $notes]);
        return [
            'id' => (int) $this->db->lastInsertId(),
            'recipe_id' => $recipeId,
            'cooked_at' => date('Y-m-d H:i:s'),
        ];
    }

    public function getByUser(int $userId, int $limit = 20): array {
        $stmt = $this->db->prepare('
            SELECT cl.id, cl.recipe_id, cl.cooked_at, cl.notes,
                   r.title, r.image_path
            FROM cook_log cl
            INNER JOIN recipes r ON cl.recipe_id = r.id
            WHERE cl.user_id = ?
            ORDER BY cl.cooked_at DESC
            LIMIT ?
        ');
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    }

    public function getCountForRecipe(int $userId, int $recipeId): int {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM cook_log WHERE user_id = ? AND recipe_id = ?');
        $stmt->execute([$userId, $recipeId]);
        return (int) $stmt->fetchColumn();
    }
}
