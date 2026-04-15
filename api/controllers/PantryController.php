<?php
// api/controllers/PantryController.php

require_once __DIR__ . '/../models/Pantry.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../services/ValidationHelper.php';

class PantryController {

    /**
     * GET /pantry
     * List all pantry items for the current user.
     */
    public function list(): array {
        $userId = Auth::requireAuth();
        $pantry = new Pantry();
        return ['items' => $pantry->getAllForUser($userId)];
    }

    /**
     * POST /pantry
     * Add an item to the pantry. Expects JSON: { ingredient_name }
     */
    public function add(): array {
        $userId = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true);

        $v = new ValidationHelper();
        $v->required($input['ingredient_name'] ?? null, 'ingredient_name')
          ->maxLength($input['ingredient_name'] ?? null, 'ingredient_name', 255);
        $response = $v->responseIfFailed();
        if ($response) return $response;

        $pantry = new Pantry();
        $item = $pantry->add($userId, ValidationHelper::sanitize($input['ingredient_name'], 255));

        http_response_code(201);
        return $item;
    }

    /**
     * DELETE /pantry/{id}
     * Remove an item from the pantry.
     */
    public function remove(int $id): array {
        $userId = Auth::requireAuth();
        $pantry = new Pantry();

        if (!$pantry->remove($id, $userId)) {
            http_response_code(404);
            return ['error' => 'Pantry item not found', 'code' => 404];
        }

        return ['message' => 'Removed from pantry'];
    }
}
