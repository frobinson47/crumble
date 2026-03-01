# Smart Ingredient Parsing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Parse ingredient strings like "2 cups all-purpose flour" into structured `{amount, unit, name}` during import, and provide a migration endpoint to fix existing recipes.

**Architecture:** A PHP `IngredientParser` service with a single `parse(string)` method that returns `{amount, unit, name}`. Integrated into `RecipeScraper` at the point where ingredients are mapped. A one-time admin endpoint re-parses existing unstructured ingredients.

**Tech Stack:** PHP (no external dependencies), MySQL

---

### Task 1: Create IngredientParser service

**Files:**
- Create: `api/services/IngredientParser.php`

**Step 1: Create the parser class with unit list and parse method**

```php
<?php

class IngredientParser {

    // Canonical unit => aliases (all lowercase)
    private const UNITS = [
        'cup' => ['cups', 'c'],
        'tbsp' => ['tablespoon', 'tablespoons', 'tbs', 'T'],
        'tsp' => ['teaspoon', 'teaspoons', 't'],
        'oz' => ['ounce', 'ounces'],
        'lb' => ['pound', 'pounds', 'lbs'],
        'g' => ['gram', 'grams'],
        'kg' => ['kilogram', 'kilograms'],
        'ml' => ['milliliter', 'milliliters'],
        'L' => ['liter', 'liters'],
        'clove' => ['cloves'],
        'pinch' => ['pinches'],
        'piece' => ['pieces', 'pcs'],
        'can' => ['cans'],
        'bunch' => ['bunches'],
        'sprig' => ['sprigs'],
        'slice' => ['slices'],
        'stick' => ['sticks'],
        'head' => ['heads'],
        'dash' => ['dashes'],
        'package' => ['packages', 'pkg'],
        'bag' => ['bags'],
        'bottle' => ['bottles'],
        'jar' => ['jars'],
        'handful' => ['handfuls'],
        'quart' => ['quarts', 'qt'],
        'pint' => ['pints', 'pt'],
        'gallon' => ['gallons', 'gal'],
    ];

    private array $unitLookup = [];

    public function __construct() {
        // Build reverse lookup: alias => canonical
        foreach (self::UNITS as $canonical => $aliases) {
            $this->unitLookup[strtolower($canonical)] = $canonical;
            foreach ($aliases as $alias) {
                $this->unitLookup[strtolower($alias)] = $canonical;
            }
        }
    }

    /**
     * Parse an ingredient string into structured components.
     *
     * @param string $text e.g. "1 1/2 cups all-purpose flour"
     * @return array {amount: ?string, unit: ?string, name: string}
     */
    public function parse(string $text): array {
        $text = trim($text);
        if ($text === '') {
            return ['amount' => null, 'unit' => null, 'name' => ''];
        }

        $result = ['amount' => null, 'unit' => null, 'name' => $text];

        // Pattern for amounts: integer, decimal, fraction, mixed number, or range
        // Examples: "2", "1.5", "1/2", "1 1/2", "2-3", "1/2-3/4"
        $amountPattern = '(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?(?:\s*-\s*(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?))?)';

        // Try to match a leading amount
        if (preg_match('/^' . $amountPattern . '\s+(.+)$/u', $text, $m)) {
            $result['amount'] = trim($m[1]);
            $remaining = trim($m[2]);

            // Try to match a unit as the first word of remaining text
            // Handle parenthetical units like "(14 oz)" after amount
            if (preg_match('/^\(([^)]+)\)\s+(.+)$/u', $remaining, $parenMatch)) {
                // e.g. "2 (14 oz) cans tomatoes" — skip the parenthetical, check next word
                $afterParen = trim($parenMatch[2]);
                $firstWord = $this->extractFirstWord($afterParen);
                $canonical = $this->matchUnit($firstWord);
                if ($canonical !== null) {
                    $result['unit'] = $canonical;
                    $result['name'] = '(' . $parenMatch[1] . ') ' . $this->removeFirstWord($afterParen);
                } else {
                    $result['name'] = $remaining;
                }
            } else {
                $firstWord = $this->extractFirstWord($remaining);
                $canonical = $this->matchUnit($firstWord);
                if ($canonical !== null) {
                    $result['unit'] = $canonical;
                    $result['name'] = $this->removeFirstWord($remaining);
                } else {
                    $result['name'] = $remaining;
                }
            }
        }

        // Clean up the name
        $result['name'] = trim($result['name']);

        // Normalize empty strings to null for amount/unit
        if ($result['amount'] === '') $result['amount'] = null;
        if ($result['unit'] === '') $result['unit'] = null;

        return $result;
    }

    private function extractFirstWord(string $text): string {
        $parts = preg_split('/\s+/', $text, 2);
        return $parts[0] ?? '';
    }

    private function removeFirstWord(string $text): string {
        $parts = preg_split('/\s+/', $text, 2);
        return $parts[1] ?? '';
    }

    private function matchUnit(string $word): ?string {
        // Strip trailing punctuation (commas, periods)
        $clean = rtrim($word, '.,;:');
        $lower = strtolower($clean);
        return $this->unitLookup[$lower] ?? null;
    }
}
```

