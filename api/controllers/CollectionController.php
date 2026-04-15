<?php

require_once __DIR__ . '/../models/Collection.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../services/ValidationHelper.php';

class CollectionController {

    /**
     * GET /collections
     * All collections for the current user.
     */
    public function list(): array {
        $userId = Auth::requireAuth();
        $model = new Collection();
        return $model->getAllForUser($userId);
    }

    /**
     * GET /collections/{id}
     * Single collection with its recipes.
     */
    public function get(int $id): array {
        $userId = Auth::requireAuth();
        $model = new Collection();

        if (!$model->isOwner($id, $userId)) {
            http_response_code(403);
            return ['error' => 'Access denied', 'code' => 403];
        }

        $collection = $model->findById($id);
        if (!$collection) {
            http_response_code(404);
            return ['error' => 'Collection not found', 'code' => 404];
        }

        $collection['recipes'] = $model->getRecipes($id);
        return $collection;
    }

    /**
     * POST /collections
     * Create a new collection. Expects JSON: { name, description? }
     */
    public function create(): array {
        $userId = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true);

        $v = new ValidationHelper();
        $v->required($input['name'] ?? null, 'name')
          ->maxLength($input['name'] ?? null, 'name', 255)
          ->maxLength($input['description'] ?? null, 'description', 1000);
        $response = $v->responseIfFailed();
        if ($response) return $response;

        $model = new Collection();
        $collection = $model->create(
            ValidationHelper::sanitize($input['name'], 255),
            $userId,
            ValidationHelper::sanitize($input['description'] ?? null, 1000)
        );
        http_response_code(201);
        return $collection;
    }

    /**
     * PUT /collections/{id}
     * Update a collection. Expects JSON: { name, description? }
     */
    public function update(int $id): array {
        $userId = Auth::requireAuth();
        $model = new Collection();

        if (!$model->isOwner($id, $userId)) {
            http_response_code(403);
            return ['error' => 'Access denied', 'code' => 403];
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $v = new ValidationHelper();
        $v->required($input['name'] ?? null, 'name')
          ->maxLength($input['name'] ?? null, 'name', 255)
          ->maxLength($input['description'] ?? null, 'description', 1000);
        $response = $v->responseIfFailed();
        if ($response) return $response;

        return $model->update(
            $id,
            ValidationHelper::sanitize($input['name'], 255),
            ValidationHelper::sanitize($input['description'] ?? null, 1000)
        );
    }

    /**
     * DELETE /collections/{id}
     */
    public function delete(int $id): array {
        $userId = Auth::requireAuth();
        $model = new Collection();

        if (!$model->isOwner($id, $userId)) {
            http_response_code(403);
            return ['error' => 'Access denied', 'code' => 403];
        }

        $model->delete($id);
        return ['message' => 'Collection deleted successfully'];
    }

    /**
     * POST /collections/{id}/recipes/{recipeId}
     * Add a recipe to a collection.
     */
    public function addRecipe(int $id, int $recipeId): array {
        $userId = Auth::requireAuth();
        $model = new Collection();

        if (!$model->isOwner($id, $userId)) {
            http_response_code(403);
            return ['error' => 'Access denied', 'code' => 403];
        }

        $model->addRecipe($id, $recipeId);
        http_response_code(201);
        return ['message' => 'Recipe added to collection'];
    }

    /**
     * DELETE /collections/{id}/recipes/{recipeId}
     * Remove a recipe from a collection.
     */
    public function removeRecipe(int $id, int $recipeId): array {
        $userId = Auth::requireAuth();
        $model = new Collection();

        if (!$model->isOwner($id, $userId)) {
            http_response_code(403);
            return ['error' => 'Access denied', 'code' => 403];
        }

        $model->removeRecipe($id, $recipeId);
        return ['message' => 'Recipe removed from collection'];
    }
}
