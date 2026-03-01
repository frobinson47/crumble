<?php

require_once __DIR__ . '/Database.php';

class Favorite {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function isFavorited(int $userId, int $recipeId): bool {
        $stmt = $this->db->prepare('SELECT 1 FROM favorites WHERE user_id = ? AND recipe_id = ?');
        $stmt->execute([$userId, $recipeId]);
        return (bool) $stmt->fetch();
    }

    public function toggle(int $userId, int $recipeId): array {
        if ($this->isFavorited($userId, $recipeId)) {
            $stmt = $this->db->prepare('DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?');
            $stmt->execute([$userId, $recipeId]);
            return ['favorited' => false];
        } else {
            $stmt = $this->db->prepare('INSERT INTO favorites (user_id, recipe_id) VALUES (?, ?)');
            $stmt->execute([$userId, $recipeId]);
            return ['favorited' => true];
        }
    }

    public function getByUser(int $userId): array {
        $stmt = $this->db->prepare('SELECT recipe_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$userId]);
        return array_column($stmt->fetchAll(), 'recipe_id');
    }

    public function getCount(int $recipeId): int {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM favorites WHERE recipe_id = ?');
        $stmt->execute([$recipeId]);
        return (int) $stmt->fetchColumn();
    }
}
