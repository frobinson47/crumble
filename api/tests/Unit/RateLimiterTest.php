<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class RateLimiterTest extends TestCase
{
    private string $storageDir;

    protected function setUp(): void
    {
        require_once __DIR__ . '/../../middleware/RateLimiter.php';
        $this->storageDir = sys_get_temp_dir() . '/crumble_ratelimit_test_' . uniqid();
        mkdir($this->storageDir, 0755, true);
    }

    protected function tearDown(): void
    {
        $files = glob($this->storageDir . '/*');
        foreach ($files as $file) {
            unlink($file);
        }
        if (is_dir($this->storageDir)) {
            rmdir($this->storageDir);
        }
    }

    public function testAllowsRequestsUnderLimit(): void
    {
        $limiter = new \RateLimiter($this->storageDir);
        $result = $limiter->check('127.0.0.1', 'login', 5, 60);
        $this->assertTrue($result['allowed']);
        $this->assertEquals(4, $result['remaining']);
    }

    public function testBlocksAfterLimitExceeded(): void
    {
        $limiter = new \RateLimiter($this->storageDir);
        for ($i = 0; $i < 5; $i++) {
            $limiter->check('127.0.0.1', 'login', 5, 60);
        }
        $result = $limiter->check('127.0.0.1', 'login', 5, 60);
        $this->assertFalse($result['allowed']);
        $this->assertEquals(0, $result['remaining']);
    }

    public function testDifferentIpsTrackedSeparately(): void
    {
        $limiter = new \RateLimiter($this->storageDir);
        for ($i = 0; $i < 5; $i++) {
            $limiter->check('192.168.1.1', 'login', 5, 60);
        }
        $result = $limiter->check('192.168.1.2', 'login', 5, 60);
        $this->assertTrue($result['allowed']);
    }

    public function testDifferentActionsTrackedSeparately(): void
    {
        $limiter = new \RateLimiter($this->storageDir);
        for ($i = 0; $i < 5; $i++) {
            $limiter->check('127.0.0.1', 'login', 5, 60);
        }
        $result = $limiter->check('127.0.0.1', 'import', 5, 60);
        $this->assertTrue($result['allowed']);
    }

    public function testExpiredAttemptsAreCleared(): void
    {
        $limiter = new \RateLimiter($this->storageDir);
        for ($i = 0; $i < 3; $i++) {
            $limiter->check('127.0.0.1', 'login', 3, 1);
        }
        $result = $limiter->check('127.0.0.1', 'login', 3, 1);
        $this->assertFalse($result['allowed']);

        sleep(2);

        $result = $limiter->check('127.0.0.1', 'login', 3, 1);
        $this->assertTrue($result['allowed']);
    }
}
