<?php

class DemoGuard
{
    /**
     * Check if the current request is allowed for demo users.
     * Returns ['allowed' => bool, 'error' => string|null]
     */
    public static function check(?string $resource = null, ?string $action = null): array
    {
        // Not a demo user — always allowed
        if (empty($_SESSION['is_demo'])) {
            return ['allowed' => true, 'error' => null];
        }

        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        // GET/HEAD/OPTIONS always allowed
        if (in_array($method, ['GET', 'HEAD', 'OPTIONS'])) {
            return ['allowed' => true, 'error' => null];
        }

        // Allow logout for demo users
        if ($resource === 'auth' && $action === 'logout') {
            return ['allowed' => true, 'error' => null];
        }

        // Block all other state-changing requests
        return ['allowed' => false, 'error' => 'Demo account is read-only'];
    }
}
