<?php

/**
 * Cookslate API Router / Entry Point
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

// Try multiple base paths (Caddy proxy sends /api/*, direct access sends /cookslate/api/*)
$basePaths = ['/cookslate/api', '/crumble/api', '/api'];
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
    $csrfExempt = ($resource === 'auth' && in_array($id, ['login', 'oauth', 'sso-config']));
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
                case 'oauth':
                    require_once __DIR__ . '/controllers/OAuthController.php';
                    $oauthController = new OAuthController();
                    if ($subResource === 'redirect' && $method === 'GET') {
                        $oauthController->redirect();
                    } elseif ($subResource === 'callback' && $method === 'GET') {
                        $oauthController->callback();
                    }
                    break;
                case 'sso-config':
                    if ($method === 'GET') {
                        require_once __DIR__ . '/controllers/OAuthController.php';
                        $oauthController = new OAuthController();
                        $response = $oauthController->config();
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
            } elseif ($id === 'export' && $method === 'GET') {
                $response = $controller->export();
            } elseif ($id === 'export-zip' && $method === 'GET') {
                $controller->exportZip();
                exit; // exportZip handles its own response
            } elseif ($id === 'export-cooklang' && $method === 'GET') {
                Auth::requireAuth();
                require_once __DIR__ . '/services/CooklangExporter.php';
                $recipeModel = new Recipe();
                $exporter = new CooklangExporter();
                $allRecipes = $recipeModel->getAll(1, 1000)['recipes'] ?? [];
                // Enrich with ingredients
                foreach ($allRecipes as &$r) {
                    $full = $recipeModel->getById($r['id']);
                    $r['ingredients'] = $full['ingredients'] ?? [];
                    $r['instructions'] = $full['instructions'] ?? [];
                }
                $files = $exporter->exportAll($allRecipes);
                // Create ZIP
                $tmpFile = tempnam(sys_get_temp_dir(), 'cookslate_cooklang_');
                $zip = new ZipArchive();
                $zip->open($tmpFile, ZipArchive::CREATE);
                foreach ($files as $name => $content) {
                    $zip->addFromString($name, $content);
                }
                $zip->close();
                header('Content-Type: application/zip');
                header('Content-Disposition: attachment; filename="cookslate-cooklang-export.zip"');
                readfile($tmpFile);
                unlink($tmpFile);
                exit;
            } elseif ($id === 'import-cooklang' && $method === 'POST') {
                Auth::requireAuth();
                require_once __DIR__ . '/services/CooklangImporter.php';
                $importer = new CooklangImporter();
                if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                    http_response_code(400);
                    $response = ['error' => 'No file uploaded'];
                } else {
                    $content = file_get_contents($_FILES['file']['tmp_name']);
                    $parsed = $importer->parse($content);
                    if (empty($parsed['title'])) {
                        // Use filename as title
                        $parsed['title'] = pathinfo($_FILES['file']['name'], PATHINFO_FILENAME);
                    }
                    $response = $controller->createFromData($parsed);
                }
            } elseif ($id === 'by-ingredients' && $method === 'GET') {
                $response = $controller->byIngredients();
            } elseif ($id === 'uncooked' && $method === 'GET') {
                $response = $controller->uncooked();
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
                } elseif ($subResource === 'cook-log' && $method === 'GET') {
                    // GET /recipes/{id}/cook-log
                    require_once __DIR__ . '/controllers/CookLogController.php';
                    $cookController = new CookLogController();
                    $response = $cookController->recipeHistory($recipeId);
                } elseif ($subResource === 'analyze' && $method === 'GET') {
                    // GET /recipes/{id}/analyze — cost & nutrition analysis
                    Auth::requireAuth();
                    require_once __DIR__ . '/services/RecipeAnalyzer.php';
                    $recipeModel = new Recipe();
                    $full = $recipeModel->findById($recipeId);
                    if (!$full) {
                        http_response_code(404);
                        $response = ['error' => 'Recipe not found'];
                    } else {
                        $analyzer = new RecipeAnalyzer();
                        $response = $analyzer->analyze(
                            $full['ingredients'] ?? [],
                            $full['servings'] ?? null
                        );
                    }
                } elseif ($subResource === 'share' && $method === 'POST') {
                    // POST /recipes/{id}/share
                    require_once __DIR__ . '/controllers/RecipeShareController.php';
                    $shareController = new RecipeShareController();
                    $response = $shareController->createShare($recipeId);
                } elseif ($subResource === 'share' && $method === 'DELETE') {
                    // DELETE /recipes/{id}/share
                    require_once __DIR__ . '/controllers/RecipeShareController.php';
                    $shareController = new RecipeShareController();
                    $response = $shareController->revokeShare($recipeId);
                } elseif ($subResource === 'related' && $method === 'GET') {
                    // /recipes/{id}/related
                    $response = $controller->related($recipeId);
                } elseif ($subResource === 'annotations') {
                    // /recipes/{id}/annotations
                    require_once __DIR__ . '/config/license.php';
                    if (!License::checkActive()) {
                        http_response_code(403);
                        $response = ['error' => 'Pro license required', 'code' => 403, 'upgrade' => true];
                    } else {
                        require_once __DIR__ . '/pro/models/RecipeAnnotation.php';
                        $annotationModel = new RecipeAnnotation();
                        if ($method === 'GET') {
                            $userId = Auth::requireAuth();
                            $response = ['annotations' => $annotationModel->getForRecipe($recipeId, $userId)];
                        } elseif ($method === 'PUT' || $method === 'POST') {
                            $userId = Auth::requireAuth();
                            $data = json_decode(file_get_contents('php://input'), true);
                            if (empty($data['target_type']) || !isset($data['target_index']) || empty($data['note'])) {
                                http_response_code(400);
                                $response = ['error' => 'target_type, target_index, and note are required'];
                            } else {
                                $response = $annotationModel->upsert($recipeId, $userId, $data['target_type'], (int)$data['target_index'], $data['note']);
                            }
                        } elseif ($method === 'DELETE') {
                            $userId = Auth::requireAuth();
                            $data = json_decode(file_get_contents('php://input'), true);
                            if (empty($data['target_type']) || !isset($data['target_index'])) {
                                http_response_code(400);
                                $response = ['error' => 'target_type and target_index are required'];
                            } else {
                                $annotationModel->delete($recipeId, $userId, $data['target_type'], (int)$data['target_index']);
                                $response = ['message' => 'Annotation deleted'];
                            }
                        }
                    }
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
            } elseif ($id === 'forgotten-favorites' && $method === 'GET') {
                // GET /cook-log/forgotten-favorites
                $response = $cookController->forgottenFavorites();
            }
            break;

        // ── Stats Routes ───────────────────────────────────────────────
        case 'stats':
            require_once __DIR__ . '/config/license.php';
            if (!License::checkActive()) {
                http_response_code(403);
                $response = ['error' => 'Pro license required', 'code' => 403, 'upgrade' => true];
                break;
            }
            require_once __DIR__ . '/pro/controllers/StatsController.php';
            $statsController = new StatsController();

            if ($id === null && $method === 'GET') {
                $response = $statsController->index();
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
                } elseif ($subResource === 'checked' && $method === 'DELETE') {
                    // /grocery/{id}/checked — clear all checked items
                    $response = $controller->clearChecked($listId);
                } elseif ($subResource === 'recipes' && is_numeric($subId)) {
                    // /grocery/{id}/recipes/{recipeId}
                    if ($method === 'POST') {
                        $response = $controller->addRecipe($listId, (int) $subId);
                    }
                }
            }
            break;

        // ── Shared Recipe Routes (public) ──────────────────────────────
        case 'shared':
            require_once __DIR__ . '/controllers/RecipeShareController.php';
            $controller = new RecipeShareController();

            if ($id && $method === 'GET') {
                // Rate limit public endpoint
                $rateLimiter = new RateLimiter();
                $clientIp = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
                $rateResult = $rateLimiter->check($clientIp, 'shared_view', 30, 60);
                if (!$rateResult['allowed']) {
                    http_response_code(429);
                    header('Retry-After: ' . $rateResult['retryAfter']);
                    $response = ['error' => 'Too many requests', 'code' => 429, 'retryAfter' => $rateResult['retryAfter']];
                    break;
                }
                $response = $controller->getByToken($id);
            }
            break;

        // ── Meal Plan Routes ────────────────────────────────────────────
        case 'meal-plan':
            require_once __DIR__ . '/config/license.php';
            if (!License::checkActive()) {
                http_response_code(403);
                $response = ['error' => 'Pro license required', 'code' => 403, 'upgrade' => true];
                break;
            }
            require_once __DIR__ . '/pro/controllers/MealPlanController.php';
            $controller = new MealPlanController();

            if ($id === null && $method === 'GET') {
                // GET /meal-plan
                $response = $controller->getWeekPlan();
            } elseif ($id === 'today' && $method === 'GET') {
                // GET /meal-plan/today
                $response = $controller->getToday();
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

        // ── License Routes ──────────────────────────────────────────────
        case 'license':
            require_once __DIR__ . '/config/license.php';

            if ($id === 'status' && $method === 'GET') {
                // GET /license/status — returns license tier info
                $license = License::getInstance();
                $response = $license->status();
            } elseif ($id === 'activate' && $method === 'POST') {
                // POST /license/activate — saves key to database and validates
                require_once __DIR__ . '/middleware/Auth.php';
                Auth::requireAdmin();

                $data = json_decode(file_get_contents('php://input'), true);
                $key = trim($data['key'] ?? '');
                if (empty($key)) {
                    http_response_code(400);
                    $response = ['error' => 'License key is required'];
                } else {
                    // Validate the key first
                    $license = new License($key);
                    if ($license->isActive()) {
                        License::saveToDatabase($key);
                        License::reset();
                        $response = ['message' => 'License activated', 'status' => $license->status()];
                    } else {
                        http_response_code(400);
                        $response = ['error' => 'Invalid license key'];
                    }
                }
            } elseif ($id === 'deactivate' && $method === 'POST') {
                // POST /license/deactivate — removes key from database
                require_once __DIR__ . '/middleware/Auth.php';
                Auth::requireAdmin();

                License::removeFromDatabase();
                License::reset();
                $response = ['message' => 'License deactivated'];
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
    error_log('Cookslate DB Error: ' . $e->getMessage());

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'code' => 500,
    ]);
    error_log('Cookslate Error: ' . $e->getMessage());
}
