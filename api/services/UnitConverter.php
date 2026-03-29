<?php

/**
 * Converts between compatible measurement units for grocery consolidation.
 * Only converts within the same system (volume↔volume, weight↔weight).
 * Does NOT convert between volume and weight (that requires ingredient density data).
 */
class UnitConverter {

    /**
     * Volume units → teaspoons (base unit for volume).
     */
    private const VOLUME_TO_TSP = [
        'tsp'    => 1,
        'tbsp'   => 3,
        'cup'    => 48,
        'pint'   => 96,
        'quart'  => 192,
        'gallon' => 768,
        'ml'     => 0.2029,
        'L'      => 202.9,
    ];

    /**
     * Weight units → grams (base unit for weight).
     */
    private const WEIGHT_TO_G = [
        'g'  => 1,
        'kg' => 1000,
        'oz' => 28.35,
        'lb' => 453.6,
    ];

    /**
     * Preferred display units, ordered from largest to smallest.
     * When consolidating, we pick the largest unit that gives an amount >= 1.
     */
    private const VOLUME_PREFERENCE = ['gallon', 'quart', 'cup', 'tbsp', 'tsp'];
    private const VOLUME_PREFERENCE_METRIC = ['L', 'ml'];
    private const WEIGHT_PREFERENCE = ['lb', 'oz'];
    private const WEIGHT_PREFERENCE_METRIC = ['kg', 'g'];

    /**
     * Check if two units can be converted between each other.
     */
    public static function canConvert(?string $from, ?string $to): bool {
        if ($from === null || $to === null) return false;
        $from = self::normalizeUnit($from);
        $to = self::normalizeUnit($to);
        return (isset(self::VOLUME_TO_TSP[$from]) && isset(self::VOLUME_TO_TSP[$to]))
            || (isset(self::WEIGHT_TO_G[$from]) && isset(self::WEIGHT_TO_G[$to]));
    }

    /**
     * Convert an amount from one unit to another.
     * Returns null if conversion is not possible.
     */
    public static function convert(float $amount, string $from, string $to): ?float {
        $from = self::normalizeUnit($from);
        $to = self::normalizeUnit($to);

        if (isset(self::VOLUME_TO_TSP[$from]) && isset(self::VOLUME_TO_TSP[$to])) {
            return $amount * self::VOLUME_TO_TSP[$from] / self::VOLUME_TO_TSP[$to];
        }

        if (isset(self::WEIGHT_TO_G[$from]) && isset(self::WEIGHT_TO_G[$to])) {
            return $amount * self::WEIGHT_TO_G[$from] / self::WEIGHT_TO_G[$to];
        }

        return null;
    }

    /**
     * Given a total amount in a base unit, pick the best display unit.
     * Prefers the unit system (imperial/metric) of the original ingredient.
     */
    public static function bestUnit(float $amountInBase, string $originalUnit, string $measureType): array {
        $originalUnit = self::normalizeUnit($originalUnit);
        $isMetric = in_array($originalUnit, ['ml', 'L', 'g', 'kg']);

        if ($measureType === 'volume') {
            $prefs = $isMetric ? self::VOLUME_PREFERENCE_METRIC : self::VOLUME_PREFERENCE;
            $table = self::VOLUME_TO_TSP;
        } else {
            $prefs = $isMetric ? self::WEIGHT_PREFERENCE_METRIC : self::WEIGHT_PREFERENCE;
            $table = self::WEIGHT_TO_G;
        }

        // Large units need >= 1 to avoid "0.63 quart"; smaller units allow fractions like "1/4 cup"
        $largeUnits = ['gallon', 'quart', 'tbsp', 'L', 'kg', 'lb'];

        foreach ($prefs as $unit) {
            $converted = $amountInBase / $table[$unit];
            $threshold = in_array($unit, $largeUnits) ? 1.0 : 0.25;
            if ($converted >= $threshold) {
                return ['amount' => $converted, 'unit' => $unit];
            }
        }

        // Fall back to smallest unit
        $smallest = end($prefs);
        return ['amount' => $amountInBase / $table[$smallest], 'unit' => $smallest];
    }

