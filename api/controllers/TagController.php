<?php

require_once __DIR__ . '/../models/Tag.php';

class TagController {

    /**
     * GET /tags
     * Returns all tags with recipe counts, ordered alphabetically.
     */
    public function list(): array {
        $tagModel = new Tag();
        return $tagModel->getAllWithCounts();
    }
}
