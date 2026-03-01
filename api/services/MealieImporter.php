<?php

require_once __DIR__ . '/IngredientParser.php';

class MealieImporter {

    public function import(string $zipPath): array {
        if (!class_exists('ZipArchive')) {
            return ['results' => [
                ['status' => 'error', 'error_message' => 'ZIP support is not available. Enable the PHP zip extension.']
            ]];
        }

        $zip = new ZipArchive();

        if ($zip->open($zipPath) !== true) {
            return ['results' => [
                ['status' => 'error', 'error_message' => 'Failed to open zip file.']
            ]];
        }

        // Mealie exports a database.json at the root with all data in relational tables
        $dbJson = $zip->getFromName('database.json');
        if ($dbJson === false) {
            $zip->close();
            return ['results' => [
                ['status' => 'error', 'error_message' => 'No database.json found in zip. Is this a Mealie export?']
            ]];
        }

        $db = json_decode($dbJson, true);
        if (!is_array($db) || empty($db['recipes'])) {
            $zip->close();
            return ['results' => [
                ['status' => 'error', 'error_message' => 'No recipes found in database.json.']
            ]];
        }

        // Index instructions and ingredients by recipe_id
        $instructionsByRecipe = [];
        foreach ($db['recipe_instructions'] ?? [] as $inst) {
            $rid = $inst['recipe_id'] ?? null;
            if ($rid) {
                $instructionsByRecipe[$rid][] = $inst;
            }
        }

        $ingredientsByRecipe = [];
        foreach ($db['recipes_ingredients'] ?? [] as $ing) {
            $rid = $ing['recipe_id'] ?? null;
            if ($rid) {
                $ingredientsByRecipe[$rid][] = $ing;
            }
        }

        $parser = new IngredientParser();
        $results = [];

        foreach ($db['recipes'] as $recipe) {
            try {
                $rid = $recipe['id'];
                $mapped = $this->mapRecipe(
                    $recipe,
                    $ingredientsByRecipe[$rid] ?? [],
                    $instructionsByRecipe[$rid] ?? [],
                    $parser
                );

                // Extract image from zip and store in session for later save
                $uuid = substr($rid, 0, 8) . '-' . substr($rid, 8, 4) . '-' .
                        substr($rid, 12, 4) . '-' . substr($rid, 16, 4) . '-' .
                        substr($rid, 20);
                $imagePath = "data/recipes/{$uuid}/images/original.webp";
                $imageData = $zip->getFromName($imagePath);
                if ($imageData !== false) {
                    // Save to temp file and track by a token
                    $token = bin2hex(random_bytes(16));
                    $tmpFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . "mealie_img_{$token}.webp";
                    file_put_contents($tmpFile, $imageData);
                    $mapped['_image_token'] = $token;
                    // Store token->path mapping in session
                    if (!isset($_SESSION['mealie_images'])) {
                        $_SESSION['mealie_images'] = [];
                    }
                    $_SESSION['mealie_images'][$token] = $tmpFile;
                }

                $results[] = [
                    'status' => 'success',
                    'recipe' => $mapped,
                ];
            } catch (\Throwable $e) {
                $results[] = [
                    'status' => 'error',
                    'error_message' => 'Error mapping recipe "' . ($recipe['name'] ?? 'unknown') . '": ' . $e->getMessage(),
                ];
            }
        }

        $zip->close();
        return ['results' => $results];
    }

    private function mapRecipe(array $data, array $rawIngredients, array $rawInstructions, IngredientParser $parser): array {
        // Title
        $title = !empty($data['name']) ? (string)$data['name'] : 'Untitled';

        // Description
        $description = !empty($data['description']) ? (string)$data['description'] : null;

        // Prep time — may be "10 minutes" or ISO duration
        $prepTime = $this->parseTime($data['prep_time'] ?? null);

        // Cook time
        $cookTime = $this->parseTime($data['cook_time'] ?? null);

        // Servings from recipe_yield
        $servings = null;
        $yield = $data['recipe_yield'] ?? null;
        if ($yield !== null && $yield !== '') {
            if (preg_match('/(\d+)/', (string)$yield, $m)) {
                $servings = (int)$m[1];
            }
        }

        // Ingredients — the text is in the "note" field
        $ingredients = [];
        // Sort by position
        usort($rawIngredients, fn($a, $b) => ($a['position'] ?? 0) - ($b['position'] ?? 0));
        foreach ($rawIngredients as $i => $ing) {
            $text = $ing['note'] ?? $ing['original_text'] ?? '';
            $text = trim((string)$text);
            if ($text === '') continue;

            $parsed = $parser->parse($text);
            $parsed['sort_order'] = $i;
            $ingredients[] = $parsed;
        }

        // Instructions — sort by position
        usort($rawInstructions, fn($a, $b) => ($a['position'] ?? 0) - ($b['position'] ?? 0));
        $instructions = [];
        foreach ($rawInstructions as $inst) {
            $text = trim($inst['text'] ?? '');
            if ($text !== '') {
                $instructions[] = $text;
            }
        }

        // Source URL
        $sourceUrl = !empty($data['org_url']) ? (string)$data['org_url'] : null;

        return [
            'title'       => $title,
            'description' => $description,
            'prep_time'   => $prepTime,
            'cook_time'   => $cookTime,
            'servings'    => $servings,
            'ingredients' => $ingredients,
            'instructions' => $instructions,
            'source_url'  => $sourceUrl,
        ];
    }

    private function parseTime($value): ?int {
        if ($value === null || $value === '') return null;
        $str = (string)$value;

        // ISO 8601 duration: PT15M, PT1H30M
        if (preg_match('/PT(?:(\d+)H)?(?:(\d+)M)?/', $str, $m)) {
            $minutes = ((int)($m[1] ?? 0)) * 60 + (int)($m[2] ?? 0);
            if ($minutes > 0) return $minutes;
        }

        // Plain string: "10 minutes", "1 hour 30 minutes"
        $minutes = 0;
        if (preg_match('/(\d+)\s*h/i', $str, $m)) $minutes += (int)$m[1] * 60;
        if (preg_match('/(\d+)\s*m/i', $str, $m)) $minutes += (int)$m[1];
        return $minutes > 0 ? $minutes : null;
    }
}
