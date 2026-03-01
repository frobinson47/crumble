<?php

require_once __DIR__ . '/Database.php';

class Recipe {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Get paginated recipe list with optional search and tag filter.
     * Returns recipes with their tags and ingredient count.
     */
    public function getAll(int $page = 1, int $perPage = 20, ?string $search = null, ?string $tag = null): array {
        $where = [];
        $params = [];

        if ($search !== null && $search !== '') {
            $where[] = 'MATCH(r.title, r.description) AGAINST(? IN BOOLEAN MODE)';
            // Append wildcard for partial matching
            $params[] = $search . '*';
        }

        if ($tag !== null && $tag !== '') {
            $where[] = 'EXISTS (
                SELECT 1 FROM recipe_tags rt
                INNER JOIN tags t ON rt.tag_id = t.id
                WHERE rt.recipe_id = r.id AND t.name = ?
            )';
            $params[] = $tag;
        }

        $whereClause = '';
        if (!empty($where)) {
            $whereClause = 'WHERE ' . implode(' AND ', $where);
        }

        // Count total
        $countSql = "SELECT COUNT(*) FROM recipes r $whereClause";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        // Fetch page
        $offset = ($page - 1) * $perPage;
        $userId = $_SESSION['user_id'] ?? null;

        $sql = "
            SELECT r.id, r.title, r.description, r.prep_time, r.cook_time, r.servings,
                   r.image_path, r.created_at, r.updated_at, r.created_by,
                   u.username AS author,
                   (SELECT COUNT(*) FROM ingredients i WHERE i.recipe_id = r.id) AS ingredient_count,
                   (SELECT ROUND(AVG(rt.score), 1) FROM ratings rt WHERE rt.recipe_id = r.id) AS avg_rating,
                   (SELECT COUNT(*) FROM favorites f WHERE f.recipe_id = r.id) AS favorite_count
            FROM recipes r
            LEFT JOIN users u ON r.created_by = u.id
            $whereClause
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        ";
        $allParams = array_merge($params, [$perPage, $offset]);
        $stmt = $this->db->prepare($sql);
        $stmt->execute($allParams);
        $recipes = $stmt->fetchAll();

        // Attach tags to each recipe
        if (!empty($recipes)) {
            $ids = array_column($recipes, 'id');
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $tagSql = "
                SELECT rt.recipe_id, t.id AS tag_id, t.name AS tag_name
                FROM recipe_tags rt
                INNER JOIN tags t ON rt.tag_id = t.id
                WHERE rt.recipe_id IN ($placeholders)
                ORDER BY t.name ASC
            ";
            $tagStmt = $this->db->prepare($tagSql);
            $tagStmt->execute($ids);
            $tagRows = $tagStmt->fetchAll();

            $tagMap = [];
            foreach ($tagRows as $row) {
                $tagMap[$row['recipe_id']][] = [
                    'id' => (int) $row['tag_id'],
                    'name' => $row['tag_name'],
                ];
            }

            // Add user-specific favorite status
            if ($userId) {
                $favSql = "SELECT recipe_id FROM favorites WHERE user_id = ? AND recipe_id IN ($placeholders)";
                $favStmt = $this->db->prepare($favSql);
                $favStmt->execute(array_merge([$userId], $ids));
                $favSet = array_flip(array_column($favStmt->fetchAll(), 'recipe_id'));
            }

            foreach ($recipes as &$recipe) {
                $recipe['tags'] = $tagMap[$recipe['id']] ?? [];
                $recipe['is_favorited'] = isset($favSet[$recipe['id']]);
                $recipe['avg_rating'] = $recipe['avg_rating'] !== null ? (float) $recipe['avg_rating'] : null;
                $recipe['favorite_count'] = (int) $recipe['favorite_count'];
            }
            unset($recipe);
        }

