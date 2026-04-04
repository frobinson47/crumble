<?php

require_once __DIR__ . '/../models/Database.php';

/**
 * Analyzes recipes for cost estimates and nutrition aggregation.
 * Converts recipe amounts to approximate grams for accurate nutrition calculation.
 */
class RecipeAnalyzer
{
    private PDO $db;

    /**
     * Approximate grams per volume unit (average across common ingredients).
     * These are rough averages — flour is lighter, sugar is heavier, liquids are ~1g/ml.
     */
    private const VOLUME_TO_GRAMS = [
        'tsp' => 5, 'teaspoon' => 5, 'teaspoons' => 5,
        'tbsp' => 15, 'tablespoon' => 15, 'tablespoons' => 15,
        'cup' => 140, 'cups' => 140,  // average: flour=125, sugar=200, liquid=237
        'ml' => 1, 'L' => 1000,
        'pint' => 473, 'quart' => 946, 'gallon' => 3785,
    ];

    private const WEIGHT_TO_GRAMS = [
        'g' => 1, 'gram' => 1, 'grams' => 1,
        'kg' => 1000,
        'oz' => 28.35, 'ounce' => 28.35, 'ounces' => 28.35,
        'lb' => 453.6, 'lbs' => 453.6, 'pound' => 453.6, 'pounds' => 453.6,
    ];

    /**
     * Approximate grams for count-based ingredients (no unit).
     */
    private const COUNT_GRAMS = [
        'egg' => 50, 'eggs' => 50,
        'clove' => 5, 'cloves' => 5,
        'slice' => 30, 'slices' => 30,
        'piece' => 100, 'pieces' => 100,
        'sprig' => 2, 'sprigs' => 2,
        'bunch' => 100,
        'head' => 50,
        'can' => 400,
        'stick' => 113, // butter stick
        'pinch' => 0.5,
        'dash' => 1,
    ];

    /**
     * Default grams when we have a number but no recognizable unit.
     * Depends on ingredient category.
     */
    private const DEFAULT_GRAMS_BY_CATEGORY = [
        'Produce' => 150,
        'Meat & Seafood' => 200,
        'Dairy & Eggs' => 100,
        'Spices & Seasonings' => 3,
        'Condiments & Sauces' => 15,
        'Oils & Vinegars' => 14,
        'Baking' => 50,
        'Pantry' => 100,
        'Pasta & Grains' => 100,
        'Canned Goods' => 400,
        'Bakery' => 60,
    ];

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Analyze a recipe's ingredients for cost and nutrition.
     */
    public function analyze(array $ingredients, ?int $servings = null): array
    {
        $totalCost = 0;
        $totalCalories = 0;
        $totalProtein = 0;
        $totalCarbs = 0;
        $totalFat = 0;
        $totalFiber = 0;
        $matched = 0;
        $unmatched = [];
        $breakdown = [];

        foreach ($ingredients as $ing) {
            $name = strtolower(trim($ing['name'] ?? ''));
            if (empty($name)) continue;

            $data = $this->findIngredientData($name);
            if (!$data) {
                $unmatched[] = $name;
                continue;
            }

            $matched++;
            $amount = $this->parseAmount($ing['amount'] ?? '');
            $unit = strtolower(trim($ing['unit'] ?? ''));
            $grams = $this->estimateGrams($amount, $unit, $name, $data['category'] ?? '');

            $entry = [
                'name' => $ing['name'],
                'category' => $data['category'],
                'grams' => round($grams),
            ];

            if ($data['avg_price'] !== null) {
                $entry['price'] = (float) $data['avg_price'];
                $entry['price_unit'] = $data['price_unit'];
                $totalCost += $entry['price'];
            }

            if ($data['calories_per_100g'] !== null && $grams > 0) {
                $factor = $grams / 100;
                $entry['calories'] = round((float) $data['calories_per_100g'] * $factor);
                $entry['protein'] = round((float) $data['protein_per_100g'] * $factor, 1);
                $entry['carbs'] = round((float) $data['carbs_per_100g'] * $factor, 1);
                $entry['fat'] = round((float) $data['fat_per_100g'] * $factor, 1);
                $entry['fiber'] = round((float) $data['fiber_per_100g'] * $factor, 1);

                $totalCalories += $entry['calories'];
                $totalProtein += $entry['protein'];
                $totalCarbs += $entry['carbs'];
                $totalFat += $entry['fat'];
                $totalFiber += $entry['fiber'];
            }

            $breakdown[] = $entry;
        }

        $result = [
            'cost' => [
                'total' => round($totalCost, 2),
                'per_serving' => $servings ? round($totalCost / $servings, 2) : null,
                'currency' => 'USD',
            ],
            'nutrition' => [
                'calories' => round($totalCalories),
                'protein' => round($totalProtein, 1),
                'carbs' => round($totalCarbs, 1),
                'fat' => round($totalFat, 1),
                'fiber' => round($totalFiber, 1),
                'per_serving' => $servings ? [
                    'calories' => round($totalCalories / $servings),
                    'protein' => round($totalProtein / $servings, 1),
                    'carbs' => round($totalCarbs / $servings, 1),
                    'fat' => round($totalFat / $servings, 1),
                    'fiber' => round($totalFiber / $servings, 1),
                ] : null,
            ],
            'coverage' => [
                'matched' => $matched,
                'total' => count($ingredients),
                'percent' => count($ingredients) > 0 ? round(($matched / count($ingredients)) * 100) : 0,
                'unmatched' => $unmatched,
            ],
            'breakdown' => $breakdown,
        ];

        return $result;
    }

