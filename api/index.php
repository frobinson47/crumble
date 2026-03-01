<?php

/**
 * Crumble API Router / Entry Point
 *
 * Routes all API requests to the appropriate controller methods.
 * Handles CORS, sessions, JSON responses, and error catching.
 */

// ─── CORS Headers ───────────────────────────────────────────────────────────
// Allow both dev (Vite) and production (Caddy) origins
$allowedOrigins = ['http://localhost:5176', 'http://crumble.fmr.local'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: http://localhost:5176');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

// Handle OPTIONS preflight immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ─── Session ────────────────────────────────────────────────────────────────
session_set_cookie_params([
    'samesite' => 'Lax',
    'httponly' => true,
    'path' => '/',
]);
session_start();

// ─── Load Config ────────────────────────────────────────────────────────────
require_once __DIR__ . '/config/constants.php';

// ─── Parse Request ──────────────────────────────────────────────────────────
$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Strip base path prefix
$path = parse_url($requestUri, PHP_URL_PATH);

// Try multiple base paths (Caddy proxy sends /api/*, direct access sends /crumble/api/*)
$basePaths = ['/crumble/api', '/api'];
foreach ($basePaths as $basePath) {
    if (str_starts_with($path, $basePath)) {
        $path = substr($path, strlen($basePath));
        break;
    }
}

// Clean up: remove leading/trailing slashes, split into segments
$path = trim($path, '/');
$segments = $path !== '' ? explode('/', $path) : [];

// ─── Route ──────────────────────────────────────────────────────────────────
try {
    $response = null;

    // Determine the resource (first segment) and action
    $resource = $segments[0] ?? '';
    $id = isset($segments[1]) ? $segments[1] : null;
    $subResource = $segments[2] ?? null;
    $subId = $segments[3] ?? null;

    switch ($resource) {

        // ── Auth Routes ─────────────────────────────────────────────────
        case 'auth':
            require_once __DIR__ . '/controllers/AuthController.php';
            $controller = new AuthController();

            switch ($id) {
                case 'login':
                    if ($method === 'POST') {
                        $response = $controller->login();
                    }
                    break;
                case 'logout':
                    if ($method === 'POST') {
                        $response = $controller->logout();
                    }
                    break;
                case 'me':
                    if ($method === 'GET') {
                        $response = $controller->me();
                    }
                    break;
            }
            break;

        // ── Recipe Routes ───────────────────────────────────────────────
        case 'recipes':
            require_once __DIR__ . '/controllers/RecipeController.php';
            $controller = new RecipeController();

            if ($id === 'import' && $method === 'POST') {
                $response = $controller->import();
            } elseif ($id === null) {
                // /recipes
                switch ($method) {
                    case 'GET':
                        $response = $controller->list();
                        break;
                    case 'POST':
                        $response = $controller->create();
                        break;
                }
            } elseif (is_numeric($id)) {
                // /recipes/{id}
                $recipeId = (int) $id;
                switch ($method) {
                    case 'GET':
                        $response = $controller->get($recipeId);
                        break;
                    case 'PUT':
                    case 'POST':
                        // Accept POST for multipart updates (PUT with files is problematic)
                        if ($method === 'PUT' || ($method === 'POST' && isset($_GET['_method']) && $_GET['_method'] === 'PUT')) {
                            $response = $controller->update($recipeId);
                        } elseif ($method === 'POST') {
                            $response = $controller->update($recipeId);
                        }
                        break;
                    case 'DELETE':
                        $response = $controller->delete($recipeId);
                        break;
                }
            }
            break;

        // ── Tag Routes ──────────────────────────────────────────────────
        case 'tags':
            require_once __DIR__ . '/controllers/TagController.php';
            $controller = new TagController();

            if ($id === null && $method === 'GET') {
                $response = $controller->list();
            } elseif (is_numeric($id) && $method === 'DELETE') {
                $response = $controller->delete((int) $id);
            }
            break;

        // ── Grocery Routes ──────────────────────────────────────────────
        case 'grocery':
            require_once __DIR__ . '/controllers/GroceryController.php';
            $controller = new GroceryController();

            if ($id === null) {
                // /grocery
                switch ($method) {
                    case 'GET':
                        $response = $controller->listAll();
                        break;
                    case 'POST':
                        $response = $controller->create();
                        break;
                }
            } elseif (is_numeric($id)) {
                $listId = (int) $id;

                if ($subResource === null) {
                    // /grocery/{id}
                    switch ($method) {
                        case 'GET':
                            $response = $controller->get($listId);
                            break;
                        case 'DELETE':
                            $response = $controller->delete($listId);
                            break;
                    }
                } elseif ($subResource === 'items') {
                    if ($subId === null) {
                        // /grocery/{id}/items
                        if ($method === 'POST') {
                            $response = $controller->addItem($listId);
                        }
                    } elseif (is_numeric($subId)) {
                        $itemId = (int) $subId;
                        // /grocery/{id}/items/{itemId}
                        switch ($method) {
                            case 'PUT':
                                $response = $controller->updateItem($listId, $itemId);
                                break;
                            case 'DELETE':
                                $response = $controller->deleteItem($listId, $itemId);
                                break;
                        }
                    }
                } elseif ($subResource === 'recipes' && is_numeric($subId)) {
                    // /grocery/{id}/recipes/{recipeId}
                    if ($method === 'POST') {
                        $response = $controller->addRecipe($listId, (int) $subId);
                    }
                }
            }
            break;

        // ── User Routes (admin) ─────────────────────────────────────────
        case 'users':
            require_once __DIR__ . '/controllers/UserController.php';
            $controller = new UserController();

            if ($id === null) {
                // /users
                switch ($method) {
                    case 'GET':
                        $response = $controller->list();
                        break;
                    case 'POST':
                        $response = $controller->create();
                        break;
                }
            } elseif (is_numeric($id) && $subResource === 'password') {
                // /users/{id}/password
                if ($method === 'PUT') {
                    $response = $controller->resetPassword((int) $id);
                }
            }
            break;

        // ── Root / Health Check ─────────────────────────────────────────
        case '':
            $response = [
                'name' => APP_NAME,
                'version' => APP_VERSION,
                'status' => 'ok',
            ];
            break;
    }

    // ── No matching route ───────────────────────────────────────────────
    if ($response === null) {
        http_response_code(404);
        $response = ['error' => 'Not found', 'code' => 404];
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error',
        'code' => 500,
    ]);
    error_log('Crumble DB Error: ' . $e->getMessage());

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'code' => 500,
    ]);
    error_log('Crumble Error: ' . $e->getMessage());
}
