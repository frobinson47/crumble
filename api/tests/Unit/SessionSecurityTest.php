<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class SessionSecurityTest extends TestCase
{
    protected function setUp(): void
    {
        require_once __DIR__ . '/../../config/env.php';
    }

    public function testSessionCookieParamsIncludeSecureInProduction(): void
    {
        $_ENV['APP_ENV'] = 'production';

        $params = getSessionCookieParams();

        $this->assertTrue($params['secure']);
        $this->assertTrue($params['httponly']);
        $this->assertEquals('Lax', $params['samesite']);
    }

    public function testSessionCookieParamsOmitSecureInDev(): void
    {
        $_ENV['APP_ENV'] = 'development';

        $params = getSessionCookieParams();

        $this->assertFalse($params['secure']);
    }

    public function testSessionLifetimeIsTwoHours(): void
    {
        $lifetime = getSessionLifetime();
        $this->assertEquals(7200, $lifetime);
    }
}
