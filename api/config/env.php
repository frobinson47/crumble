<?php

/**
 * Minimal .env loader. Loads KEY=VALUE pairs into $_ENV and putenv().
 */
function loadEnv(string $path): void
{
    if (!file_exists($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (!str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        $_ENV[$key] = $value;
        putenv("$key=$value");
    }
}

/**
 * Get an environment variable with optional default.
 */
function env(string $key, mixed $default = null): mixed
{
    return $_ENV[$key] ?? $default;
}

/**
 * Get session cookie parameters based on environment.
 */
function getSessionCookieParams(): array
{
    $isProduction = env('APP_ENV', 'production') === 'production';
    return [
        'samesite' => 'Lax',
        'httponly' => true,
        'secure' => $isProduction,
        'path' => '/',
    ];
}

/**
 * Session lifetime in seconds (2 hours).
 */
function getSessionLifetime(): int
{
    return 7200;
}
