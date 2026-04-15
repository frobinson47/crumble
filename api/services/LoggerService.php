<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Monolog\Logger;
use Monolog\Handler\RotatingFileHandler;
use Monolog\Formatter\LineFormatter;

/**
 * Centralized logging service using Monolog.
 * Provides a shared logger instance for the entire application.
 */
class LoggerService
{
    private static ?Logger $instance = null;

    public static function getInstance(): Logger
    {
        if (self::$instance === null) {
            self::$instance = self::createLogger();
        }
        return self::$instance;
    }

    private static function createLogger(): Logger
    {
        $logger = new Logger('cookslate');

        // Log directory — use env or default to api/logs/
        $logDir = __DIR__ . '/../logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }

        // Rotate daily, keep 30 days of logs
        $handler = new RotatingFileHandler(
            $logDir . '/app.log',
            30,
            Logger::DEBUG
        );

        // Consistent format: [timestamp] channel.LEVEL: message {context}
        $formatter = new LineFormatter(
            "[%datetime%] %channel%.%level_name%: %message% %context% %extra%\n",
            'Y-m-d H:i:s',
            true,
            true
        );
        $handler->setFormatter($formatter);
        $logger->pushHandler($handler);

        return $logger;
    }

    /**
     * Convenience: get a logger for a specific channel (e.g., 'auth', 'recipe').
     */
    public static function channel(string $name): Logger
    {
        return self::getInstance()->withName($name);
    }
}