    /**
     * Estimate grams from amount + unit.
     */
    private function estimateGrams(float $amount, string $unit, string $name, string $category): float
    {
        if ($amount <= 0) {
            // "to taste", "pinch", etc. — negligible
            return 3;
        }

        // Weight units — direct conversion
        if (isset(self::WEIGHT_TO_GRAMS[$unit])) {
            return $amount * self::WEIGHT_TO_GRAMS[$unit];
        }

        // Volume units — approximate conversion
        if (isset(self::VOLUME_TO_GRAMS[$unit])) {
            return $amount * self::VOLUME_TO_GRAMS[$unit];
        }

        // Count-based units (pieces, cloves, etc.)
        if (isset(self::COUNT_GRAMS[$unit])) {
            return $amount * self::COUNT_GRAMS[$unit];
        }

        // No unit — use count estimates based on ingredient name
        foreach (self::COUNT_GRAMS as $countUnit => $grams) {
            if (str_contains($name, $countUnit)) {
                return $amount * $grams;
            }
        }

        // Bare number — estimate by category
        $defaultGrams = self::DEFAULT_GRAMS_BY_CATEGORY[$category] ?? 100;
        return $amount * $defaultGrams;
    }

    /**
     * Parse an amount string into a float (handles fractions like "1/2").
     */
    private function parseAmount(string $amount): float
    {
        $amount = trim($amount);
        if (empty($amount)) return 0;

        // Handle fractions: "1/2", "3/4"
        if (preg_match('/^(\d+)\s*\/\s*(\d+)$/', $amount, $m)) {
            return (float) $m[1] / (float) $m[2];
        }

        // Handle mixed: "1 1/2"
        if (preg_match('/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/', $amount, $m)) {
            return (float) $m[1] + ((float) $m[2] / (float) $m[3]);
        }

        return (float) $amount;
    }

    /**
     * Find ingredient data by fuzzy matching the name.
     */
    private function findIngredientData(string $name): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM ingredient_data WHERE LOWER(name) = ?');
        $stmt->execute([$name]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($row) return $row;

        $stmt = $this->db->prepare('SELECT * FROM ingredient_data WHERE ? LIKE CONCAT(\'%\', LOWER(name), \'%\') ORDER BY LENGTH(name) DESC LIMIT 1');
        $stmt->execute([$name]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($row) return $row;

        $stmt = $this->db->prepare('SELECT * FROM ingredient_data WHERE LOWER(name) LIKE CONCAT(\'%\', ?, \'%\') ORDER BY LENGTH(name) ASC LIMIT 1');
        $stmt->execute([$name]);
        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }
}
