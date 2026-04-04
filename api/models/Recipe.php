<?php

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/../services/AutoTagger.php';

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
            // Search across title, description, ingredients, and tags
            $where[] = '(
                MATCH(r.title, r.description) AGAINST(? IN BOOLEAN MODE)
                OR EXISTS (SELECT 1 FROM ingredients i WHERE i.recipe_id = r.id AND i.name LIKE ?)
                OR EXISTS (SELECT 1 FROM recipe_tags rt2 INNER JOIN tags t2 ON rt2.tag_id = t2.id WHERE rt2.recipe_id = r.id AND t2.name LIKE ?)
            )';
            $params[] = $search . '*';
            $params[] = '%' . $search . '%';
            $params[] = '%' . $search . '%';
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

        // When searching, order by relevance (title/desc matches first, then ingredient/tag matches)
        // When not searching, order by newest first
        $relevanceSelect = '';
        $orderBy = 'r.created_at DESC';
        $orderParams = [];
        if ($search !== null && $search !== '') {
            $relevanceSelect = ', MATCH(r.title, r.description) AGAINST(? IN BOOLEAN MODE) AS relevance';
            $orderParams[] = $search . '*';
            $orderBy = 'relevance DESC, r.created_at DESC';
        }

        $sql = "
            SELECT r.id, r.title, r.description, r.prep_time, r.cook_time, r.servings,
                   r.image_path, r.calories, r.created_at, r.updated_at, r.created_by,
                   u.username AS author,
                   (SELECT COUNT(*) FROM ingredients i WHERE i.recipe_id = r.id) AS ingredient_count,
                   (SELECT ROUND(AVG(rt.score), 1) FROM ratings rt WHERE rt.recipe_id = r.id) AS avg_rating,
                   (SELECT COUNT(*) FROM favorites f WHERE f.recipe_id = r.id) AS favorite_count,
                   COALESCE(JSON_LENGTH(r.instructions), 0) AS step_count
                   $relevanceSelect
            FROM recipes r
            LEFT JOIN users u ON r.created_by = u.id
            $whereClause
            ORDER BY $orderBy
            LIMIT ? OFFSET ?
        ";
        $allParams = array_merge($params, $orderParams, [$perPage, $offset]);
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

            // Add user-specific favorite status and cook counts
            if ($userId) {
                $favSql = "SELECT recipe_id FROM favorites WHERE user_id = ? AND recipe_id IN ($placeholders)";
                $favStmt = $this->db->prepare($favSql);
                $favStmt->execute(array_merge([$userId], $ids));
                $favSet = array_flip(array_column($favStmt->fetchAll(), 'recipe_id'));

                $cookSql = "SELECT recipe_id, COUNT(*) AS cnt FROM cook_log WHERE user_id = ? AND recipe_id IN ($placeholders) GROUP BY recipe_id";
                $cookStmt = $this->db->prepare($cookSql);
                $cookStmt->execute(array_merge([$userId], $ids));
                $cookCounts = [];
                foreach ($cookStmt->fetchAll() as $row) {
                    $cookCounts[$row['recipe_id']] = (int) $row['cnt'];
                }
            }

            foreach ($recipes as &$recipe) {
                $recipe['tags'] = $tagMap[$recipe['id']] ?? [];
                $recipe['is_favorited'] = isset($favSet[$recipe['id']]);
                $recipe['cook_count'] = $cookCounts[$recipe['id']] ?? 0;
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
        $userId = $_SESSION['user_id'] ?? null;

        // Single query for recipe + author + all aggregates + prev/next navigation
        $stmt = $this->db->prepare('
            SELECT r.*, u.username AS author,
                (SELECT ROUND(AVG(score), 1) FROM ratings WHERE recipe_id = r.id) AS avg_rating,
                (SELECT COUNT(*) FROM favorites WHERE recipe_id = r.id) AS favorite_count,
                (SELECT 1 FROM favorites WHERE user_id = ? AND recipe_id = r.id) AS is_favorited,
                (SELECT score FROM ratings WHERE user_id = ? AND recipe_id = r.id) AS user_rating,
                (SELECT COUNT(*) FROM cook_log WHERE user_id = ? AND recipe_id = r.id) AS cook_count,
                (SELECT id FROM recipes WHERE id < r.id ORDER BY id DESC LIMIT 1) AS prev_id,
                (SELECT id FROM recipes WHERE id > r.id ORDER BY id ASC LIMIT 1) AS next_id
            FROM recipes r
            LEFT JOIN users u ON r.created_by = u.id
            WHERE r.id = ?
        ');
        $stmt->execute([$userId, $userId, $userId, $id]);
        $recipe = $stmt->fetch();

        if (!$recipe) {
            return null;
        }

        // Cast types
        $recipe['avg_rating'] = $recipe['avg_rating'] !== null ? (float) $recipe['avg_rating'] : null;
        $recipe['favorite_count'] = (int) $recipe['favorite_count'];
        $recipe['is_favorited'] = (bool) $recipe['is_favorited'];
        $recipe['user_rating'] = $recipe['user_rating'] !== null ? (int) $recipe['user_rating'] : null;
        $recipe['cook_count'] = (int) $recipe['cook_count'];
        $recipe['prev_id'] = $recipe['prev_id'] !== null ? (int) $recipe['prev_id'] : null;
        $recipe['next_id'] = $recipe['next_id'] !== null ? (int) $recipe['next_id'] : null;

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

            // Auto-tag: suggest tags based on recipe content, merge with provided tags
            $autoTagger = new AutoTagger();
            $suggestedTags = $autoTagger->suggest($data);
            $existingTags = array_map('strtolower', array_map('trim', $data['tags'] ?? []));
            $allTags = array_unique(array_merge($existingTags, $suggestedTags));
            $allTags = array_filter($allTags, fn($t) => $t !== '');

            // Sync tags
            if (!empty($allTags)) {
                foreach ($allTags as $tagName) {
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
     * Get a featured recipe — rotates daily from top-rated recipes with images.
     * Uses the day of year as a seed for deterministic daily rotation.
     */
    public function getFeatured(): ?array {
        // Get top candidates: rated recipes with images, or recent with images
        $stmt = $this->db->prepare('
            SELECT r.id, r.title, r.description, r.image_path, r.prep_time, r.cook_time, r.servings,
                   COALESCE(ROUND(AVG(rt.score), 1), 0) AS avg_rating
            FROM recipes r
            LEFT JOIN ratings rt ON rt.recipe_id = r.id
            WHERE r.image_path IS NOT NULL AND r.image_path != ""
            GROUP BY r.id
            ORDER BY avg_rating DESC, r.created_at DESC
            LIMIT 10
        ');
        $stmt->execute();
        $candidates = $stmt->fetchAll();

        if (empty($candidates)) {
            return null;
        }

        // Pick one deterministically based on the day
        $dayOfYear = (int) date('z');
        $index = $dayOfYear % count($candidates);
        return $candidates[$index];
    }

    /**
     * Get related recipes by shared tags and ingredient overlap.
     * Scoring: (shared_tags * 3) + shared_ingredients
     */
    public function getRelated(int $recipeId, int $limit = 6): array {
        $stmt = $this->db->prepare('
            SELECT r.id, r.title, r.image_path, r.prep_time, r.cook_time, r.servings,
                   COALESCE(tag_score.shared_tags, 0) AS shared_tags,
                   COALESCE(ing_score.shared_ingredients, 0) AS shared_ingredients,
                   (COALESCE(tag_score.shared_tags, 0) * 3 + COALESCE(ing_score.shared_ingredients, 0)) AS relevance,
                   (SELECT ROUND(AVG(score), 1) FROM ratings WHERE recipe_id = r.id) AS avg_rating
            FROM recipes r
            LEFT JOIN (
                SELECT rt2.recipe_id, COUNT(rt2.tag_id) AS shared_tags
                FROM recipe_tags rt2
                WHERE rt2.tag_id IN (SELECT tag_id FROM recipe_tags WHERE recipe_id = ?)
                GROUP BY rt2.recipe_id
            ) tag_score ON tag_score.recipe_id = r.id
            LEFT JOIN (
                SELECT i2.recipe_id, COUNT(DISTINCT LOWER(i2.name)) AS shared_ingredients
                FROM ingredients i2
                WHERE LOWER(i2.name) IN (SELECT DISTINCT LOWER(name) FROM ingredients WHERE recipe_id = ?)
                GROUP BY i2.recipe_id
            ) ing_score ON ing_score.recipe_id = r.id
            WHERE r.id != ?
            AND (COALESCE(tag_score.shared_tags, 0) > 0 OR COALESCE(ing_score.shared_ingredients, 0) > 0)
            ORDER BY relevance DESC, r.created_at DESC
            LIMIT ?
        ');
        $stmt->execute([$recipeId, $recipeId, $recipeId, $limit]);
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

    /**
     * Find recipes by matching ingredient names.
     * Returns recipes ranked by how many of the provided ingredients match.
     */
    public function findByIngredients(array $ingredients, int $limit = 20): array {
        $ingredients = array_filter(array_map('trim', $ingredients), fn($s) => strlen($s) >= 2);
        if (empty($ingredients)) return [];

        // Build CASE expressions for each search ingredient
        $cases = [];
        $params = [];
        foreach ($ingredients as $ing) {
            $cases[] = "MAX(CASE WHEN i.name LIKE ? THEN 1 ELSE 0 END)";
            $params[] = '%' . $ing . '%';
        }
        $matchExpr = implode(' + ', $cases);

        // Pantry staples excluded from total count (everyone has these)
        $staples = ['salt', 'pepper', 'black pepper', 'water', 'oil', 'olive oil',
                     'vegetable oil', 'cooking spray', 'butter', 'sugar', 'flour',
                     'kosher salt', 'sea salt', 'cooking oil', 'nonstick spray'];
        $staplePlaceholders = implode(',', array_fill(0, count($staples), '?'));

        $userId = $_SESSION['user_id'] ?? null;

        $sql = "
            SELECT r.id, r.title, r.description, r.image_path,
                   r.prep_time, r.cook_time, r.servings,
                   ($matchExpr) AS matched,
                   COUNT(i.id) AS total_ingredients,
                   (SELECT COUNT(*) FROM ingredients i2
                    WHERE i2.recipe_id = r.id
                    AND LOWER(i2.name) NOT IN ($staplePlaceholders)
                   ) AS countable_ingredients
            FROM recipes r
            JOIN ingredients i ON i.recipe_id = r.id
            GROUP BY r.id
            HAVING matched > 0
            ORDER BY matched DESC,
                     (matched / GREATEST(countable_ingredients, 1)) DESC
            LIMIT ?
        ";

        $allParams = array_merge($params, $staples, [$limit]);
        $stmt = $this->db->prepare($sql);
        $stmt->execute($allParams);
        $recipes = $stmt->fetchAll();

        // Attach tags and favorites (batch)
        if (!empty($recipes)) {
            $ids = array_column($recipes, 'id');
            $placeholders = implode(',', array_fill(0, count($ids), '?'));

            $tagSql = "SELECT rt.recipe_id, t.name AS tag_name FROM recipe_tags rt
                       INNER JOIN tags t ON rt.tag_id = t.id
                       WHERE rt.recipe_id IN ($placeholders)";
            $tagStmt = $this->db->prepare($tagSql);
            $tagStmt->execute($ids);
            $tagMap = [];
            foreach ($tagStmt->fetchAll() as $row) {
                $tagMap[$row['recipe_id']][] = ['name' => $row['tag_name']];
            }

            if ($userId) {
                $favSql = "SELECT recipe_id FROM favorites WHERE user_id = ? AND recipe_id IN ($placeholders)";
                $favStmt = $this->db->prepare($favSql);
                $favStmt->execute(array_merge([$userId], $ids));
                $favSet = array_flip(array_column($favStmt->fetchAll(), 'recipe_id'));
            }

            foreach ($recipes as &$recipe) {
                $recipe['tags'] = $tagMap[$recipe['id']] ?? [];
                $recipe['is_favorited'] = isset($favSet[$recipe['id']]);
                $recipe['matched'] = (int) $recipe['matched'];
                $recipe['total_ingredients'] = (int) $recipe['total_ingredients'];
                $recipe['countable_ingredients'] = (int) $recipe['countable_ingredients'];
            }
            unset($recipe);
        }

        return $recipes;
    }

    /**
     * Export all recipes with ingredients and tags for data portability.
     * Returns a clean array suitable for JSON export.
     */
    public function exportAll(): array {
        $stmt = $this->db->query('
            SELECT r.id, r.title, r.description, r.prep_time, r.cook_time, r.servings,
                   r.source_url, r.image_path, r.instructions,
                   r.calories, r.protein, r.carbs, r.fat, r.fiber, r.sugar,
                   r.created_at, r.updated_at
            FROM recipes r
            ORDER BY r.id ASC
        ');
        $recipes = $stmt->fetchAll();

        // Batch-fetch all ingredients and tags
        $allIngredients = [];
        $ingStmt = $this->db->query('SELECT recipe_id, name, amount, unit, sort_order FROM ingredients ORDER BY recipe_id, sort_order');
        foreach ($ingStmt->fetchAll() as $ing) {
            $allIngredients[$ing['recipe_id']][] = [
                'name' => $ing['name'],
                'amount' => $ing['amount'],
                'unit' => $ing['unit'],
                'sort_order' => (int) $ing['sort_order'],
            ];
        }

        $allTags = [];
        $tagStmt = $this->db->query('
            SELECT rt.recipe_id, t.name
            FROM recipe_tags rt
            INNER JOIN tags t ON rt.tag_id = t.id
            ORDER BY rt.recipe_id, t.name
        ');
        foreach ($tagStmt->fetchAll() as $tag) {
            $allTags[$tag['recipe_id']][] = $tag['name'];
        }

        // Assemble export data
        foreach ($recipes as &$recipe) {
            $id = $recipe['id'];
            if (is_string($recipe['instructions'])) {
                $recipe['instructions'] = json_decode($recipe['instructions'], true);
            }
            $recipe['ingredients'] = $allIngredients[$id] ?? [];
            $recipe['tags'] = $allTags[$id] ?? [];
            // Cast numeric fields
            foreach (['prep_time', 'cook_time', 'servings', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar'] as $field) {
                $recipe[$field] = $recipe[$field] !== null ? (int) $recipe[$field] : null;
            }
            $recipe['id'] = (int) $recipe['id'];
            unset($recipe['image_path']); // Internal path, not useful for export
        }

        return $recipes;
    }

    /**
     * Get recipes the user owns but has never cooked.
     */
    public function getUncooked(int $userId, int $limit = 3): array {
        $stmt = $this->db->prepare('
            SELECT r.id, r.title, r.image_path, r.prep_time, r.cook_time
            FROM recipes r
            LEFT JOIN cook_log cl ON cl.recipe_id = r.id AND cl.user_id = ?
            WHERE r.created_by = ?
              AND cl.id IS NULL
            ORDER BY RAND()
            LIMIT ?
        ');
        $stmt->execute([$userId, $userId, $limit]);
        return $stmt->fetchAll();
    }
}
