<?php

require_once __DIR__ . '/Database.php';

class Rating {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function upsert(int $userId, int $recipeId, int $score): array {
        $stmt = $this->db->prepare('
            INSERT INTO ratings (user_id, recipe_id, score)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE score = VALUES(score), updated_at = CURRENT_TIMESTAMP
        ');
        $stmt->execute([$userId, $recipeId, $score]);
        return [
            'score' => $score,
            'avg_rating' => $this->getAverage($recipeId),
        ];
    }

    public function getUserRating(int $userId, int $recipeId): ?int {
        $stmt = $this->db->prepare('SELECT score FROM ratings WHERE user_id = ? AND recipe_id = ?');
        $stmt->execute([$userId, $recipeId]);
        $score = $stmt->fetchColumn();
        return $score !== false ? (int) $score : null;
    }

    public function getAverage(int $recipeId): ?float {
        $stmt = $this->db->prepare('SELECT AVG(score) FROM ratings WHERE recipe_id = ?');
        $stmt->execute([$recipeId]);
        $avg = $stmt->fetchColumn();
        return $avg !== null && $avg !== false ? round((float) $avg, 1) : null;
    }
}
