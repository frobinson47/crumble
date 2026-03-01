<?php

require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../models/Rating.php';

class RatingController {
    public function rate(int $recipeId): array {
        $userId = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true);
        $score = (int) ($input['score'] ?? 0);

        if ($score < 1 || $score > 5) {
            http_response_code(400);
            return ['error' => 'Score must be between 1 and 5'];
        }

        $model = new Rating();
        return $model->upsert($userId, $recipeId, $score);
    }
}
