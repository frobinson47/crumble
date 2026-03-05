<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class CsrfTest extends TestCase
{
    protected function setUp(): void
    {
        require_once __DIR__ . '/../../middleware/Csrf.php';
        $_SESSION = [];
    }

    public function testGenerateTokenReturnsNonEmptyString(): void
    {
        $token = \Csrf::generateToken();
        $this->assertNotEmpty($token);
        $this->assertEquals(64, strlen($token));
    }

    public function testValidateTokenReturnsTrueForValidToken(): void
    {
        $token = \Csrf::generateToken();
        $this->assertTrue(\Csrf::validateToken($token));
    }

    public function testValidateTokenReturnsFalseForInvalidToken(): void
    {
        \Csrf::generateToken();
        $this->assertFalse(\Csrf::validateToken('invalid_token'));
    }

    public function testValidateTokenReturnsFalseWhenNoSessionToken(): void
    {
        $this->assertFalse(\Csrf::validateToken('any_token'));
    }

    public function testTokenIsSameWithinSession(): void
    {
        $token1 = \Csrf::generateToken();
        $token2 = \Csrf::generateToken();
        $this->assertEquals($token1, $token2);
    }
}
