<?php

/**
 * Crumble API Router / Entry Point
 *
 * Routes all API requests to the appropriate controller methods.
 * Handles CORS, sessions, JSON responses, and error catching.
 */

// ─── Security Defaults ─────────────────────────────────────────────────────
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);

// ─── Environment ────────────────────────────────────────────────────────────
require_once __DIR__ . '/config/env.php';
$envPath = __DIR__ . '/.env';
if (file_exists($envPath)) {
    loadEnv($envPath);
}

// ─── CORS Headers ───────────────────────────────────────────────────────────
$allowedOrigins = array_filter(array_map('trim', explode(',', env('CORS_ORIGINS', 'http://localhost:5176'))));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} elseif (!empty($allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigins[0]);
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

// Handle OPTIONS preflight immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ─── Session ────────────────────────────────────────────────────────────────
ini_set('session.gc_maxlifetime', (string) getSessionLifetime());
session_set_cookie_params(getSessionCookieParams());
session_start();

// Check session expiration
if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > getSessionLifetime()) {
    session_unset();
    session_destroy();
    session_start();
}
$_SESSION['last_activity'] = time();

// ─── Authentik Forward Auth Auto-Login ──────────────────────────────────
// Caddy sets these headers after successful forward_auth with Authentik.
// Caddy strips these from external requests, so they are trustworthy.
$authentikUser = $_SERVER['HTTP_X_AUTHENTIK_USERNAME'] ?? null;
$authentikEmail = $_SERVER['HTTP_X_AUTHENTIK_EMAIL'] ?? null;
if ($authentikUser && empty($_SESSION['user_id'])) {
    require_once __DIR__ . '/models/User.php';
    $userModel = new User();
    $user = $userModel->findByUsername($authentikUser);

    if (!$user) {
        // Auto-create user — password is random since auth is via Authentik
        $user = $userModel->create($authentikUser, bin2hex(random_bytes(32)), 'member', $authentikEmail);
    }

    // Auto-login: set session
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['is_demo'] = false;
}

