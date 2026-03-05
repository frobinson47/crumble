<?php

require_once __DIR__ . '/env.php';

// Load .env from api root if it exists
$envPath = __DIR__ . '/../.env';
if (file_exists($envPath)) {
    loadEnv($envPath);
}

return [
    'host' => env('DB_HOST', 'localhost'),
    'dbname' => env('DB_NAME', 'crumble_db'),
    'username' => env('DB_USER', 'root'),
    'password' => env('DB_PASS', ''),
    'charset' => 'utf8mb4',
];
