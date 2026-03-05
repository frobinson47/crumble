<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class EnvConfigTest extends TestCase
{
    protected function setUp(): void
    {
        // Clear any previously loaded env vars
        foreach (['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'CORS_ORIGINS', 'NONEXISTENT'] as $key) {
            unset($_ENV[$key]);
            putenv($key);
        }
    }

    public function testEnvLoaderReturnsConfigValues(): void
    {
        $tmpDir = sys_get_temp_dir() . '/crumble_test_' . uniqid();
        mkdir($tmpDir);
        file_put_contents($tmpDir . '/.env', implode("\n", [
            'DB_HOST=testhost',
            'DB_NAME=testdb',
            'DB_USER=testuser',
            'DB_PASS=testpass',
            'CORS_ORIGINS=https://example.com,https://app.example.com',
        ]));

        require_once __DIR__ . '/../../config/env.php';
        loadEnv($tmpDir . '/.env');

        $this->assertEquals('testhost', env('DB_HOST'));
        $this->assertEquals('testdb', env('DB_NAME'));
        $this->assertEquals('testuser', env('DB_USER'));
        $this->assertEquals('testpass', env('DB_PASS'));
        $this->assertEquals('default', env('NONEXISTENT', 'default'));

        unlink($tmpDir . '/.env');
        rmdir($tmpDir);
    }

    public function testEnvLoaderSkipsCommentsAndBlankLines(): void
    {
        $tmpDir = sys_get_temp_dir() . '/crumble_test_' . uniqid();
        mkdir($tmpDir);
        file_put_contents($tmpDir . '/.env', implode("\n", [
            '# This is a comment',
            '',
            'TEST_KEY=test_value',
            '  # Another comment',
        ]));

        require_once __DIR__ . '/../../config/env.php';
        loadEnv($tmpDir . '/.env');

        $this->assertEquals('test_value', env('TEST_KEY'));

        unlink($tmpDir . '/.env');
        rmdir($tmpDir);
    }

    public function testEnvLoaderHandlesMissingFile(): void
    {
        require_once __DIR__ . '/../../config/env.php';
        // Should not throw
        loadEnv('/nonexistent/path/.env');
        $this->assertTrue(true);
    }
}
