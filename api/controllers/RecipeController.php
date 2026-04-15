<?php

require_once __DIR__ . '/../models/Recipe.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../services/ImageProcessor.php';
require_once __DIR__ . '/../services/ValidationHelper.php';
require_once __DIR__ . '/../services/LoggerService.php';

class RecipeController {

    /**
     * GET /recipes
     * Query params: page, per_page, search, tag
     */
    public function list(): array {
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $perPage = max(1, min(100, (int) ($_GET['per_page'] ?? RECIPES_PER_PAGE)));
        $search = ValidationHelper::sanitize($_GET['search'] ?? null, 200);
        $tag = ValidationHelper::sanitize($_GET['tag'] ?? null, 100);

        $recipeModel = new Recipe();
        return $recipeModel->getAll($page, $perPage, $search, $tag);
    }

    /**
     * GET /recipes/{id}
     */
    public function get(int $id): array {
        $recipeModel = new Recipe();
        $recipe = $recipeModel->findById($id);

        if (!$recipe) {
            http_response_code(404);
            return ['error' => 'Recipe not found', 'code' => 404];
        }

        return $recipe;
    }

    /**
     * POST /recipes
     * Expects JSON body or multipart form data (when image is attached).
     */
    public function create(): array {
        $userId = Auth::requireAuth();

        // Handle multipart (with image) or JSON
        if (!empty($_FILES['image'])) {
            // Frontend may send all recipe data as a single JSON blob in $_POST['data']
            if (isset($_POST['data'])) {
                $data = json_decode($_POST['data'], true) ?: [];
            } else {
                $data = $_POST;
                // Decode JSON fields that come as strings in multipart
                if (isset($data['ingredients']) && is_string($data['ingredients'])) {
                    $data['ingredients'] = json_decode($data['ingredients'], true);
                }
                if (isset($data['instructions']) && is_string($data['instructions'])) {
                    $data['instructions'] = json_decode($data['instructions'], true);
                }
                if (isset($data['tags']) && is_string($data['tags'])) {
                    $data['tags'] = json_decode($data['tags'], true);
                }
            }
        } else {
            $data = json_decode(file_get_contents('php://input'), true);
        }

        $v = new ValidationHelper();
        $v->required($data['title'] ?? null, 'title')
          ->maxLength($data['title'] ?? null, 'title', 500)
          ->maxLength($data['description'] ?? null, 'description', 5000)
          ->isArray($data['ingredients'] ?? null, 'ingredients')
          ->maxCount($data['ingredients'] ?? [], 'ingredients', 200)
          ->isArray($data['instructions'] ?? null, 'instructions')
          ->maxCount($data['instructions'] ?? [], 'instructions', 200)
          ->isArray($data['tags'] ?? null, 'tags')
          ->maxCount($data['tags'] ?? [], 'tags', 50);

        if ($data['source_url'] ?? null) {
            $v->url($data['source_url'], 'source_url')->maxLength($data['source_url'], 'source_url', 2000);
        }

        $response = $v->responseIfFailed();
        if ($response) return $response;

        $data['title'] = ValidationHelper::sanitize($data['title'], 500);
        $data['description'] = ValidationHelper::sanitize($data['description'] ?? null, 5000);

        if (empty($data['instructions'])) {
            $data['instructions'] = [];
        }

        $recipeModel = new Recipe();
        $recipe = $recipeModel->create($data, $userId);

        // Handle image upload after recipe is created (need the recipe ID)
        if (!empty($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $imageProcessor = new ImageProcessor();
            $imagePath = $imageProcessor->process($_FILES['image'], $recipe['id']);
            if ($imagePath) {
                $recipe = $recipeModel->update($recipe['id'], ['image_path' => $imagePath]);
            }
        } elseif (!empty($data['_image_token']) && !empty($_SESSION['mealie_images'][$data['_image_token']])) {
            // Process image from Mealie/Paprika import temp file
            $tmpFile = $_SESSION['mealie_images'][$data['_image_token']];
            if (file_exists($tmpFile)) {
                $imageProcessor = new ImageProcessor();
                $fakeFile = [
                    'tmp_name' => $tmpFile,
                    'error' => UPLOAD_ERR_OK,
                    'size' => filesize($tmpFile),
                ];
                $imagePath = $imageProcessor->process($fakeFile, $recipe['id']);
                @unlink($tmpFile);
                if ($imagePath) {
                    $recipe = $recipeModel->update($recipe['id'], ['image_path' => $imagePath]);
                }
            }
            unset($_SESSION['mealie_images'][$data['_image_token']]);
        } elseif (!empty($data['source_image_url'])) {
            // Download image from URL (e.g., from imported recipe)
            $imageProcessor = new ImageProcessor();
            $imagePath = $imageProcessor->processFromUrl($data['source_image_url'], $recipe['id']);
            if ($imagePath) {
                $recipe = $recipeModel->update($recipe['id'], ['image_path' => $imagePath]);
            }
        }

        LoggerService::channel('recipe')->info('Recipe created', ['recipe_id' => $recipe['id'], 'user_id' => $userId, 'title' => $recipe['title']]);
        http_response_code(201);
        return $recipe;
    }

    /**
     * Create a recipe from pre-parsed data (used by Cooklang import).
     */
    public function createFromData(array $data): array {
        $userId = Auth::requireAuth();

        if (empty($data['title'])) {
            http_response_code(400);
            return ['error' => 'Recipe title is required', 'code' => 400];
        }

        $recipeModel = new Recipe();
        $recipe = $recipeModel->create($data, $userId);

        http_response_code(201);
        return $recipe;
    }

    /**
     * PUT /recipes/{id}
     * Expects JSON body or multipart form data.
     */
    public function update(int $id): array {
        $userId = Auth::requireAuth();

        $recipeModel = new Recipe();
        $existing = $recipeModel->findById($id);

        if (!$existing) {
            http_response_code(404);
            return ['error' => 'Recipe not found', 'code' => 404];
        }

        // Must be creator or admin
        if (!$recipeModel->isCreator($id, $userId) && ($_SESSION['role'] ?? '') !== 'admin') {
            http_response_code(403);
            return ['error' => 'You do not have permission to edit this recipe', 'code' => 403];
        }

        // Handle multipart or JSON
        if (!empty($_FILES['image'])) {
            // Frontend may send all recipe data as a single JSON blob in $_POST['data']
            if (isset($_POST['data'])) {
                $data = json_decode($_POST['data'], true) ?: [];
            } else {
                $data = $_POST;
                if (isset($data['ingredients']) && is_string($data['ingredients'])) {
                    $data['ingredients'] = json_decode($data['ingredients'], true);
                }
                if (isset($data['instructions']) && is_string($data['instructions'])) {
                    $data['instructions'] = json_decode($data['instructions'], true);
                }
                if (isset($data['tags']) && is_string($data['tags'])) {
                    $data['tags'] = json_decode($data['tags'], true);
                }
            }
        } else {
            $data = json_decode(file_get_contents('php://input'), true);
        }

        // Handle image upload
        if (!empty($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $imageProcessor = new ImageProcessor();
            $imagePath = $imageProcessor->process($_FILES['image'], $id);
            if ($imagePath) {
                $data['image_path'] = $imagePath;
            }
        }

        $recipe = $recipeModel->update($id, $data);
        return $recipe;
    }

    /**
     * DELETE /recipes/{id}
     */
    public function delete(int $id): array {
        $userId = Auth::requireAuth();

        $recipeModel = new Recipe();
        $existing = $recipeModel->findById($id);

        if (!$existing) {
            http_response_code(404);
            return ['error' => 'Recipe not found', 'code' => 404];
        }

        // Must be creator or admin
        if (!$recipeModel->isCreator($id, $userId) && ($_SESSION['role'] ?? '') !== 'admin') {
            http_response_code(403);
            return ['error' => 'You do not have permission to delete this recipe', 'code' => 403];
        }

        $recipeModel->delete($id);
        LoggerService::channel('recipe')->info('Recipe deleted', ['recipe_id' => $id, 'user_id' => $userId]);
        return ['message' => 'Recipe deleted successfully'];
    }

    /**
     * POST /recipes/import
     * Expects JSON: { url }
     * Returns parsed recipe data for preview (does NOT save).
     */
    public function import(): array {
        Auth::requireAuth();

        $input = json_decode(file_get_contents('php://input'), true);

        $v = new ValidationHelper();
        $v->required($input['url'] ?? null, 'url')
          ->url($input['url'] ?? null, 'url')
          ->maxLength($input['url'] ?? null, 'url', 2000);
        $response = $v->responseIfFailed();
        if ($response) return $response;

        require_once __DIR__ . '/../services/RecipeScraper.php';
        $scraper = new RecipeScraper();
        $result = $scraper->scrape($input['url']);

        return $result;
    }

    /**
     * POST /recipes/import-batch
     * Expects JSON: { urls: string[] }
     * Scrapes each URL and returns array of results.
     */
    public function importBatch(): array {
        Auth::requireAuth();

        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['urls']) || !is_array($input['urls'])) {
            http_response_code(400);
            return ['error' => 'An array of URLs is required', 'code' => 400];
        }

        $urls = array_filter(array_map('trim', $input['urls']), fn($u) => $u !== '');

        if (count($urls) === 0) {
            http_response_code(400);
            return ['error' => 'At least one URL is required', 'code' => 400];
        }

        if (count($urls) > 50) {
            http_response_code(400);
            return ['error' => 'Maximum 50 URLs per batch', 'code' => 400];
        }

        require_once __DIR__ . '/../services/RecipeScraper.php';
        $scraper = new RecipeScraper();

        $results = [];
        foreach ($urls as $url) {
            $result = $scraper->scrape($url);
            if (!empty($result['error'])) {
                $results[] = [
                    'url' => $url,
                    'status' => 'error',
                    'error_code' => $result['error_code'] ?? 'parse_failed',
                    'error_message' => $result['error'] ?? $result['error_message'] ?? 'Unknown error',
                ];
            } else {
                $results[] = [
                    'url' => $url,
                    'status' => 'success',
                    'recipe' => $result,
                ];
            }
        }

        return ['results' => $results];
    }

