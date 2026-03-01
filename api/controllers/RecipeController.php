<?php

require_once __DIR__ . '/../models/Recipe.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../services/ImageProcessor.php';

class RecipeController {

    /**
     * GET /recipes
     * Query params: page, per_page, search, tag
     */
    public function list(): array {
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $perPage = max(1, min(100, (int) ($_GET['per_page'] ?? RECIPES_PER_PAGE)));
        $search = $_GET['search'] ?? null;
        $tag = $_GET['tag'] ?? null;

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

        if (empty($data['title'])) {
            http_response_code(400);
            return ['error' => 'Recipe title is required', 'code' => 400];
        }

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
        } elseif (!empty($data['source_image_url'])) {
            // Download image from URL (e.g., from imported recipe)
            $imageProcessor = new ImageProcessor();
            $imagePath = $imageProcessor->processFromUrl($data['source_image_url'], $recipe['id']);
            if ($imagePath) {
                $recipe = $recipeModel->update($recipe['id'], ['image_path' => $imagePath]);
            }
        }

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

        if (empty($input['url'])) {
            http_response_code(400);
            return ['error' => 'URL is required', 'code' => 400];
        }

        require_once __DIR__ . '/../services/RecipeScraper.php';
        $scraper = new RecipeScraper();
        $result = $scraper->scrape($input['url']);

        return $result;
    }
}
