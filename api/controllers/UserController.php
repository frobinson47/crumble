<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../middleware/Auth.php';

class UserController {

    /**
     * GET /users
     * Admin only. Returns all users (no password hashes).
     */
    public function list(): array {
        Auth::requireAdmin();
        $userModel = new User();
        return $userModel->getAll();
    }

    /**
     * POST /users
     * Admin only. Create a new user. Expects JSON: { username, password, role? }
     */
    public function create(): array {
        Auth::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['username']) || empty($input['password'])) {
            http_response_code(400);
            return ['error' => 'Username and password are required', 'code' => 400];
        }

        $role = $input['role'] ?? 'member';
        if (!in_array($role, ['admin', 'member'])) {
            http_response_code(400);
            return ['error' => 'Role must be admin or member', 'code' => 400];
        }

        $userModel = new User();

        // Check if username already exists
        $existing = $userModel->findByUsername($input['username']);
        if ($existing) {
            http_response_code(409);
            return ['error' => 'Username already exists', 'code' => 409];
        }

        $user = $userModel->create($input['username'], $input['password'], $role);
        http_response_code(201);
        return $user;
    }

    /**
     * PUT /users/{id}/password
     * Admin only. Reset a user's password. Expects JSON: { password }
     */
    public function resetPassword(int $id): array {
        Auth::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['password'])) {
            http_response_code(400);
            return ['error' => 'New password is required', 'code' => 400];
        }

        $userModel = new User();
        $user = $userModel->findById($id);

        if (!$user) {
            http_response_code(404);
            return ['error' => 'User not found', 'code' => 404];
        }

        $userModel->resetPassword($id, $input['password']);
        return ['message' => 'Password reset successfully'];
    }
}