**Step 2: Verify the file is syntactically valid**

Run: `php -l api/services/IngredientParser.php`
Expected: `No syntax errors detected`

**Step 3: Commit**

```bash
git add api/services/IngredientParser.php
git commit -m "feat: add IngredientParser service for structured ingredient parsing"
```

---

### Task 2: Integrate parser into RecipeScraper

**Files:**
- Modify: `api/services/RecipeScraper.php`

**Step 1: Add parser integration in mapJsonLdRecipe()**

In `RecipeScraper.php`, add a `require_once` at the top of the file (after the opening `<?php` and class declaration), and modify the ingredient mapping in `mapJsonLdRecipe()` (lines 231-241) and `parseMicrodata()` (lines 333-345).

At the top of `RecipeScraper.php` (line 2, before `class RecipeScraper`), add:

```php
require_once __DIR__ . '/IngredientParser.php';
```

Add a private property and constructor:

```php
class RecipeScraper {
    private IngredientParser $ingredientParser;

    public function __construct() {
        $this->ingredientParser = new IngredientParser();
    }
```

Replace the ingredient mapping in `mapJsonLdRecipe()` (lines 231-241):

```php
        // Ingredients
        $result['ingredients'] = [];
        if (!empty($data['recipeIngredient']) && is_array($data['recipeIngredient'])) {
            foreach ($data['recipeIngredient'] as $i => $ingredient) {
                $parsed = $this->ingredientParser->parse($this->cleanText($ingredient));
                $result['ingredients'][] = [
                    'name' => $parsed['name'],
                    'amount' => $parsed['amount'],
                    'unit' => $parsed['unit'],
                    'sort_order' => $i,
                ];
            }
        }
```

Replace the ingredient mapping in `parseMicrodata()` (lines 333-345):

```php
        // Ingredients
        $result['ingredients'] = [];
        $ingNodes = $xpath->query('.//*[@itemprop="recipeIngredient" or @itemprop="ingredients"]', $recipeEl);
        for ($i = 0; $i < $ingNodes->length; $i++) {
            $text = $this->cleanText($ingNodes->item($i)->textContent);
            if ($text !== '') {
                $parsed = $this->ingredientParser->parse($text);
                $result['ingredients'][] = [
                    'name' => $parsed['name'],
                    'amount' => $parsed['amount'],
                    'unit' => $parsed['unit'],
                    'sort_order' => $i,
                ];
            }
        }
```

**Step 2: Verify syntax**

Run: `php -l api/services/RecipeScraper.php`
Expected: `No syntax errors detected`

