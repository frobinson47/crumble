<?php

require_once __DIR__ . '/LoggerService.php';

/**
 * Open Food Facts API client.
 * Free, crowdsourced database of packaged food products.
 * No API key required.
 */
class OpenFoodFactsClient
{
    private const BASE_URL = 'https://world.openfoodfacts.org';

    /**
     * Look up a product by barcode/UPC.
     */
    public function getByBarcode(string $barcode): ?array
    {
        $data = $this->fetch("/api/v2/product/{$barcode}.json");
        if (!$data || ($data['status'] ?? 0) !== 1) {
            return null;
        }

        return $this->normalizeProduct($data['product'] ?? []);
    }

    /**
     * Search for products by name.
     */
    public function search(string $query, int $limit = 10): array
    {
        $params = http_build_query([
            'search_terms' => $query,
            'search_simple' => 1,
            'action' => 'process',
            'json' => 1,
            'page_size' => $limit,
        ]);

        $data = $this->fetch("/cgi/search.pl?{$params}");
        if (!$data || empty($data['products'])) {
            return [];
        }

        return array_map([$this, 'normalizeProduct'], $data['products']);
    }

    /**
     * Normalize an Open Food Facts product to a simple structure.
     */
    private function normalizeProduct(array $product): array
    {
        $nutriments = $product['nutriments'] ?? [];

        return [
            'barcode' => $product['code'] ?? '',
            'name' => $product['product_name'] ?? $product['product_name_en'] ?? '',
            'brand' => $product['brands'] ?? '',
            'quantity' => $product['quantity'] ?? '',
            'categories' => $product['categories'] ?? '',
            'allergens' => $product['allergens'] ?? '',
            'image_url' => $product['image_front_url'] ?? $product['image_url'] ?? '',
            'nutriscore' => $product['nutriscore_grade'] ?? null,
            'nutrition' => [
                'calories_per_100g' => $this->numOrNull($nutriments, 'energy-kcal_100g'),
                'protein_per_100g' => $this->numOrNull($nutriments, 'proteins_100g'),
                'carbs_per_100g' => $this->numOrNull($nutriments, 'carbohydrates_100g'),
                'fat_per_100g' => $this->numOrNull($nutriments, 'fat_100g'),
                'fiber_per_100g' => $this->numOrNull($nutriments, 'fiber_100g'),
                'sugar_per_100g' => $this->numOrNull($nutriments, 'sugars_100g'),
                'sodium_per_100g' => $this->numOrNull($nutriments, 'sodium_100g'),
                'salt_per_100g' => $this->numOrNull($nutriments, 'salt_100g'),
            ],
        ];
    }

    /**
     * Extract a numeric value or return null.
     */
    private function numOrNull(array $data, string $key): ?float
    {
        if (!isset($data[$key]) || $data[$key] === '') return null;
        return round((float) $data[$key], 1);
    }

    /**
     * Fetch from Open Food Facts API.
     */
    private function fetch(string $endpoint): ?array
    {
        $url = self::BASE_URL . $endpoint;
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => 'Cookslate/1.0 (https://cookslate.app)',
        ]);

        $caBundle = function_exists('getCaBundlePath') ? getCaBundlePath() : null;
        if ($caBundle) {
            curl_setopt($ch, CURLOPT_CAINFO, $caBundle);
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || $response === false) {
            LoggerService::channel('openfoodfacts')->error('Open Food Facts API request failed', ['http_code' => $httpCode, 'endpoint' => $endpoint]);
            return null;
        }

        return json_decode($response, true);
    }
}
