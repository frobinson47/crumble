<?php

require_once __DIR__ . '/../models/User.php';

class AuthController {

    /**
     * POST /auth/login
     * Expects JSON: { username, password }
     */
    public function login(): array {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['username']) || empty($input['password'])) {
            http_response_code(400);
            return ['error' => 'Username and password are required', 'code' => 400];
        }

        $userModel = new User();
        $user = $userModel->findByUsername($input['username']);

        if (!$user || !$userModel->verifyPassword($input['password'], $user['password_hash'])) {
            http_response_code(401);
            return ['error' => 'Invalid username or password', 'code' => 401];
        }

        // Start session and store user info
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['role'] = $user['role'];

        // Return user without password hash
        unset($user['password_hash']);
        return $user;
    }

    /**
     * POST /auth/logout
     */
    public function logout(): array {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params['path'], $params['domain'],
                $params['secure'], $params['httponly']
            );
        }
        session_destroy();

        return ['message' => 'Logged out successfully'];
    }

    /**
     * GET /auth/me
     * Returns current authenticated user or 401.
     */
    public function me(): array {
        if (empty($_SESSION['user_id'])) {
            http_response_code(401);
            return ['error' => 'Not authenticated', 'code' => 401];
        }

        $userModel = new User();
        $user = $userModel->findById((int) $_SESSION['user_id']);

        if (!$user) {
            http_response_code(401);
            return ['error' => 'User not found', 'code' => 401];
        }

        return $user;
    }
}
