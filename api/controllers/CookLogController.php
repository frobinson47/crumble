<?php

require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../models/CookLog.php';

class CookLogController {
    public function log(int $recipeId): array {
        $userId = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true);
        $notes = $input['notes'] ?? null;

        $model = new CookLog();
        return $model->log($userId, $recipeId, $notes);
    }

    public function history(): array {
        $userId = Auth::requireAuth();
        $model = new CookLog();
        return ['history' => $model->getByUser($userId)];
    }
}
