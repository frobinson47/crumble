<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use Monolog\Logger;

require_once __DIR__ . '/../../services/LoggerService.php';

class LoggerServiceTest extends TestCase
{
    public function testGetInstanceReturnsLogger(): void
    {
        $logger = \LoggerService::getInstance();
        $this->assertInstanceOf(Logger::class, $logger);
    }

    public function testGetInstanceReturnsSameInstance(): void
    {
        $a = \LoggerService::getInstance();
        $b = \LoggerService::getInstance();
        $this->assertSame($a, $b);
    }

    public function testChannelReturnsLoggerWithName(): void
    {
        $logger = \LoggerService::channel('auth');
        $this->assertInstanceOf(Logger::class, $logger);
        $this->assertEquals('auth', $logger->getName());
    }

    public function testChannelReturnsDifferentNames(): void
    {
        $auth = \LoggerService::channel('auth');
        $recipe = \LoggerService::channel('recipe');
        $this->assertNotEquals($auth->getName(), $recipe->getName());
    }
}
