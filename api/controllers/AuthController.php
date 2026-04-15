<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../middleware/Csrf.php';
require_once __DIR__ . '/../services/ValidationHelper.php';
require_once __DIR__ . '/../services/LoggerService.php';

class AuthController {

    /**
     * POST /auth/login
     * Expects JSON: { username, password }
     */
    public function login(): array {
        $input = json_decode(file_get_contents('php://input'), true);

        $v = new ValidationHelper();
        $v->required($input['username'] ?? null, 'username')
          ->maxLength($input['username'] ?? null, 'username', 100)
          ->required($input['password'] ?? null, 'password')
          ->maxLength($input['password'] ?? null, 'password', 500);
        $response = $v->responseIfFailed();
        if ($response) return $response;

        $userModel = new User();
        $user = $userModel->findByUsername($input['username']);

        // Check account lockout (skip for demo account)
        $isDemo = $user && $user['is_demo'];
        if ($user && !$isDemo && $userModel->isLocked($user['id'])) {
            LoggerService::channel('auth')->warning('Login attempt on locked account', ['user_id' => $user['id'], 'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown']);
            http_response_code(423);
            return ['error' => 'Account is temporarily locked. Try again later.', 'code' => 423];
        }

        if (!$user || !$userModel->verifyPassword($input['password'], $user['password_hash'])) {
            if ($user && !$isDemo) {
                $userModel->recordFailedAttempt($user['id']);
            }
            LoggerService::channel('auth')->warning('Failed login attempt', ['username' => $input['username'], 'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown']);
            http_response_code(401);
            return ['error' => 'Invalid username or password', 'code' => 401];
        }

        // Successful login — reset failed attempts and regenerate session
        LoggerService::channel('auth')->info('User logged in', ['user_id' => $user['id'], 'username' => $user['username']]);
        $userModel->resetFailedAttempts($user['id']);
        session_regenerate_id(true);

        // Start session and store user info
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['is_demo'] = (bool) $user['is_demo'];

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

        $user['csrf_token'] = Csrf::generateToken();
        return $user;
    }
}
