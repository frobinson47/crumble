<?php

class IngredientParser {

    /**
     * Canonical unit => list of aliases (all lowercase).
     * The canonical form is always the first element.
     */
    private const UNITS = [
        'cup'       => ['cup', 'cups', 'c'],
        'tbsp'      => ['tbsp', 'tablespoon', 'tablespoons', 'tbs'],
        'tsp'       => ['tsp', 'teaspoon', 'teaspoons'],
        'oz'        => ['oz', 'ounce', 'ounces'],
        'lb'        => ['lb', 'pound', 'pounds', 'lbs'],
        'g'         => ['g', 'gram', 'grams'],
        'kg'        => ['kg', 'kilogram', 'kilograms'],
        'ml'        => ['ml', 'milliliter', 'milliliters'],
        'L'         => ['l', 'liter', 'liters'],
        'clove'     => ['clove', 'cloves'],
        'pinch'     => ['pinch', 'pinches'],
        'piece'     => ['piece', 'pieces', 'pcs'],
        'can'       => ['can', 'cans'],
        'bunch'     => ['bunch', 'bunches'],
        'sprig'     => ['sprig', 'sprigs'],
        'slice'     => ['slice', 'slices'],
        'stick'     => ['stick', 'sticks'],
        'head'      => ['head', 'heads'],
        'dash'      => ['dash', 'dashes'],
        'package'   => ['package', 'packages', 'pkg'],
        'bag'       => ['bag', 'bags'],
        'bottle'    => ['bottle', 'bottles'],
        'jar'       => ['jar', 'jars'],
        'handful'   => ['handful', 'handfuls'],
        'quart'     => ['quart', 'quarts', 'qt'],
        'pint'      => ['pint', 'pints', 'pt'],
        'gallon'    => ['gallon', 'gallons', 'gal'],
    ];

    /**
     * Reverse lookup: alias (lowercase) => canonical unit name.
     * Built once in the constructor.
     */
    private array $aliasToCanonical = [];

    public function __construct() {
        foreach (self::UNITS as $canonical => $aliases) {
            foreach ($aliases as $alias) {
                $this->aliasToCanonical[strtolower($alias)] = $canonical;
            }
        }
    }

    /**
     * Parse an ingredient string into structured parts.
     *
     * Examples:
     *   "2 cups all-purpose flour"   => {amount: "2", unit: "cup", name: "all-purpose flour"}
     *   "1 1/2 tsp salt"             => {amount: "1 1/2", unit: "tsp", name: "salt"}
     *   "salt and pepper to taste"   => {amount: null, unit: null, name: "salt and pepper to taste"}
     *   "2 (14 oz) cans tomatoes"    => {amount: "2", unit: "can", name: "(14 oz) tomatoes"}
     *
     * @param string $text Raw ingredient string
     * @return array{amount: ?string, unit: ?string, name: string}
     */
    public function parse(string $text): array {
        $text = trim($text);

        if ($text === '') {
            return ['amount' => null, 'unit' => null, 'name' => ''];
        }

        // Normalize unicode fractions to ASCII equivalents
        // Insert space before fraction when preceded by a digit (e.g., "1½" → "1 1/2")
        $unicodeFractions = [
            '½' => '1/2', '⅓' => '1/3', '⅔' => '2/3',
            '¼' => '1/4', '¾' => '3/4', '⅕' => '1/5',
            '⅖' => '2/5', '⅗' => '3/5', '⅘' => '4/5',
            '⅙' => '1/6', '⅚' => '5/6', '⅛' => '1/8',
            '⅜' => '3/8', '⅝' => '5/8', '⅞' => '7/8',
        ];
        $text = preg_replace_callback(
            '/(\d)([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/u',
            fn($m) => $m[1] . ' ' . $unicodeFractions[$m[2]],
            $text
        );
        $text = strtr($text, $unicodeFractions);

        // Normalize whitespace
        $text = preg_replace('/\s+/', ' ', $text);

        $amount = null;
        $unit = null;
        $remaining = $text;

        // --- Step 1: Extract amount ---
        // Pattern components:
        //   integer:       \d+
        //   decimal:       \d+\.\d+
        //   fraction:      \d+\/\d+
        //   mixed number:  \d+\s+\d+\/\d+  (e.g., "1 1/2")
        //   range:         any of above - any of above  (e.g., "2-3", "1/2-3/4")
        //
        // A single number part (no range):
        $numPart = '(?:\d+\s+\d+\/\d+|\d+\.\d+|\d+\/\d+|\d+)';
        // Full amount pattern: optional range
        $amountPattern = '/^(' . $numPart . '(?:\s*-\s*' . $numPart . ')?)\s*/';

        if (preg_match($amountPattern, $remaining, $m)) {
            $amount = trim($m[1]);
            $remaining = substr($remaining, strlen($m[0]));
        }

        // If no amount was extracted, return everything as name
        if ($amount === null) {
            return ['amount' => null, 'unit' => null, 'name' => $text];
        }

        $remaining = ltrim($remaining);

        // --- Step 2: Handle parenthetical units like "2 (14 oz) cans tomatoes" ---
        // Check if remaining starts with a parenthetical group followed by a unit word
        if (preg_match('/^\(([^)]*)\)\s+(\S+)(.*)/s', $remaining, $pm)) {
            $parenContent = $pm[1];
            $wordAfterParen = $pm[2];
            $restAfterUnit = $pm[3];

            // Strip trailing punctuation from the candidate unit word
            $cleanWord = rtrim($wordAfterParen, '.,;:');
            $canonical = $this->lookupUnit($cleanWord);

            if ($canonical !== null) {
                $unit = $canonical;
                $name = trim('(' . $parenContent . ') ' . ltrim($restAfterUnit));
                return [
                    'amount' => $amount,
                    'unit'   => $unit,
                    'name'   => $name,
                ];
            }
        }

        // --- Step 3: Check first word for a unit ---
        if ($remaining !== '') {
            // Split off first word
            if (preg_match('/^(\S+)(.*)$/s', $remaining, $wm)) {
                $firstWord = $wm[1];
                $afterUnit = $wm[2];

                // Strip trailing punctuation for unit matching
                $cleanWord = rtrim($firstWord, '.,;:');
                $canonical = $this->lookupUnit($cleanWord);

                if ($canonical !== null) {
                    $unit = $canonical;
                    $remaining = ltrim($afterUnit);
                } else {
                    // First word is not a unit, whole remaining is the name
                    $remaining = $remaining;
                }
            }
        }

        $name = trim($remaining);

        return [
            'amount' => $amount ?: null,
            'unit'   => $unit ?: null,
            'name'   => $name,
        ];
    }

    /**
     * Look up a word in the unit alias map.
     * Returns the canonical unit name or null if not a known unit.
     */
    private function lookupUnit(string $word): ?string {
        $lower = strtolower($word);
        return $this->aliasToCanonical[$lower] ?? null;
    }
}
