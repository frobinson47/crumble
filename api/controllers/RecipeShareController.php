<?php

require_once __DIR__ . '/../models/RecipeShare.php';
require_once __DIR__ . '/../middleware/Auth.php';

class RecipeShareController {

    /**
     * GET /shared/{token}
     * Public endpoint — no auth required.
     */
    public function getByToken(string $token): array {
        // Validate token format (UUID v4)
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $token)) {
            http_response_code(400);
            return ['error' => 'Invalid share link format', 'code' => 400];
        }

        $model = new RecipeShare();
        $recipe = $model->getRecipeByToken($token);

        if (!$recipe) {
            http_response_code(404);
            return ['error' => 'Shared recipe not found or link has expired', 'code' => 404];
        }

        return $recipe;
    }

    /**
     * POST /recipes/{id}/share
     * Requires auth. Creates a share link for the recipe.
     */
    public function createShare(int $recipeId): array {
        $userId = Auth::requireAuth();

        // Verify recipe exists
        require_once __DIR__ . '/../models/Database.php';
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT id FROM recipes WHERE id = ?');
        $stmt->execute([$recipeId]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            return ['error' => 'Recipe not found', 'code' => 404];
        }

        $shareModel = new RecipeShare();
        $share = $shareModel->create($recipeId, $userId);

        http_response_code(201);
        return $share;
    }

    /**
     * DELETE /recipes/{id}/share
     * Requires auth. Revokes the share link for the recipe.
     */
    public function revokeShare(int $recipeId): array {
        $userId = Auth::requireAuth();

        $shareModel = new RecipeShare();
        $revoked = $shareModel->revoke($recipeId, $userId);

        if (!$revoked) {
            http_response_code(404);
            return ['error' => 'No share link found for this recipe', 'code' => 404];
        }

        return ['message' => 'Share link revoked successfully'];
    }
}
