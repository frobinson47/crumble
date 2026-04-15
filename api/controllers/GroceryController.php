<?php

require_once __DIR__ . '/../models/GroceryList.php';
require_once __DIR__ . '/../models/GroceryItem.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../services/ValidationHelper.php';
require_once __DIR__ . '/../services/LoggerService.php';

class GroceryController {

    /**
     * GET /grocery
     * All grocery lists for the current user.
     */
    public function listAll(): array {
        $userId = Auth::requireAuth();
        $listModel = new GroceryList();
        return $listModel->getAllForUser($userId);
    }

    /**
     * POST /grocery
     * Create a new grocery list. Expects JSON: { name }
     */
    public function create(): array {
        $userId = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true);

        $v = new ValidationHelper();
        $v->required($input['name'] ?? null, 'name')
          ->maxLength($input['name'] ?? null, 'name', 255);
        $response = $v->responseIfFailed();
        if ($response) return $response;

        $listModel = new GroceryList();
        $list = $listModel->create(ValidationHelper::sanitize($input['name'], 255), $userId);
        LoggerService::channel('grocery')->info('Grocery list created', ['list_id' => $list['id'], 'user_id' => $userId]);
        http_response_code(201);
        return $list;
    }

    /**
     * GET /grocery/{id}
     * Single grocery list with all its items.
     */
    public function get(int $id): array {
        $userId = Auth::requireAuth();
        $listModel = new GroceryList();

        if (!$listModel->isOwner($id, $userId)) {
            http_response_code(403);
            return ['error' => 'Access denied', 'code' => 403];
        }

        $list = $listModel->findById($id);
        if (!$list) {
            http_response_code(404);
            return ['error' => 'Grocery list not found', 'code' => 404];
        }

        $itemModel = new GroceryItem();
        $items = $itemModel->getAllForList($id);
        $list['items'] = $itemModel->enrichWithPackageInfo($items);

        return $list;
    }

    /**
     * DELETE /grocery/{id}
     */
    public function delete(int $id): array {
        $userId = Auth::requireAuth();
        $listModel = new GroceryList();

        if (!$listModel->isOwner($id, $userId)) {
            http_response_code(403);
            return ['error' => 'Access denied', 'code' => 403];
        }

        $listModel->delete($id);
        return ['message' => 'Grocery list deleted successfully'];
    }

    /**
     * POST /grocery/{listId}/items
     * Add a single item. Expects JSON: { name, amount?, unit? }
     * If only name is provided and it contains an amount/unit (e.g., "2 cups flour"),
     * it will be automatically parsed into structured fields.
     */
    public function addItem(int $listId): array {
        $userId = Auth::requireAuth();
        $listModel = new GroceryList();

        if (!$listModel->isOwner($listId, $userId)) {
            http_response_code(403);
            return ['error' => 'Access denied', 'code' => 403];
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $v = new ValidationHelper();
        $v->required($input['name'] ?? null, 'name')
          ->maxLength($input['name'] ?? null, 'name', 500);
        if (isset($input['amount']) && $input['amount'] !== null) {
            $v->numeric($input['amount'], 'amount')
              ->range($input['amount'], 'amount', 0, 99999);
        }
        if (isset($input['unit'])) {
            $v->maxLength($input['unit'], 'unit', 50);
        }
        $response = $v->responseIfFailed();
        if ($response) return $response;

        $name = ValidationHelper::sanitize($input['name'], 500);
        $amount = $input['amount'] ?? null;
        $unit = ValidationHelper::sanitize($input['unit'] ?? null, 50);

        // Smart parse: if no amount/unit provided, try to extract from name
        if ($amount === null && $unit === null) {
            require_once __DIR__ . '/../services/IngredientParser.php';
            $parser = new IngredientParser();
            $parsed = $parser->parse($name);
            if ($parsed['amount'] !== null && $parsed['name'] !== '') {
                $amount = $parsed['amount'];
                $unit = $parsed['unit'];
                $name = $parsed['name'];
            }
        }

        $itemModel = new GroceryItem();
        $item = $itemModel->create($listId, $name, $amount, $unit);

        http_response_code(201);
        return $item;
    }

    /**
     * PUT /grocery/{listId}/items/{itemId}
     * Update an item. Expects JSON with any of: { name, amount, unit, checked }
     */
    public function updateItem(int $listId, int $itemId): array {
        $userId = Auth::requireAuth();
        $listModel = new GroceryList();

        if (!$listModel->isOwner($listId, $userId)) {
            http_response_code(403);
            return ['error' => 'Access denied', 'code' => 403];
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $v = new ValidationHelper();
        if (isset($input['name'])) {
            $v->maxLength($input['name'], 'name', 500);
        }
        if (isset($input['amount']) && $input['amount'] !== null) {
            $v->numeric($input['amount'], 'amount');
        }
        if (isset($input['unit'])) {
            $v->maxLength($input['unit'], 'unit', 50);
        }
        $response = $v->responseIfFailed();
        if ($response) return $response;

        $itemModel = new GroceryItem();
        $item = $itemModel->findById($itemId);

        if (!$item || (int) $item['list_id'] !== $listId) {
            http_response_code(404);
            return ['error' => 'Item not found', 'code' => 404];
        }

        $updated = $itemModel->update($itemId, $input);
        return $updated;
    }

    /**
     * DELETE /grocery/{listId}/items/{itemId}
     */
    public function deleteItem(int $listId, int $itemId): array {
        $userId = Auth::requireAuth();
        $listModel = new GroceryList();

        if (!$listModel->isOwner($listId, $userId)) {
            http_response_code(403);
            return ['error' => 'Access denied', 'code' => 403];
        }

        $itemModel = new GroceryItem();
        $item = $itemModel->findById($itemId);

        if (!$item || (int) $item['list_id'] !== $listId) {
            http_response_code(404);
            return ['error' => 'Item not found', 'code' => 404];
        }

        $itemModel->delete($itemId);
        return ['message' => 'Item deleted successfully'];
    }

    /**
     * DELETE /grocery/{listId}/checked
     * Remove all checked items from a list.
     */
    public function clearChecked(int $listId): array {
        $userId = Auth::requireAuth();
        $listModel = new GroceryList();

        if (!$listModel->isOwner($listId, $userId)) {
            http_response_code(403);
            return ['error' => 'Access denied', 'code' => 403];
        }

        $itemModel = new GroceryItem();
        $removed = $itemModel->clearChecked($listId);

        return ['removed' => $removed];
    }

    /**
     * POST /grocery/{listId}/recipes/{recipeId}
     * Bulk add all ingredients from a recipe as grocery items.
     */
    public function addRecipe(int $listId, int $recipeId): array {
        $userId = Auth::requireAuth();
        $listModel = new GroceryList();

        if (!$listModel->isOwner($listId, $userId)) {
            http_response_code(403);
            return ['error' => 'Access denied', 'code' => 403];
        }

        $itemModel = new GroceryItem();
        $items = $itemModel->addFromRecipe($listId, $recipeId, $userId);

        return ['items' => $itemModel->enrichWithPackageInfo($items)];
    }
}
