<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class PasswordValidatorTest extends TestCase
{
    private $validator;

    protected function setUp(): void
    {
        require_once __DIR__ . '/../../services/PasswordValidator.php';
        $this->validator = new \PasswordValidator();
    }

    public function testRejectsTooShortPassword(): void
    {
        $result = $this->validator->validate('Ab1!xyz');
        $this->assertFalse($result['valid']);
        $this->assertContains('Password must be at least 8 characters', $result['errors']);
    }

    public function testRejectsPasswordWithoutUppercase(): void
    {
        $result = $this->validator->validate('abcdefg1!');
        $this->assertFalse($result['valid']);
        $this->assertContains('Password must contain an uppercase letter', $result['errors']);
    }

    public function testRejectsPasswordWithoutLowercase(): void
    {
        $result = $this->validator->validate('ABCDEFG1!');
        $this->assertFalse($result['valid']);
        $this->assertContains('Password must contain a lowercase letter', $result['errors']);
    }

    public function testRejectsPasswordWithoutNumber(): void
    {
        $result = $this->validator->validate('Abcdefgh!');
        $this->assertFalse($result['valid']);
        $this->assertContains('Password must contain a number', $result['errors']);
    }

    public function testAcceptsStrongPassword(): void
    {
        $result = $this->validator->validate('MyStr0ng!Pass');
        $this->assertTrue($result['valid']);
        $this->assertEmpty($result['errors']);
    }

    public function testReturnsMultipleErrors(): void
    {
        $result = $this->validator->validate('abc');
        $this->assertFalse($result['valid']);
        $this->assertGreaterThan(1, count($result['errors']));
    }
}
