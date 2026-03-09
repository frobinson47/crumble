<?php

require_once __DIR__ . '/Database.php';

class RecipeShare {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Find an active (non-expired) share by recipe ID.
     */
    public function findByRecipeId(int $recipeId): ?array {
        $stmt = $this->db->prepare('
            SELECT id, recipe_id, token, created_by, created_at, expires_at
            FROM recipe_shares
            WHERE recipe_id = ? AND expires_at > NOW()
        ');
        $stmt->execute([$recipeId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Find an active (non-expired) share by token.
     */
    public function findByToken(string $token): ?array {
        $stmt = $this->db->prepare('
            SELECT id, recipe_id, token, created_by, created_at, expires_at
            FROM recipe_shares
            WHERE token = ? AND expires_at > NOW()
        ');
        $stmt->execute([$token]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Get a stripped-down recipe by share token.
     * Returns recipe data without user IDs, ratings, favorites, or cook history.
     */
    public function getRecipeByToken(string $token): ?array {
        $share = $this->findByToken($token);
        if (!$share) {
            return null;
        }

        $recipeId = (int) $share['recipe_id'];

        // Fetch recipe (stripped-down — no created_by, no user info)
        $stmt = $this->db->prepare('
            SELECT title, description, image_path, prep_time, cook_time, servings, source_url, instructions
            FROM recipes
            WHERE id = ?
        ');
        $stmt->execute([$recipeId]);
        $recipe = $stmt->fetch();

        if (!$recipe) {
            return null;
        }

        // Decode instructions JSON
        if (is_string($recipe['instructions'])) {
            $recipe['instructions'] = json_decode($recipe['instructions'], true);
        }

        // Get ingredients
        $ingStmt = $this->db->prepare('
            SELECT name, amount, unit, sort_order
            FROM ingredients
            WHERE recipe_id = ?
            ORDER BY sort_order ASC
        ');
        $ingStmt->execute([$recipeId]);
        $recipe['ingredients'] = $ingStmt->fetchAll();

        // Get tags (names only)
        $tagStmt = $this->db->prepare('
            SELECT t.name
            FROM tags t
            INNER JOIN recipe_tags rt ON t.id = rt.tag_id
            WHERE rt.recipe_id = ?
            ORDER BY t.name ASC
        ');
        $tagStmt->execute([$recipeId]);
        $recipe['tags'] = array_column($tagStmt->fetchAll(), 'name');

        // Add share metadata
        $recipe['shared_at'] = $share['created_at'];
        $recipe['expires_at'] = $share['expires_at'];

        return $recipe;
    }

    /**
     * Create a share link for a recipe.
     * Deletes expired shares first, reuses active ones.
     */
    public function create(int $recipeId, int $userId): array {
        // Delete any expired shares for this recipe
        $delStmt = $this->db->prepare('
            DELETE FROM recipe_shares WHERE recipe_id = ? AND expires_at <= NOW()
        ');
        $delStmt->execute([$recipeId]);

        // Check if an active share already exists
        $existing = $this->findByRecipeId($recipeId);
        if ($existing) {
            return $existing;
        }

        // Generate UUID v4 token
        $token = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            random_int(0, 0xffff), random_int(0, 0xffff),
            random_int(0, 0xffff),
            random_int(0, 0x0fff) | 0x4000,
            random_int(0, 0x3fff) | 0x8000,
            random_int(0, 0xffff), random_int(0, 0xffff), random_int(0, 0xffff)
        );

        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));

        $stmt = $this->db->prepare('
            INSERT INTO recipe_shares (recipe_id, token, created_by, expires_at)
            VALUES (?, ?, ?, ?)
        ');
        $stmt->execute([$recipeId, $token, $userId, $expiresAt]);

        // Return the created share
        return $this->findByRecipeId($recipeId);
    }

    /**
     * Revoke a share link. Only the user who created it can revoke it.
     */
    public function revoke(int $recipeId, int $userId): bool {
        $stmt = $this->db->prepare('
            DELETE FROM recipe_shares WHERE recipe_id = ? AND created_by = ?
        ');
        $stmt->execute([$recipeId, $userId]);
        return $stmt->rowCount() > 0;
    }
}
