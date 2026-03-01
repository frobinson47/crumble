<?php

require_once __DIR__ . '/../models/GroceryList.php';
require_once __DIR__ . '/../models/GroceryItem.php';
require_once __DIR__ . '/../middleware/Auth.php';

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

        if (empty($input['name'])) {
            http_response_code(400);
            return ['error' => 'List name is required', 'code' => 400];
        }

        $listModel = new GroceryList();
        $list = $listModel->create($input['name'], $userId);
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
        $list['items'] = $itemModel->getAllForList($id);

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
     */
    public function addItem(int $listId): array {
        $userId = Auth::requireAuth();
        $listModel = new GroceryList();

        if (!$listModel->isOwner($listId, $userId)) {
            http_response_code(403);
            return ['error' => 'Access denied', 'code' => 403];
        }

        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['name'])) {
            http_response_code(400);
            return ['error' => 'Item name is required', 'code' => 400];
        }

        $itemModel = new GroceryItem();
        $item = $itemModel->create(
            $listId,
            $input['name'],
            $input['amount'] ?? null,
            $input['unit'] ?? null
        );

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
        $items = $itemModel->addFromRecipe($listId, $recipeId);

        return ['items' => $items];
    }
}
