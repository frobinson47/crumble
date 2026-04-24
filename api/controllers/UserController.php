<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../services/ValidationHelper.php';
require_once __DIR__ . '/../services/LoggerService.php';

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

        $v = new ValidationHelper();
        $v->required($input['username'] ?? null, 'username')
          ->minLength($input['username'] ?? null, 'username', 3)
          ->maxLength($input['username'] ?? null, 'username', 50)
          ->required($input['password'] ?? null, 'password')
          ->maxLength($input['password'] ?? null, 'password', 500)
          ->inList($input['role'] ?? 'member', 'role', ['admin', 'member']);

        if (!empty($input['email'])) {
            $v->email($input['email'], 'email')->maxLength($input['email'], 'email', 255);
        }

        $response = $v->responseIfFailed();
        if ($response) return $response;

        $role = $input['role'] ?? 'member';

        // Enforce user limit based on license tier
        require_once __DIR__ . '/../config/license.php';
        $license = License::getInstance();
        $userModel = new User();
        $currentCount = $userModel->countReal();
        $maxUsers = $license->maxUsers();

        if ($currentCount >= $maxUsers) {
            http_response_code(403);
            $tierLabel = $license->tier() === 'household' ? 'Household' : 'Pro';
            return [
                'error' => "User limit reached ({$currentCount}/{$maxUsers}). Upgrade to " .
                    ($license->tier() === 'household' ? 'add more users.' : 'Household to add up to 5 users.'),
                'code' => 403,
                'max_users' => $maxUsers,
                'current_users' => $currentCount,
            ];
        }

        require_once __DIR__ . '/../services/PasswordValidator.php';
        $validator = new PasswordValidator();
        $passwordResult = $validator->validate($input['password']);
        if (!$passwordResult['valid']) {
            http_response_code(400);
            return ['error' => implode('. ', $passwordResult['errors']), 'code' => 400];
        }

        // Check if username already exists
        $existing = $userModel->findByUsername($input['username']);
        if ($existing) {
            http_response_code(409);
            return ['error' => 'Username already exists', 'code' => 409];
        }

        $email = !empty($input['email']) ? trim($input['email']) : null;
        $user = $userModel->create($input['username'], $input['password'], $role, $email);
        LoggerService::channel('user')->info('User created', ['user_id' => $user['id'], 'username' => $input['username'], 'role' => $role]);
        http_response_code(201);
        return $user;
    }

    /**
     * PUT /users/{id}
     * Admin only. Update a user's email and role.
     */
    public function update(int $id): array {
        Auth::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true);

        $userModel = new User();
        $user = $userModel->findById($id);

        if (!$user) {
            http_response_code(404);
            return ['error' => 'User not found', 'code' => 404];
        }

        $v = new ValidationHelper();
        $v->inList($input['role'] ?? $user['role'], 'role', ['admin', 'member']);
        if (isset($input['email']) && $input['email'] !== '') {
            $v->email($input['email'], 'email')->maxLength($input['email'], 'email', 255);
        }
        $response = $v->responseIfFailed();
        if ($response) return $response;

        $email = isset($input['email']) ? trim($input['email']) : $user['email'];
        $role = $input['role'] ?? $user['role'];

        $userModel->update($id, $email ?: null, $role);
        return $userModel->findById($id);
    }

    /**
     * DELETE /users/{id}
     * Admin only. Delete a user.
     */
    public function delete(int $id): array {
        Auth::requireAdmin();

        $userModel = new User();
        $user = $userModel->findById($id);

        if (!$user) {
            http_response_code(404);
            return ['error' => 'User not found', 'code' => 404];
        }

        // Prevent self-deletion
        if ($id === (int) ($_SESSION['user_id'] ?? 0)) {
            http_response_code(400);
            return ['error' => 'Cannot delete your own account', 'code' => 400];
        }

        $userModel->delete($id);
        LoggerService::channel('user')->info('User deleted', ['deleted_user_id' => $id, 'by_user_id' => $_SESSION['user_id'] ?? null]);
        return ['message' => 'User deleted successfully'];
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

        require_once __DIR__ . '/../services/PasswordValidator.php';
        $validator = new PasswordValidator();
        $passwordResult = $validator->validate($input['password']);
        if (!$passwordResult['valid']) {
            http_response_code(400);
            return ['error' => implode('. ', $passwordResult['errors']), 'code' => 400];
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

    /**
     * POST /users/{id}/reset-link
     * Admin only. Generate a one-time password reset link for a user.
     */
    public function generateResetLink(int $id): array {
        Auth::requireAdmin();

        $userModel = new User();
        $user = $userModel->findById($id);

        if (!$user) {
            http_response_code(404);
            return ['error' => 'User not found', 'code' => 404];
        }

        $token = $userModel->createResetToken($id);
        LoggerService::channel('user')->info('Password reset link generated', ['target_user_id' => $id, 'by_user_id' => $_SESSION['user_id'] ?? null]);

        return [
            'token' => $token,
            'message' => 'Reset link generated. It expires in 24 hours.',
        ];
    }
}