**Step 3: Test by importing a recipe via the UI**

Open http://crumble.fmr.local, go to Add Recipe > Import from URL, paste a recipe URL (e.g. from allrecipes.com). Verify that the imported ingredients now have structured amount/unit/name fields in the review form.

**Step 4: Commit**

```bash
git add api/services/RecipeScraper.php
git commit -m "feat: integrate IngredientParser into recipe scraper"
```

---

### Task 3: Add admin endpoint to reparse existing ingredients

**Files:**
- Modify: `api/index.php` (add route)
- Modify: `api/services/RecipeScraper.php` or create new admin logic inline

**Step 1: Add the reparse route to index.php**

In `api/index.php`, add a new case inside the switch statement (after the `users` case, before the root case at line 228):

```php
        // ── Admin Routes ─────────────────────────────────────────────────
        case 'admin':
            if ($id === 'reparse-ingredients' && $method === 'POST') {
                Auth::requireAdmin();

                require_once __DIR__ . '/services/IngredientParser.php';
                require_once __DIR__ . '/models/Database.php';

                $parser = new IngredientParser();
                $db = Database::getInstance();

                // Find ingredients where amount is null/empty but name looks like it has an amount
                $stmt = $db->query("
                    SELECT id, name FROM ingredients
                    WHERE (amount IS NULL OR amount = '')
                    AND name REGEXP '^[0-9]'
                ");
                $rows = $stmt->fetchAll();

                $updateStmt = $db->prepare('
                    UPDATE ingredients SET amount = ?, unit = ?, name = ? WHERE id = ?
                ');

                $updated = 0;
                foreach ($rows as $row) {
                    $parsed = $parser->parse($row['name']);
                    if ($parsed['amount'] !== null) {
                        $updateStmt->execute([
                            $parsed['amount'],
                            $parsed['unit'],
                            $parsed['name'],
                            $row['id'],
                        ]);
                        $updated++;
                    }
                }

                $response = [
                    'message' => "Re-parsed $updated ingredients",
                    'total_checked' => count($rows),
                    'updated' => $updated,
                ];
            }
            break;
```

**Step 2: Verify syntax**

Run: `php -l api/index.php`
Expected: `No syntax errors detected`

**Step 3: Test the endpoint**

Run: `curl -s -X POST http://crumble.fmr.local/api/admin/reparse-ingredients -b "PHPSESSID=<session_cookie>"`

To get the session cookie, log in first:
```bash
curl -s -X POST http://crumble.fmr.local/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}' -c cookies.txt
curl -s -X POST http://crumble.fmr.local/api/admin/reparse-ingredients -b cookies.txt
```

Expected: `{"message":"Re-parsed 15 ingredients","total_checked":15,"updated":15}`

**Step 4: Verify the Chicken Alfredo recipe now has structured ingredients**

Run: `curl -s http://crumble.fmr.local/api/recipes/6 -b cookies.txt | python -m json.tool | head -40`

Verify that ingredients now have `amount` and `unit` populated (e.g. `"amount": "2", "unit": "cup", "name": "heavy whipping cream"`).

**Step 5: Commit**

```bash
git add api/index.php
git commit -m "feat: add admin endpoint to reparse existing ingredient strings"
```

---

### Task 4: Verify end-to-end with serving scaling

**Step 1: Open recipe in browser and test scaling**

Navigate to http://crumble.fmr.local/recipe/6 (Chicken Alfredo). The ingredients should now show structured amounts (e.g. "2 cups heavy whipping cream" displayed as bold "2" + "cups" + "heavy whipping cream" from separate fields).

Adjust servings up and down — the structured `amount` field should now scale properly via the existing `scaleIngredients` utility (which handles the `amount` field).

**Step 2: Test a fresh import**

Import a new recipe from a URL. Verify the ingredients arrive with parsed amount/unit/name in the review form.

**Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: adjust ingredient parsing edge cases"
```