        return [
            'recipes' => $recipes,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => (int) ceil($total / $perPage),
        ];
    }

    /**
     * Get a single recipe by ID with all ingredients, tags, and prev/next IDs.
     */
    public function findById(int $id): ?array {
        $stmt = $this->db->prepare('
            SELECT r.*, u.username AS author
            FROM recipes r
            LEFT JOIN users u ON r.created_by = u.id
            WHERE r.id = ?
        ');
        $stmt->execute([$id]);
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
            SELECT id, name, amount, unit, sort_order
            FROM ingredients
            WHERE recipe_id = ?
            ORDER BY sort_order ASC
        ');
        $ingStmt->execute([$id]);
        $recipe['ingredients'] = $ingStmt->fetchAll();

        // Get tags
        $tagStmt = $this->db->prepare('
            SELECT t.id, t.name
            FROM tags t
            INNER JOIN recipe_tags rt ON t.id = rt.tag_id
            WHERE rt.recipe_id = ?
            ORDER BY t.name ASC
        ');
        $tagStmt->execute([$id]);
        $recipe['tags'] = $tagStmt->fetchAll();

        // Get aggregates: avg rating, favorite count, cook count
        $ratingStmt = $this->db->prepare('SELECT ROUND(AVG(score), 1) FROM ratings WHERE recipe_id = ?');
        $ratingStmt->execute([$id]);
        $avgRating = $ratingStmt->fetchColumn();
        $recipe['avg_rating'] = $avgRating !== false && $avgRating !== null ? (float) $avgRating : null;

        $favCountStmt = $this->db->prepare('SELECT COUNT(*) FROM favorites WHERE recipe_id = ?');
        $favCountStmt->execute([$id]);
        $recipe['favorite_count'] = (int) $favCountStmt->fetchColumn();

        // User-specific data
        $userId = $_SESSION['user_id'] ?? null;
        if ($userId) {
            $favStmt = $this->db->prepare('SELECT 1 FROM favorites WHERE user_id = ? AND recipe_id = ?');
            $favStmt->execute([$userId, $id]);
            $recipe['is_favorited'] = (bool) $favStmt->fetch();

            $userRatingStmt = $this->db->prepare('SELECT score FROM ratings WHERE user_id = ? AND recipe_id = ?');
            $userRatingStmt->execute([$userId, $id]);
            $ur = $userRatingStmt->fetchColumn();
            $recipe['user_rating'] = $ur !== false ? (int) $ur : null;

            $cookCountStmt = $this->db->prepare('SELECT COUNT(*) FROM cook_log WHERE user_id = ? AND recipe_id = ?');
            $cookCountStmt->execute([$userId, $id]);
            $recipe['cook_count'] = (int) $cookCountStmt->fetchColumn();
        } else {
            $recipe['is_favorited'] = false;
            $recipe['user_rating'] = null;
            $recipe['cook_count'] = 0;
        }

        // Get prev/next recipe IDs for navigation
        $prevStmt = $this->db->prepare('SELECT id FROM recipes WHERE id < ? ORDER BY id DESC LIMIT 1');
        $prevStmt->execute([$id]);
        $prev = $prevStmt->fetchColumn();
        $recipe['prev_id'] = $prev !== false ? (int) $prev : null;

        $nextStmt = $this->db->prepare('SELECT id FROM recipes WHERE id > ? ORDER BY id ASC LIMIT 1');
        $nextStmt->execute([$id]);
        $next = $nextStmt->fetchColumn();
        $recipe['next_id'] = $next !== false ? (int) $next : null;

        // Remove password_hash from response (should not be in the join, but safety)
        unset($recipe['password_hash']);

        return $recipe;
    }

    /**
     * Create a recipe with ingredients and tags. Uses transaction.
     */
    public function create(array $data, int $userId): array {
        $this->db->beginTransaction();

        try {
            // Insert recipe
            $stmt = $this->db->prepare('
                INSERT INTO recipes (title, description, prep_time, cook_time, servings, source_url, image_path, instructions, created_by, calories, protein, carbs, fat, fiber, sugar)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $instructions = is_array($data['instructions'] ?? null) ? json_encode($data['instructions']) : ($data['instructions'] ?? '[]');
            $stmt->execute([
                $data['title'],
                $data['description'] ?? null,
                $data['prep_time'] ?? null,
                $data['cook_time'] ?? null,
                $data['servings'] ?? null,
                $data['source_url'] ?? null,
                $data['image_path'] ?? null,
                $instructions,
                $userId,
                $data['calories'] ?? null,
                $data['protein'] ?? null,
                $data['carbs'] ?? null,
                $data['fat'] ?? null,
                $data['fiber'] ?? null,
                $data['sugar'] ?? null,
            ]);
            $recipeId = (int) $this->db->lastInsertId();

            // Insert ingredients
            if (!empty($data['ingredients'])) {
                $ingStmt = $this->db->prepare('
                    INSERT INTO ingredients (recipe_id, name, amount, unit, sort_order)
                    VALUES (?, ?, ?, ?, ?)
                ');
                foreach ($data['ingredients'] as $i => $ingredient) {
                    $ingStmt->execute([
                        $recipeId,
                        $ingredient['name'],
                        $ingredient['amount'] ?? null,
                        $ingredient['unit'] ?? null,
                        $ingredient['sort_order'] ?? $i,
                    ]);
                }
            }

            // Sync tags
            if (!empty($data['tags'])) {
                foreach ($data['tags'] as $tagName) {
                    $tagName = trim($tagName);
                    if ($tagName === '') continue;

                    // Find or create tag
                    $findStmt = $this->db->prepare('SELECT id FROM tags WHERE name = ?');
                    $findStmt->execute([$tagName]);
                    $tagId = $findStmt->fetchColumn();

                    if ($tagId === false) {
                        $createStmt = $this->db->prepare('INSERT INTO tags (name) VALUES (?)');
                        $createStmt->execute([$tagName]);
                        $tagId = (int) $this->db->lastInsertId();
                    }

                    $linkStmt = $this->db->prepare('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)');
                    $linkStmt->execute([$recipeId, (int) $tagId]);
                }
            }

            $this->db->commit();
            return $this->findById($recipeId);
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Update a recipe. Deletes and re-inserts ingredients. Syncs tags. Uses transaction.
     */
    public function update(int $id, array $data): array {
        $this->db->beginTransaction();

        try {
            // Build dynamic UPDATE for recipe fields
            $allowed = ['title', 'description', 'prep_time', 'cook_time', 'servings', 'source_url', 'image_path', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar'];
            $sets = [];
            $values = [];

            foreach ($allowed as $field) {
                if (array_key_exists($field, $data)) {
                    $sets[] = "$field = ?";
                    $values[] = $data[$field];
                }
            }

            // Handle instructions separately (JSON encode)
            if (array_key_exists('instructions', $data)) {
                $sets[] = 'instructions = ?';
                $values[] = is_array($data['instructions']) ? json_encode($data['instructions']) : $data['instructions'];
            }

            if (!empty($sets)) {
                $values[] = $id;
                $sql = 'UPDATE recipes SET ' . implode(', ', $sets) . ' WHERE id = ?';
                $stmt = $this->db->prepare($sql);
                $stmt->execute($values);
            }

            // Re-insert ingredients if provided
            if (array_key_exists('ingredients', $data)) {
                $delStmt = $this->db->prepare('DELETE FROM ingredients WHERE recipe_id = ?');
                $delStmt->execute([$id]);

                if (!empty($data['ingredients'])) {
                    $ingStmt = $this->db->prepare('
                        INSERT INTO ingredients (recipe_id, name, amount, unit, sort_order)
                        VALUES (?, ?, ?, ?, ?)
                    ');
                    foreach ($data['ingredients'] as $i => $ingredient) {
                        $ingStmt->execute([
                            $id,
                            $ingredient['name'],
                            $ingredient['amount'] ?? null,
                            $ingredient['unit'] ?? null,
                            $ingredient['sort_order'] ?? $i,
                        ]);
                    }
                }
            }

            // Sync tags if provided
            if (array_key_exists('tags', $data)) {
                // Remove existing tag associations
                $delTagStmt = $this->db->prepare('DELETE FROM recipe_tags WHERE recipe_id = ?');
                $delTagStmt->execute([$id]);

                if (!empty($data['tags'])) {
                    foreach ($data['tags'] as $tagName) {
                        $tagName = trim($tagName);
                        if ($tagName === '') continue;

                        $findStmt = $this->db->prepare('SELECT id FROM tags WHERE name = ?');
                        $findStmt->execute([$tagName]);
                        $tagId = $findStmt->fetchColumn();

                        if ($tagId === false) {
                            $createStmt = $this->db->prepare('INSERT INTO tags (name) VALUES (?)');
                            $createStmt->execute([$tagName]);
                            $tagId = (int) $this->db->lastInsertId();
                        }

                        $linkStmt = $this->db->prepare('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)');
                        $linkStmt->execute([$id, (int) $tagId]);
                    }
                }
            }

            $this->db->commit();
            return $this->findById($id);
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Delete a recipe and its associated image files.
     */
    public function delete(int $id): bool {
        // Get image path before deleting
        $stmt = $this->db->prepare('SELECT image_path FROM recipes WHERE id = ?');
        $stmt->execute([$id]);
        $imagePath = $stmt->fetchColumn();

        // Delete the recipe (cascades to ingredients, recipe_tags)
        $delStmt = $this->db->prepare('DELETE FROM recipes WHERE id = ?');
        $delStmt->execute([$id]);
        $deleted = $delStmt->rowCount() > 0;

        // Delete image files if they exist
        if ($deleted && $imagePath) {
            $uploadDir = defined('UPLOAD_DIR') ? UPLOAD_DIR : __DIR__ . '/../../uploads/';
            $fullPath = $uploadDir . $imagePath;
            $thumbPath = $uploadDir . str_replace('full.jpg', 'thumb.jpg', $imagePath);
            $dirPath = dirname($fullPath);

            if (file_exists($fullPath)) @unlink($fullPath);
            if (file_exists($thumbPath)) @unlink($thumbPath);
            if (is_dir($dirPath) && count(scandir($dirPath)) === 2) @rmdir($dirPath);
        }

        return $deleted;
    }

    /**
     * Get a featured recipe (highest rated with image, or most recent with image).
     */
    public function getFeatured(): ?array {
        // Try highest rated with image first
        $stmt = $this->db->prepare('
            SELECT r.id, r.title, r.description, r.image_path, r.prep_time, r.cook_time, r.servings,
                   ROUND(AVG(rt.score), 1) AS avg_rating
            FROM recipes r
            INNER JOIN ratings rt ON rt.recipe_id = r.id
            WHERE r.image_path IS NOT NULL AND r.image_path != ""
            GROUP BY r.id
            ORDER BY avg_rating DESC, r.created_at DESC
            LIMIT 1
        ');
        $stmt->execute();
        $recipe = $stmt->fetch();

        if (!$recipe) {
            // Fallback: most recent with image
            $stmt = $this->db->prepare('
                SELECT id, title, description, image_path, prep_time, cook_time, servings
                FROM recipes
                WHERE image_path IS NOT NULL AND image_path != ""
                ORDER BY created_at DESC
                LIMIT 1
            ');
            $stmt->execute();
            $recipe = $stmt->fetch();
        }

        return $recipe ?: null;
    }

    /**
     * Get related recipes by shared tags.
     */
    public function getRelated(int $recipeId, int $limit = 4): array {
        $stmt = $this->db->prepare('
            SELECT DISTINCT r.id, r.title, r.image_path, r.prep_time, r.cook_time, r.servings,
                   COUNT(rt2.tag_id) AS shared_tags,
                   (SELECT ROUND(AVG(score), 1) FROM ratings WHERE recipe_id = r.id) AS avg_rating
            FROM recipes r
            INNER JOIN recipe_tags rt2 ON rt2.recipe_id = r.id
            WHERE rt2.tag_id IN (
                SELECT tag_id FROM recipe_tags WHERE recipe_id = ?
            )
            AND r.id != ?
            GROUP BY r.id
            ORDER BY shared_tags DESC, r.created_at DESC
            LIMIT ?
        ');
        $stmt->execute([$recipeId, $recipeId, $limit]);
        return $stmt->fetchAll();
    }

    /**
     * Check if a user is the creator of a recipe.
     */
    public function isCreator(int $recipeId, int $userId): bool {
        $stmt = $this->db->prepare('SELECT 1 FROM recipes WHERE id = ? AND created_by = ?');
        $stmt->execute([$recipeId, $userId]);
        return (bool) $stmt->fetch();
    }
}
