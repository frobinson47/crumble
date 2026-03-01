<?php

require_once __DIR__ . '/Database.php';

class Tag {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Get all tags with recipe counts, ordered alphabetically.
     */
    public function getAllWithCounts(): array {
        $sql = '
            SELECT t.id, t.name, COUNT(rt.recipe_id) AS recipe_count
            FROM tags t
            LEFT JOIN recipe_tags rt ON t.id = rt.tag_id
            GROUP BY t.id, t.name
            ORDER BY t.name ASC
        ';
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll();
    }

    /**
     * Find a tag by name (case-insensitive).
     */
    public function findByName(string $name): ?array {
        $stmt = $this->db->prepare('SELECT id, name FROM tags WHERE name = ?');
        $stmt->execute([$name]);
        $tag = $stmt->fetch();
        return $tag ?: null;
    }

    /**
     * Find or create a tag by name. Returns the tag record.
     */
    public function findOrCreate(string $name): array {
        $name = trim($name);
        $existing = $this->findByName($name);
        if ($existing) {
            return $existing;
        }

        $stmt = $this->db->prepare('INSERT INTO tags (name) VALUES (?)');
        $stmt->execute([$name]);
        return [
            'id' => (int) $this->db->lastInsertId(),
            'name' => $name,
        ];
    }

    /**
     * Get tags for a specific recipe.
     */
    public function getForRecipe(int $recipeId): array {
        $sql = '
            SELECT t.id, t.name
            FROM tags t
            INNER JOIN recipe_tags rt ON t.id = rt.tag_id
            WHERE rt.recipe_id = ?
            ORDER BY t.name ASC
        ';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$recipeId]);
        return $stmt->fetchAll();
    }

    /**
     * Sync tags for a recipe: remove old associations, add new ones.
     */
    public function syncForRecipe(int $recipeId, array $tagNames): array {
        // Remove existing associations
        $stmt = $this->db->prepare('DELETE FROM recipe_tags WHERE recipe_id = ?');
        $stmt->execute([$recipeId]);

        $tags = [];
        foreach ($tagNames as $name) {
            $name = trim($name);
            if ($name === '') continue;

            $tag = $this->findOrCreate($name);
            $tags[] = $tag;

            $stmt = $this->db->prepare('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)');
            $stmt->execute([$recipeId, $tag['id']]);
        }

        return $tags;
    }
}
