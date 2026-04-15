<?php

require_once __DIR__ . '/Database.php';

class GroceryList {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Get all grocery lists for a user, with item counts.
     */
    public function getAllForUser(int $userId): array {
        $sql = '
            SELECT gl.id, gl.name, gl.created_at,
                   COUNT(gi.id) AS item_count,
                   SUM(CASE WHEN gi.checked = 1 THEN 1 ELSE 0 END) AS checked_count
            FROM grocery_lists gl
            LEFT JOIN grocery_items gi ON gl.id = gi.list_id
            WHERE gl.created_by = ?
            GROUP BY gl.id
            ORDER BY gl.created_at DESC
            LIMIT 200
        ';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    /**
     * Find a grocery list by ID.
     */
    public function findById(int $id): ?array {
        $stmt = $this->db->prepare('SELECT id, name, created_by, created_at FROM grocery_lists WHERE id = ?');
        $stmt->execute([$id]);
        $list = $stmt->fetch();
        return $list ?: null;
    }

    /**
     * Create a new grocery list.
     */
    public function create(string $name, int $userId): array {
        $stmt = $this->db->prepare('INSERT INTO grocery_lists (name, created_by) VALUES (?, ?)');
        $stmt->execute([$name, $userId]);
        $id = (int) $this->db->lastInsertId();
        return $this->findById($id);
    }

    /**
     * Update a grocery list name.
     */
    public function update(int $id, string $name): array {
        $stmt = $this->db->prepare('UPDATE grocery_lists SET name = ? WHERE id = ?');
        $stmt->execute([$name, $id]);
        return $this->findById($id);
    }

    /**
     * Delete a grocery list (cascades to items).
     */
    public function delete(int $id): bool {
        $stmt = $this->db->prepare('DELETE FROM grocery_lists WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Check if a user owns this list.
     */
    public function isOwner(int $listId, int $userId): bool {
        $stmt = $this->db->prepare('SELECT 1 FROM grocery_lists WHERE id = ? AND created_by = ?');
        $stmt->execute([$listId, $userId]);
        return (bool) $stmt->fetch();
    }
}