// ─── Load Config ────────────────────────────────────────────────────────────
require_once __DIR__ . '/config/constants.php';
require_once __DIR__ . '/middleware/RateLimiter.php';
require_once __DIR__ . '/middleware/Csrf.php';
require_once __DIR__ . '/middleware/DemoGuard.php';

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

    // ── CSRF Protection (exempt login — user has no session yet) ────────
    $csrfExempt = ($resource === 'auth' && $id === 'login');
    if (!$csrfExempt) {
        Csrf::enforce();
    }

    // ── Demo Guard (block state-changing requests for demo users) ────────
    $demoResult = DemoGuard::check($resource, $id);
    if (!$demoResult['allowed']) {
        http_response_code(403);
        $response = ['error' => $demoResult['error'], 'code' => 403];
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    switch ($resource) {

        // ── Auth Routes ─────────────────────────────────────────────────
        case 'auth':
            require_once __DIR__ . '/controllers/AuthController.php';
            $controller = new AuthController();

            switch ($id) {
                case 'login':
                    if ($method === 'POST') {
                        $rateLimiter = new RateLimiter();
                        $clientIp = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
                        $rateResult = $rateLimiter->check($clientIp, 'login', 5, 300);
                        if (!$rateResult['allowed']) {
                            http_response_code(429);
                            header('Retry-After: ' . $rateResult['retryAfter']);
                            $response = [
                                'error' => 'Too many login attempts. Try again later.',
                                'code' => 429,
                                'retryAfter' => $rateResult['retryAfter'],
                            ];
                            break;
                        }
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

            // Rate limit all import routes
            if (str_starts_with($id ?? '', 'import') && $method === 'POST') {
                $rateLimiter = new RateLimiter();
                $clientIp = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
                $rateResult = $rateLimiter->check($clientIp, 'import', 10, 300);
                if (!$rateResult['allowed']) {
                    http_response_code(429);
                    header('Retry-After: ' . $rateResult['retryAfter']);
                    $response = [
                        'error' => 'Too many import requests. Try again later.',
                        'code' => 429,
                        'retryAfter' => $rateResult['retryAfter'],
                    ];
                    break;
                }
            }

            if ($id === 'import' && $method === 'POST') {
                $response = $controller->import();
            } elseif ($id === 'import-batch' && $method === 'POST') {
                $response = $controller->importBatch();
            } elseif ($id === 'import-mealie' && $method === 'POST') {
                $response = $controller->importMealie();
            } elseif ($id === 'import-paprika' && $method === 'POST') {
                $response = $controller->importPaprika();
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
            } elseif ($id === 'featured' && $method === 'GET') {
                $response = $controller->featured();
            } elseif (is_numeric($id)) {
                $recipeId = (int) $id;

                if ($subResource === 'favorite' && $method === 'POST') {
                    // /recipes/{id}/favorite
                    require_once __DIR__ . '/controllers/FavoriteController.php';
                    $favController = new FavoriteController();
                    $response = $favController->toggle($recipeId);
                } elseif ($subResource === 'rate' && $method === 'POST') {
                    // /recipes/{id}/rate
                    require_once __DIR__ . '/controllers/RatingController.php';
                    $rateController = new RatingController();
                    $response = $rateController->rate($recipeId);
                } elseif ($subResource === 'cook' && $method === 'POST') {
                    // /recipes/{id}/cook
                    require_once __DIR__ . '/controllers/CookLogController.php';
                    $cookController = new CookLogController();
                    $response = $cookController->log($recipeId);
                } elseif ($subResource === 'related' && $method === 'GET') {
                    // /recipes/{id}/related
                    $response = $controller->related($recipeId);
                } elseif ($subResource === null) {
                    // /recipes/{id}
                    switch ($method) {
                        case 'GET':
                            $response = $controller->get($recipeId);
                            break;
                        case 'PUT':
                        case 'POST':
                            $response = $controller->update($recipeId);
                            break;
                        case 'DELETE':
                            $response = $controller->delete($recipeId);
                            break;
                    }
                }
            }
            break;

        // ── Favorites Routes ──────────────────────────────────────────
        case 'favorites':
            require_once __DIR__ . '/controllers/FavoriteController.php';
            $favController = new FavoriteController();

            if ($id === null && $method === 'GET') {
                $response = $favController->list();
            }
            break;

        // ── Cook Log Routes ──────────────────────────────────────────
        case 'cook-log':
            require_once __DIR__ . '/controllers/CookLogController.php';
            $cookController = new CookLogController();

            if ($id === null && $method === 'GET') {
                $response = $cookController->history();
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

        // ── Meal Plan Routes ────────────────────────────────────────────
        case 'meal-plan':
            require_once __DIR__ . '/controllers/MealPlanController.php';
            $controller = new MealPlanController();

            if ($id === null && $method === 'GET') {
                // GET /meal-plan
                $response = $controller->getWeekPlan();
            } elseif ($id === 'items' && $subResource === null && $method === 'POST') {
                // POST /meal-plan/items
                $response = $controller->addItem();
            } elseif ($id === 'items' && is_numeric($subResource) && $method === 'PUT') {
                // PUT /meal-plan/items/{id}
                $response = $controller->updateItem((int) $subResource);
            } elseif ($id === 'items' && is_numeric($subResource) && $method === 'DELETE') {
                // DELETE /meal-plan/items/{id}
                $response = $controller->removeItem((int) $subResource);
            } elseif ($id === 'grocery' && $method === 'POST') {
                // POST /meal-plan/grocery
                $response = $controller->generateGrocery();
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
            } elseif (is_numeric($id) && $subResource === null && $method === 'PUT') {
                // PUT /users/{id}
                $response = $controller->update((int) $id);
            } elseif (is_numeric($id) && $subResource === 'password') {
                // /users/{id}/password
                if ($method === 'PUT') {
                    $response = $controller->resetPassword((int) $id);
                }
            } elseif (is_numeric($id) && $subResource === null && $method === 'DELETE') {
                // DELETE /users/{id}
                $response = $controller->delete((int) $id);
            }
            break;

        // ── Admin Routes ─────────────────────────────────────────────────
        case 'admin':
            if ($id === 'reparse-ingredients' && $method === 'POST') {
                require_once __DIR__ . '/middleware/Auth.php';
                Auth::requireAdmin();

                require_once __DIR__ . '/services/IngredientParser.php';
                require_once __DIR__ . '/models/Database.php';

                $parser = new IngredientParser();
                $db = Database::getInstance();

                // Find ingredients where amount is null/empty but name looks like it has an amount
                $stmt = $db->query("
                    SELECT id, name FROM ingredients
                    WHERE (amount IS NULL OR amount = '')
                    AND name REGEXP '^[0-9]'
                ");
                $rows = $stmt->fetchAll();

                $updateStmt = $db->prepare('
                    UPDATE ingredients SET amount = ?, unit = ?, name = ? WHERE id = ?
                ');

                $updated = 0;
                foreach ($rows as $row) {
                    $parsed = $parser->parse($row['name']);
                    if ($parsed['amount'] !== null) {
                        $updateStmt->execute([
                            $parsed['amount'],
                            $parsed['unit'],
                            $parsed['name'],
                            $row['id'],
                        ]);
                        $updated++;
                    }
                }

                $response = [
                    'message' => "Re-parsed $updated ingredients",
                    'total_checked' => count($rows),
                    'updated' => $updated,
                ];
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
