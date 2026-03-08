<?php

require_once __DIR__ . '/../models/MealPlan.php';
require_once __DIR__ . '/../middleware/Auth.php';

class MealPlanController {

    /**
     * GET /meal-plan
     * Query params: week (date string, defaults to today)
     */
    public function getWeekPlan(): array {
        $userId = Auth::requireAuth();
        $week = $_GET['week'] ?? date('Y-m-d');

        $model = new MealPlan();
        return $model->getByWeek($userId, $week);
    }

    /**
     * POST /meal-plan/items
     * Expects JSON: { recipe_id, day_of_week, week_start }
     */
    public function addItem(): array {
        $userId = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['recipe_id']) || !isset($input['day_of_week']) || empty($input['week_start'])) {
            http_response_code(400);
            return ['error' => 'recipe_id, day_of_week, and week_start are required', 'code' => 400];
        }

        $recipeId = (int) $input['recipe_id'];
        $dayOfWeek = (int) $input['day_of_week'];
        $weekStart = $input['week_start'];

        if ($dayOfWeek < 0 || $dayOfWeek > 6) {
            http_response_code(400);
            return ['error' => 'day_of_week must be 0-6', 'code' => 400];
        }

        // Get or create the plan for this week
        $model = new MealPlan();
        $plan = $model->getByWeek($userId, $weekStart);
        $planId = $plan['id'];

        $item = $model->addItem($planId, $recipeId, $dayOfWeek, $userId);

        if ($item === null) {
            http_response_code(404);
            return ['error' => 'Plan not found or access denied', 'code' => 404];
        }

        http_response_code(201);
        return $item;
    }

    /**
     * PUT /meal-plan/items/{id}
     * Expects JSON with any of: { day_of_week, sort_order, servings_override }
     */
    public function updateItem(int $itemId): array {
        $userId = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true);

        $model = new MealPlan();
        $success = $model->updateItem($itemId, $input ?? [], $userId);

        if (!$success) {
            http_response_code(404);
            return ['error' => 'Item not found or access denied', 'code' => 404];
        }

        return ['message' => 'Item updated successfully'];
    }

    /**
     * DELETE /meal-plan/items/{id}
     */
    public function removeItem(int $itemId): array {
        $userId = Auth::requireAuth();

        $model = new MealPlan();
        $success = $model->removeItem($itemId, $userId);

        if (!$success) {
            http_response_code(404);
            return ['error' => 'Item not found or access denied', 'code' => 404];
        }

        return ['message' => 'Item removed successfully'];
    }

    /**
     * POST /meal-plan/grocery
     * Expects JSON: { week_start, list_name? }
     */
    public function generateGrocery(): array {
        $userId = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['week_start'])) {
            http_response_code(400);
            return ['error' => 'week_start is required', 'code' => 400];
        }

        $weekStart = $input['week_start'];

        // Validate and default list_name
        $listName = isset($input['list_name']) ? trim($input['list_name']) : '';
        if ($listName === '') {
            $mondayDate = date('M j', strtotime('monday this week', strtotime($weekStart)));
            $sundayDate = date('M j, Y', strtotime('sunday this week', strtotime($weekStart)));
            $listName = "Meal Plan - $mondayDate-$sundayDate";
        }
        if (strlen($listName) > 255) {
            $listName = substr($listName, 0, 255);
        }

        // Get/create the plan
        $model = new MealPlan();
        $plan = $model->getByWeek($userId, $weekStart);
        $planId = $plan['id'];

        $groceryListId = $model->generateGroceryList($planId, $listName, $userId);

        if ($groceryListId === null) {
            http_response_code(404);
            return ['error' => 'Plan not found or access denied', 'code' => 404];
        }

        http_response_code(201);
        return ['grocery_list_id' => $groceryListId];
    }
}
