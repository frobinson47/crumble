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
        $stmt = $this->db->prepare('SELECT id, username, password_hash, role, created_at FROM users WHERE username = ?');
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
}
