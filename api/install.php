<?php
/**
 * Cookslate Install Wizard
 *
 * One-time setup script that:
 * 1. Checks PHP requirements
 * 2. Tests database connection
 * 3. Creates database tables
 * 4. Creates the first admin user
 *
 * Delete this file after installation for security.
 */

// Prevent running if already installed
$envPath = __DIR__ . '/.env';
if (file_exists($envPath)) {
    require_once __DIR__ . '/config/env.php';
    loadEnv($envPath);
    try {
        $pdo = new PDO(
            'mysql:host=' . ($_ENV['DB_HOST'] ?? 'localhost') . ';dbname=' . ($_ENV['DB_NAME'] ?? 'crumble_db'),
            $_ENV['DB_USER'] ?? 'root',
            $_ENV['DB_PASS'] ?? '',
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $stmt = $pdo->query("SELECT COUNT(*) FROM users");
        $userCount = (int) $stmt->fetchColumn();
        if ($userCount > 0) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Cookslate is already installed. Delete install.php for security.']);
            exit;
        }
    } catch (PDOException $e) {
        // Database not set up yet — continue with installer
    }
}

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

// GET /install.php — return system requirements check
if ($method === 'GET') {
    $checks = [
        'php_version' => [
            'label' => 'PHP 8.1+',
            'ok' => version_compare(PHP_VERSION, '8.1.0', '>='),
            'value' => PHP_VERSION,
        ],
        'pdo_mysql' => [
            'label' => 'PDO MySQL extension',
            'ok' => extension_loaded('pdo_mysql'),
        ],
        'json' => [
            'label' => 'JSON extension',
            'ok' => extension_loaded('json'),
        ],
        'gd' => [
            'label' => 'GD extension (image processing)',
            'ok' => extension_loaded('gd'),
        ],
        'curl' => [
            'label' => 'cURL extension (recipe import)',
            'ok' => extension_loaded('curl'),
        ],
        'mbstring' => [
            'label' => 'mbstring extension',
            'ok' => extension_loaded('mbstring'),
        ],
        'uploads_writable' => [
            'label' => 'uploads/ directory writable',
            'ok' => is_writable(__DIR__ . '/../uploads') || is_writable(__DIR__ . '/..'),
        ],
        'env_exists' => [
            'label' => '.env file exists',
            'ok' => file_exists($envPath),
        ],
    ];

    $allOk = array_reduce($checks, fn($carry, $check) => $carry && $check['ok'], true);

    echo json_encode([
        'checks' => $checks,
        'ready' => $allOk,
    ], JSON_PRETTY_PRINT);
    exit;
}

// POST /install.php — run installation
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $dbHost = $input['db_host'] ?? 'localhost';
    $dbName = $input['db_name'] ?? 'cookslate_db';
    $dbUser = $input['db_user'] ?? 'root';
    $dbPass = $input['db_pass'] ?? '';
    $adminUsername = $input['admin_username'] ?? '';
    $adminPassword = $input['admin_password'] ?? '';

    // Validate
    if (strlen($adminUsername) < 3) {
        http_response_code(400);
        echo json_encode(['error' => 'Admin username must be at least 3 characters']);
        exit;
    }
    if (strlen($adminPassword) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Admin password must be at least 6 characters']);
        exit;
    }

    // Test database connection
    try {
        $pdo = new PDO(
            "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4",
            $dbUser,
            $dbPass,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
    } catch (PDOException $e) {
        http_response_code(400);
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit;
    }

    // Run schema
    $schemaPath = __DIR__ . '/../database/schema.sql';
    if (!file_exists($schemaPath)) {
        http_response_code(500);
        echo json_encode(['error' => 'schema.sql not found at database/schema.sql']);
        exit;
    }

    $schema = file_get_contents($schemaPath);
    try {
        $pdo->exec($schema);
    } catch (PDOException $e) {
        // Tables might already exist — check if it's a "table exists" error
        if (strpos($e->getMessage(), 'already exists') === false) {
            http_response_code(500);
            echo json_encode(['error' => 'Schema import failed: ' . $e->getMessage()]);
            exit;
        }
    }

    // Run migrations
    $migrationsDir = __DIR__ . '/../database/migrations';
    if (is_dir($migrationsDir)) {
        $files = glob($migrationsDir . '/*.sql');
        sort($files);
        foreach ($files as $file) {
            try {
                $pdo->exec(file_get_contents($file));
            } catch (PDOException $e) {
                // Skip errors from migrations that already ran
            }
        }
    }

    // Create admin user
    $hash = password_hash($adminPassword, PASSWORD_DEFAULT);
    try {
        $stmt = $pdo->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
        $stmt->execute([$adminUsername, $hash, 'admin']);
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
            http_response_code(400);
            echo json_encode(['error' => "Username '$adminUsername' already exists"]);
            exit;
        }
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create admin user: ' . $e->getMessage()]);
        exit;
    }

    // Write .env file if it doesn't exist
    if (!file_exists($envPath)) {
        $envContent = "DB_HOST=$dbHost\nDB_NAME=$dbName\nDB_USER=$dbUser\nDB_PASS=$dbPass\nCORS_ORIGINS=*\nAPP_ENV=production\n";
        file_put_contents($envPath, $envContent);
    }

    // Create uploads directory if needed
    $uploadsDir = __DIR__ . '/../uploads';
    if (!is_dir($uploadsDir)) {
        @mkdir($uploadsDir, 0755, true);
    }
    $thumbsDir = $uploadsDir . '/thumbnails';
    if (!is_dir($thumbsDir)) {
        @mkdir($thumbsDir, 0755, true);
    }

    echo json_encode([
        'success' => true,
        'message' => "Cookslate installed! Admin user '$adminUsername' created. Delete install.php for security.",
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
