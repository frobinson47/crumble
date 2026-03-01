<?php

class Auth {
    /**
     * Require an authenticated user session.
     * Returns user_id on success, sends 401 JSON and exits on failure.
     */
    public static function requireAuth(): int {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (empty($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required', 'code' => 401]);
            exit;
        }

        return (int) $_SESSION['user_id'];
    }

    /**
     * Require an admin user session.
     * Returns user_id on success, sends 401/403 JSON and exits on failure.
     */
    public static function requireAdmin(): int {
        $userId = self::requireAuth();

        if (empty($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Admin access required', 'code' => 403]);
            exit;
        }

        return $userId;
    }
}