    /**
     * POST /recipes/import-mealie
     * Accepts multipart upload of a Mealie export .zip file.
     */
    public function importMealie(): array {
        Auth::requireAuth();

        if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            return ['error' => 'A .zip file is required', 'code' => 400];
        }

        require_once __DIR__ . '/../services/MealieImporter.php';
        $importer = new MealieImporter();
        return $importer->import($_FILES['file']['tmp_name']);
    }

    /**
     * POST /recipes/import-paprika
     * Accepts multipart upload of a .paprikarecipes file.
     */
    public function importPaprika(): array {
        Auth::requireAuth();

        if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            return ['error' => 'A .paprikarecipes file is required', 'code' => 400];
        }

        require_once __DIR__ . '/../services/PaprikaImporter.php';
        $importer = new PaprikaImporter();
        return $importer->import($_FILES['file']['tmp_name']);
    }

    /**
     * POST /recipes/import-tandoor
     * Accepts multipart upload of a Tandoor JSON-LD export .zip file.
     */
    public function importTandoor(): array {
        Auth::requireAuth();

        if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            return ['error' => 'A .zip file is required', 'code' => 400];
        }

        require_once __DIR__ . '/../services/TandoorImporter.php';
        $importer = new TandoorImporter();
        return $importer->import($_FILES['file']['tmp_name']);
    }

    /**
     * GET /recipes/featured
     */
    public function featured(): array {
        $model = new Recipe();
        $recipe = $model->getFeatured();
        if (!$recipe) {
            return ['recipe' => null];
        }
        return ['recipe' => $recipe];
    }

    /**
     * GET /recipes/export
     * Export all recipes as JSON for data portability.
     */
    /**
     * GET /recipes/by-ingredients?ingredients=chicken,rice,garlic
     */
    /**
     * GET /recipes/uncooked
     * Recipes the user owns but has never cooked.
     */
    public function uncooked(): array {
        $userId = Auth::requireAuth();
        $model = new Recipe();
        return ['recipes' => $model->getUncooked($userId)];
    }

    public function byIngredients(): array {
        Auth::requireAuth();
        $raw = ValidationHelper::sanitize($_GET['ingredients'] ?? '', 2000);
        $ingredients = array_filter(array_map('trim', explode(',', $raw)));
        if (empty($ingredients)) {
            http_response_code(400);
            return ['error' => 'Provide at least one ingredient (comma-separated)'];
        }
        if (count($ingredients) > 50) {
            http_response_code(400);
            return ['error' => 'Maximum 50 ingredients allowed', 'code' => 400];
        }
        $model = new Recipe();
        return ['recipes' => $model->findByIngredients($ingredients)];
    }

    public function export(): array {
        Auth::requireAuth();
        $model = new Recipe();
        $recipes = $model->exportAll();
        return [
            'version' => '1.0',
            'exported_at' => date('c'),
            'recipe_count' => count($recipes),
            'recipes' => $recipes,
        ];
    }

    /**
     * GET /recipes/export-zip
     * Download all recipes as a ZIP file including images and personal data.
     */
    public function exportZip(): void {
        $userId = Auth::requireAuth();
        $model = new Recipe();
        $recipes = $model->exportAll();

        // Get personal data: cook log, ratings, favorites
        require_once __DIR__ . '/../models/CookLog.php';
        $cookLog = new CookLog();
        $cookHistory = $cookLog->getByUser($userId, 10000);

        $ratingStmt = Database::getInstance()->prepare('
            SELECT recipe_id, score FROM ratings WHERE user_id = ?
        ');
        $ratingStmt->execute([$userId]);
        $ratings = $ratingStmt->fetchAll();

        $favStmt = Database::getInstance()->prepare('
            SELECT recipe_id FROM favorites WHERE user_id = ?
        ');
        $favStmt->execute([$userId]);
        $favoriteIds = $favStmt->fetchAll(\PDO::FETCH_COLUMN);

        // Build ZIP in memory
        $tmpFile = tempnam(sys_get_temp_dir(), 'cookslate_export_');
        $zip = new \ZipArchive();
        if ($zip->open($tmpFile, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            http_response_code(500);
            echo json_encode(['error' => 'Could not create export file']);
            return;
        }

        // Add each recipe as individual JSON
        foreach ($recipes as $recipe) {
            $filename = 'recipes/' . $recipe['id'] . '_' . preg_replace('/[^a-z0-9]+/i', '-', $recipe['title']) . '.json';
            $zip->addFromString($filename, json_encode($recipe, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }

        // Add images
        $uploadDir = rtrim(UPLOAD_DIR, '/');
        foreach ($recipes as $recipe) {
            $imgDir = $uploadDir . '/recipes/' . $recipe['id'];
            if (is_dir($imgDir)) {
                foreach (['full.jpg', 'thumb.jpg'] as $imgFile) {
                    $imgPath = $imgDir . '/' . $imgFile;
                    if (file_exists($imgPath)) {
                        $zip->addFile($imgPath, 'images/' . $recipe['id'] . '/' . $imgFile);
                    }
                }
            }
        }

        // Add personal metadata
        $metadata = [
            'version' => '1.0',
            'exported_at' => date('c'),
            'recipe_count' => count($recipes),
            'cook_history' => array_map(fn($e) => [
                'recipe_id' => (int) $e['recipe_id'],
                'recipe_title' => $e['title'],
                'cooked_at' => $e['cooked_at'],
                'notes' => $e['notes'],
            ], $cookHistory),
            'ratings' => array_map(fn($r) => [
                'recipe_id' => (int) $r['recipe_id'],
                'rating' => (int) $r['score'],
            ], $ratings),
            'favorites' => array_map('intval', $favoriteIds),
        ];
        $zip->addFromString('metadata.json', json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        // Add README
        $readme = "# Cookslate Recipe Export\n\n";
        $readme .= "Exported: " . date('Y-m-d H:i:s') . "\n";
        $readme .= "Recipes: " . count($recipes) . "\n\n";
        $readme .= "## Contents\n\n";
        $readme .= "- `recipes/` — Individual recipe JSON files (schema.org compatible)\n";
        $readme .= "- `images/` — Recipe photos (full + thumbnail)\n";
        $readme .= "- `metadata.json` — Cook history, ratings, and favorites\n";
        $readme .= "- `README.md` — This file\n\n";
        $readme .= "Each recipe JSON includes: title, description, ingredients,\n";
        $readme .= "instructions, prep/cook times, servings, nutrition, tags,\n";
        $readme .= "and source URL.\n";
        $zip->addFromString('README.md', $readme);

        $zip->close();

        // Stream the file
        $filesize = filesize($tmpFile);
        $date = date('Y-m-d');
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="cookslate-export-' . $date . '.zip"');
        header('Content-Length: ' . $filesize);
        header('Cache-Control: no-cache, no-store, must-revalidate');
        readfile($tmpFile);
        unlink($tmpFile);
        exit;
    }

    /**
     * GET /recipes/{id}/related
     */
    public function related(int $id): array {
        $model = new Recipe();
        return ['recipes' => $model->getRelated($id)];
    }
}
