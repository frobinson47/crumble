<?php

require_once __DIR__ . '/LoggerService.php';

/**
 * USDA FoodData Central API client.
 * Searches for foods and returns nutrition data per 100g.
 * API docs: https://fdc.nal.usda.gov/api-guide
 */
class UsdaLookup
{
    private string $apiKey;
    private const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

    public function __construct(string $apiKey)
    {
        $this->apiKey = $apiKey;
    }

    /**
     * Search for foods by name. Returns top matches with basic nutrition.
     */
    public function search(string $query, int $limit = 5): array
    {
        $url = self::BASE_URL . '/foods/search?' . http_build_query([
            'api_key' => $this->apiKey,
            'query' => $query,
            'pageSize' => $limit,
        ]);

        $response = $this->fetch($url);
        if (!$response || empty($response['foods'])) {
            return [];
        }

        $results = [];
        foreach ($response['foods'] as $food) {
            $nutrients = $this->extractNutrients($food['foodNutrients'] ?? []);
            $results[] = [
                'fdcId' => $food['fdcId'],
                'name' => $food['description'] ?? '',
                'category' => $food['foodCategory'] ?? '',
                'brand' => $food['brandName'] ?? null,
                'calories_per_100g' => $nutrients['calories'],
                'protein_per_100g' => $nutrients['protein'],
                'carbs_per_100g' => $nutrients['carbs'],
                'fat_per_100g' => $nutrients['fat'],
                'fiber_per_100g' => $nutrients['fiber'],
                'sugar_per_100g' => $nutrients['sugar'],
            ];
        }

        return $results;
    }

    /**
     * Extract key nutrients from USDA nutrient array.
     * USDA nutrient IDs: 1008=Energy(kcal), 1003=Protein, 1005=Carbs,
     * 1004=Fat, 1079=Fiber, 2000=Sugar
     */
    private function extractNutrients(array $nutrients): array
    {
        $map = [
            'calories' => [1008],
            'protein' => [1003],
            'carbs' => [1005],
            'fat' => [1004],
            'fiber' => [1079],
            'sugar' => [2000],
        ];

        $result = array_fill_keys(array_keys($map), null);

        foreach ($nutrients as $n) {
            $id = $n['nutrientId'] ?? ($n['number'] ?? null);
            $value = $n['value'] ?? null;

            if ($id === null || $value === null) continue;

            foreach ($map as $key => $ids) {
                if (in_array((int) $id, $ids)) {
                    $result[$key] = round((float) $value, 1);
                }
            }
        }

        return $result;
    }

    /**
     * Fetch URL with cURL.
     */
    private function fetch(string $url): ?array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $caBundle = function_exists('getCaBundlePath') ? getCaBundlePath() : null;
        if ($caBundle) {
            curl_setopt($ch, CURLOPT_CAINFO, $caBundle);
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || $response === false) {
            LoggerService::channel('usda')->error('USDA API request failed', ['http_code' => $httpCode]);
            return null;
        }

        return json_decode($response, true);
    }
}
