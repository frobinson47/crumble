<?php

/**
 * Pagination helper for raw SQL queries.
 * Provides LIMIT/OFFSET calculation and standardized response format.
 */
class PaginationHelper
{
    public const DEFAULT_PER_PAGE = 25;
    public const MAX_PER_PAGE = 100;

    /**
     * Parse pagination parameters from the request.
     */
    public static function fromRequest(int $defaultPerPage = self::DEFAULT_PER_PAGE): array
    {
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $perPage = max(1, min(self::MAX_PER_PAGE, (int) ($_GET['per_page'] ?? $defaultPerPage)));
        $offset = ($page - 1) * $perPage;

        return [
            'page' => $page,
            'per_page' => $perPage,
            'offset' => $offset,
        ];
    }

    /**
     * Build a paginated response envelope.
     */
    public static function response(array $items, int $total, int $page, int $perPage): array
    {
        return [
            'data' => $items,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => (int) ceil($total / max(1, $perPage)),
            ],
        ];
    }

    /**
     * Append LIMIT and OFFSET to a SQL query string.
     */
    public static function appendLimit(string $sql, int $limit, int $offset = 0): string
    {
        return $sql . " LIMIT {$limit} OFFSET {$offset}";
    }
}