    /**
     * Get the measurement type for a unit: 'volume', 'weight', or null.
     */
    public static function getMeasureType(?string $unit): ?string {
        if ($unit === null) return null;
        $unit = self::normalizeUnit($unit);
        if (isset(self::VOLUME_TO_TSP[$unit])) return 'volume';
        if (isset(self::WEIGHT_TO_G[$unit])) return 'weight';
        return null;
    }

    /**
     * Unicode fraction characters → decimal values.
     */
    private const UNICODE_FRACTIONS = [
        '½' => 0.5, '⅓' => 0.333, '⅔' => 0.667, '¼' => 0.25, '¾' => 0.75,
        '⅕' => 0.2, '⅖' => 0.4, '⅗' => 0.6, '⅘' => 0.8,
        '⅙' => 0.167, '⅚' => 0.833, '⅛' => 0.125, '⅜' => 0.375, '⅝' => 0.625, '⅞' => 0.875,
    ];

    /**
     * Parse an amount string to a float.
     * Handles: "2", "0.5", "1/2", "1 1/2", "1½", "2-3" (averages ranges).
     */
    public static function parseAmount(?string $amount): ?float {
        if ($amount === null || trim($amount) === '') return null;
        $amount = trim($amount);

        // Replace unicode fractions
        foreach (self::UNICODE_FRACTIONS as $char => $val) {
            if (str_contains($amount, $char)) {
                $amount = str_replace($char, '', $amount);
                $base = trim($amount) !== '' ? (float) $amount : 0;
                return $base + $val;
            }
        }

        // Simple numeric
        if (is_numeric($amount)) return (float) $amount;

        // Range: "2-3" → average
        if (preg_match('/^(\S+)\s*-\s*(\S+)$/', $amount, $m)) {
            $low = self::parseAmount($m[1]);
            $high = self::parseAmount($m[2]);
            return ($low !== null && $high !== null) ? ($low + $high) / 2 : null;
        }

        // Mixed number: "1 1/2"
        if (preg_match('/^(\d+)\s+(\d+)\/(\d+)$/', $amount, $m)) {
            return (float) $m[1] + (float) $m[2] / (float) $m[3];
        }

        // Simple fraction: "3/4"
        if (preg_match('/^(\d+)\/(\d+)$/', $amount, $m)) {
            return (float) $m[1] / (float) $m[2];
        }

        return null;
    }

    /**
     * Format a float amount back to a readable string.
     * Prefers fractions for common values: 0.25 → "1/4", 0.5 → "1/2", etc.
     */
    public static function formatAmount(float $amount): string {
        $fractions = [
            0.125 => '1/8', 0.25 => '1/4', 0.333 => '1/3', 0.375 => '3/8',
            0.5 => '1/2', 0.625 => '5/8', 0.667 => '2/3', 0.75 => '3/4', 0.875 => '7/8',
        ];

        $whole = (int) floor($amount);
        $frac = round($amount - $whole, 3);

        if ($frac < 0.01) {
            return (string) $whole;
        }

        $fracStr = null;
        foreach ($fractions as $val => $str) {
            if (abs($frac - $val) < 0.02) {
                $fracStr = $str;
                break;
            }
        }

        if ($fracStr !== null) {
            return $whole > 0 ? "$whole $fracStr" : $fracStr;
        }

        return rtrim(rtrim(number_format($amount, 2), '0'), '.');
    }

    /**
     * Normalize unit aliases to canonical form.
     */
    private static function normalizeUnit(string $unit): string {
        $unit = strtolower(trim($unit));
        $aliases = [
            'cups' => 'cup', 'c' => 'cup',
            'tablespoon' => 'tbsp', 'tablespoons' => 'tbsp', 'tbs' => 'tbsp',
            'teaspoon' => 'tsp', 'teaspoons' => 'tsp',
            'ounce' => 'oz', 'ounces' => 'oz',
            'pound' => 'lb', 'pounds' => 'lb', 'lbs' => 'lb',
            'gram' => 'g', 'grams' => 'g',
            'kilogram' => 'kg', 'kilograms' => 'kg',
            'milliliter' => 'ml', 'milliliters' => 'ml',
            'liter' => 'L', 'liters' => 'L', 'l' => 'L',
            'pints' => 'pint', 'pt' => 'pint',
            'quarts' => 'quart', 'qt' => 'quart',
            'gallons' => 'gallon', 'gal' => 'gallon',
        ];
        return $aliases[$unit] ?? $unit;
    }
}
