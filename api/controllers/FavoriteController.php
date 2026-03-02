<?php

require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../models/Favorite.php';

class FavoriteController {
    public function toggle(int $recipeId): array {
        $userId = Auth::requireAuth();
        $model = new Favorite();
        return $model->toggle($userId, $recipeId);
    }

    public function list(): array {
        $userId = Auth::requireAuth();
        $model = new Favorite();
        return ['recipes' => $model->getByUserWithRecipes($userId)];
    }
}
