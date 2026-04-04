<?php

/**
 * TheMealDB API client.
 * Free API for recipe discovery and inspiration.
 * Docs: https://www.themealdb.com/api.php
 */
class MealDbClient
{
    private const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

    /**
     * Search meals by name.
     */
    public function search(string $query): array
    {
        $data = $this->fetch('/search.php?s=' . urlencode($query));
        return $this->normalizeMeals($data['meals'] ?? []);
    }

    /**
     * Get a random meal.
     */
    public function random(): ?array
    {
        $data = $this->fetch('/random.php');
        $meals = $this->normalizeMeals($data['meals'] ?? []);
        return $meals[0] ?? null;
    }

    /**
     * Filter by category (e.g., "Seafood", "Dessert").
     */
    public function byCategory(string $category): array
    {
        $data = $this->fetch('/filter.php?c=' . urlencode($category));
        return $this->normalizeFiltered($data['meals'] ?? []);
    }

    /**
     * Filter by area/cuisine (e.g., "Italian", "Mexican").
     */
    public function byArea(string $area): array
    {
        $data = $this->fetch('/filter.php?a=' . urlencode($area));
        return $this->normalizeFiltered($data['meals'] ?? []);
    }

    /**
     * Get full meal details by TheMealDB ID.
     */
    public function getById(string $id): ?array
    {
        $data = $this->fetch('/lookup.php?i=' . urlencode($id));
        $meals = $this->normalizeMeals($data['meals'] ?? []);
        return $meals[0] ?? null;
    }

    /**
     * List all categories.
     */
    public function categories(): array
    {
        $data = $this->fetch('/categories.php');
        return array_map(function ($cat) {
            return [
                'name' => $cat['strCategory'],
                'image' => $cat['strCategoryThumb'] ?? null,
                'description' => $cat['strCategoryDescription'] ?? '',
            ];
        }, $data['categories'] ?? []);
    }

    /**
     * List all areas/cuisines.
     */
    public function areas(): array
    {
        $data = $this->fetch('/list.php?a=list');
        return array_map(fn($a) => $a['strArea'], $data['meals'] ?? []);
    }

    /**
     * Convert a TheMealDB meal to Cookslate recipe format for import.
     */
    public function toRecipeFormat(array $meal): array
    {
        return [
            'title' => $meal['title'],
            'description' => $meal['area'] ? "A {$meal['area']} dish" : '',
            'source_url' => $meal['source'] ?? '',
            'source_image_url' => $meal['image'] ?? '',
            'servings' => 4,
            'instructions' => $meal['instructions'] ?? [],
            'ingredients' => $meal['ingredients'] ?? [],
            'tags' => array_filter(array_merge(
                $meal['tags'] ?? [],
                $meal['category'] ? [$meal['category']] : [],
                $meal['area'] ? [$meal['area']] : []
            )),
        ];
    }

    /**
     * Normalize full meal objects from TheMealDB format.
     */
    private function normalizeMeals(?array $meals): array
    {
        if (!$meals) return [];

        return array_map(function ($m) {
            // Extract ingredients (TheMealDB uses strIngredient1-20 / strMeasure1-20)
            $ingredients = [];
            for ($i = 1; $i <= 20; $i++) {
                $name = trim($m["strIngredient{$i}"] ?? '');
                $measure = trim($m["strMeasure{$i}"] ?? '');
                if (!empty($name)) {
                    $ingredients[] = [
                        'name' => $name,
                        'amount' => $this->extractAmount($measure),
                        'unit' => $this->extractUnit($measure),
                    ];
                }
            }

            // Parse instructions into steps
            $rawInstructions = $m['strInstructions'] ?? '';
            $steps = array_filter(array_map('trim', preg_split('/\r?\n/', $rawInstructions)));
            // Remove empty lines and step numbers
            $steps = array_values(array_filter($steps, fn($s) => strlen($s) > 5));

            // Parse tags
            $tags = [];
            if (!empty($m['strTags'])) {
                $tags = array_map('trim', explode(',', $m['strTags']));
            }

            return [
                'mealdb_id' => $m['idMeal'],
                'title' => $m['strMeal'] ?? '',
                'category' => $m['strCategory'] ?? '',
                'area' => $m['strArea'] ?? '',
                'image' => $m['strMealThumb'] ?? '',
                'source' => $m['strSource'] ?? '',
                'youtube' => $m['strYoutube'] ?? '',
                'tags' => $tags,
                'ingredients' => $ingredients,
                'instructions' => $steps,
            ];
        }, $meals);
    }

    /**
     * Normalize filtered results (only have id, name, image).
     */
    private function normalizeFiltered(?array $meals): array
    {
        if (!$meals) return [];
        return array_map(fn($m) => [
            'mealdb_id' => $m['idMeal'],
            'title' => $m['strMeal'] ?? '',
            'image' => $m['strMealThumb'] ?? '',
        ], $meals);
    }

    /**
     * Extract numeric amount from a measure string like "1/2 cup".
     */
    private function extractAmount(string $measure): string
    {
        if (preg_match('/^([\d\/\.\s]+)/', $measure, $m)) {
            return trim($m[1]);
        }
        return '';
    }

    /**
     * Extract unit from a measure string like "1/2 cup".
     */
    private function extractUnit(string $measure): string
    {
        $cleaned = preg_replace('/^[\d\/\.\s]+/', '', $measure);
        return trim($cleaned ?? '');
    }

    /**
     * Fetch from TheMealDB API.
     */
    private function fetch(string $endpoint): array
    {
        $url = self::BASE_URL . $endpoint;
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
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
            return [];
        }

        return json_decode($response, true) ?: [];
    }
}
