<?php

require_once __DIR__ . '/LoggerService.php';

/**
 * Edamam Nutrition Analysis API client.
 * Paste a full ingredient list → get accurate total nutrition.
 * Requires APP_ID + APP_KEY ($29/month — optional premium integration).
 * Docs: https://developer.edamam.com/edamam-nutrition-api
 */
class EdamamClient
{
    private string $appId;
    private string $appKey;
    private const BASE_URL = 'https://api.edamam.com/api/nutrition-details';

    public function __construct(string $appId, string $appKey)
    {
        $this->appId = $appId;
        $this->appKey = $appKey;
    }

    /**
     * Check if Edamam is configured.
     */
    public static function isConfigured(): bool
    {
        return !empty(env('EDAMAM_APP_ID', '')) && !empty(env('EDAMAM_APP_KEY', ''));
    }

    /**
     * Analyze a recipe's full ingredient list for nutrition.
     * Returns total and per-serving nutrition.
     *
     * @param string $title Recipe title
     * @param array $ingredients Array of ingredient strings (e.g., "1 cup diced chicken breast")
     * @param int|null $servings Number of servings
     * @return array|null Nutrition data or null on failure
     */
    public function analyzeRecipe(string $title, array $ingredients, ?int $servings = null): ?array
    {
        $url = self::BASE_URL . '?' . http_build_query([
            'app_id' => $this->appId,
            'app_key' => $this->appKey,
        ]);

        $body = json_encode([
            'title' => $title,
            'ingr' => $ingredients,
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $caBundle = function_exists('getCaBundlePath') ? getCaBundlePath() : null;
        if ($caBundle) {
            curl_setopt($ch, CURLOPT_CAINFO, $caBundle);
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($httpCode !== 200 || $response === false) {
            LoggerService::channel('edamam')->error('Edamam API request failed', ['http_code' => $httpCode, 'curl_error' => $curlError, 'title' => $title]);
            return null;
        }

        $data = json_decode($response, true);
        if (!$data || empty($data['totalNutrients'])) {
            LoggerService::channel('edamam')->warning('Edamam returned empty nutrition data', ['title' => $title]);
            return null;
        }

        $total = $this->extractNutrients($data['totalNutrients']);

        $perServing = null;
        if ($servings && $servings > 0) {
            $perServing = [
                'calories' => round($total['calories'] / $servings),
                'protein' => round($total['protein'] / $servings, 1),
                'carbs' => round($total['carbs'] / $servings, 1),
                'fat' => round($total['fat'] / $servings, 1),
                'fiber' => round($total['fiber'] / $servings, 1),
                'sugar' => round($total['sugar'] / $servings, 1),
            ];
        }

        return [
            'total' => $total,
            'per_serving' => $perServing,
            'servings' => $servings,
            'source' => 'edamam',
            'diet_labels' => $data['dietLabels'] ?? [],
            'health_labels' => $data['healthLabels'] ?? [],
            'cautions' => $data['cautions'] ?? [],
        ];
    }

    /**
     * Extract key nutrients from Edamam's totalNutrients object.
     */
    private function extractNutrients(array $nutrients): array
    {
        return [
            'calories' => round($this->nutrientValue($nutrients, 'ENERC_KCAL')),
            'protein' => round($this->nutrientValue($nutrients, 'PROCNT'), 1),
            'carbs' => round($this->nutrientValue($nutrients, 'CHOCDF'), 1),
            'fat' => round($this->nutrientValue($nutrients, 'FAT'), 1),
            'fiber' => round($this->nutrientValue($nutrients, 'FIBTG'), 1),
            'sugar' => round($this->nutrientValue($nutrients, 'SUGAR'), 1),
        ];
    }

    private function nutrientValue(array $nutrients, string $key): float
    {
        return (float) ($nutrients[$key]['quantity'] ?? 0);
    }
}
