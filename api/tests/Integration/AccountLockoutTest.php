<?php

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;

class AccountLockoutTest extends TestCase
{
    private \PDO $db;
    private \User $userModel;

    protected function setUp(): void
    {
        require_once __DIR__ . '/../../models/Database.php';
        require_once __DIR__ . '/../../models/User.php';

        $this->db = \Database::getInstance();
        $this->userModel = new \User();

        // Create a test user
        $this->db->exec("DELETE FROM users WHERE username = 'locktest'");
        $hash = password_hash('Correct1!', PASSWORD_DEFAULT);
        $this->db->prepare("INSERT INTO users (username, password_hash, role) VALUES ('locktest', ?, 'member')")
            ->execute([$hash]);
    }

    protected function tearDown(): void
    {
        $this->db->exec("DELETE FROM users WHERE username = 'locktest'");
    }

    public function testRecordsFailedAttempt(): void
    {
        $user = $this->userModel->findByUsername('locktest');
        $this->userModel->recordFailedAttempt($user['id']);

        $updated = $this->userModel->findByUsername('locktest');
        $this->assertEquals(1, $updated['failed_attempts']);
    }

    public function testLocksAccountAfterFiveFailures(): void
    {
        $user = $this->userModel->findByUsername('locktest');
        for ($i = 0; $i < 5; $i++) {
            $this->userModel->recordFailedAttempt($user['id']);
        }

        $this->assertTrue($this->userModel->isLocked($user['id']));
    }

    public function testResetFailedAttemptsOnSuccess(): void
    {
        $user = $this->userModel->findByUsername('locktest');
        $this->userModel->recordFailedAttempt($user['id']);
        $this->userModel->recordFailedAttempt($user['id']);
        $this->userModel->resetFailedAttempts($user['id']);

        $updated = $this->userModel->findByUsername('locktest');
        $this->assertEquals(0, $updated['failed_attempts']);
    }

    public function testLockedAccountUnlocksAfterExpiry(): void
    {
        $user = $this->userModel->findByUsername('locktest');
        // Set locked_until to 1 second ago
        $this->db->prepare("UPDATE users SET failed_attempts = 5, locked_until = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE id = ?")
            ->execute([$user['id']]);

        $this->assertFalse($this->userModel->isLocked($user['id']));
    }
}
