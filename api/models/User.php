<?php

require_once __DIR__ . '/Database.php';

class User {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Find a user by ID. Never returns password_hash.
     */
    public function findById(int $id): ?array {
        $stmt = $this->db->prepare('SELECT id, username, role, created_at FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    /**
     * Find a user by username. Includes password_hash for verification.
     */
    public function findByUsername(string $username): ?array {
        $stmt = $this->db->prepare('SELECT id, username, password_hash, role, failed_attempts, locked_until, created_at FROM users WHERE username = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    /**
     * Verify a password against the stored hash.
     */
    public function verifyPassword(string $password, string $hash): bool {
        return password_verify($password, $hash);
    }

    /**
     * Get all users (without password hashes).
     */
    public function getAll(): array {
        $stmt = $this->db->query('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
        return $stmt->fetchAll();
    }

    /**
     * Create a new user.
     */
    public function create(string $username, string $password, string $role = 'member'): array {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
        $stmt->execute([$username, $hash, $role]);

        $id = (int) $this->db->lastInsertId();
        return $this->findById($id);
    }

    /**
     * Reset a user's password.
     */
    public function resetPassword(int $id, string $newPassword): bool {
        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $stmt->execute([$hash, $id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Delete a user by ID.
     */
    public function delete(int $id): bool {
        $stmt = $this->db->prepare('DELETE FROM users WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function recordFailedAttempt(int $id): void
    {
        $stmt = $this->db->prepare('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?');
        $stmt->execute([$id]);

        $stmt = $this->db->prepare('UPDATE users SET locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ? AND failed_attempts >= 5');
        $stmt->execute([$id]);
    }

    public function resetFailedAttempts(int $id): void
    {
        $stmt = $this->db->prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?');
        $stmt->execute([$id]);
    }

    public function isLocked(int $id): bool
    {
        $stmt = $this->db->prepare('SELECT locked_until FROM users WHERE id = ? AND locked_until IS NOT NULL AND locked_until > NOW()');
        $stmt->execute([$id]);
        return (bool) $stmt->fetch();
    }
}
