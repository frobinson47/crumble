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
                ['status' => 'error', 'error_message' => 'Failed to open zip file: ' . $zipPath]
            ]];
        }

        $results = [];

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);

            // Only process .json files that are inside a subdirectory (recipe folder)
            if (!preg_match('/^[^\/]+\/[^\/]+\.json$/', $name)) {
                continue;
            }

            $contents = $zip->getFromIndex($i);

            if ($contents === false) {
                $results[] = [
                    'status' => 'error',
                    'error_message' => 'Could not read file from zip: ' . $name
                ];
                continue;
            }

            $data = json_decode($contents, true);

            if (!is_array($data)) {
                $results[] = [
                    'status' => 'error',
                    'error_message' => 'Invalid JSON in file: ' . $name
                ];
                continue;
            }

            try {
                $recipe = $this->mapRecipe($data);
                $results[] = [
                    'status' => 'success',
                    'recipe' => $recipe
                ];
            } catch (Throwable $e) {
                $results[] = [
                    'status' => 'error',
                    'error_message' => 'Error mapping recipe in ' . $name . ': ' . $e->getMessage()
                ];
            }
        }

        $zip->close();

        return ['results' => $results];
    }

    private function mapRecipe(array $data): array {
        $parser = new IngredientParser();

        // Title
        $title = isset($data['name']) && $data['name'] !== '' ? (string)$data['name'] : null;

        // Description
        $description = isset($data['description']) && $data['description'] !== ''
            ? (string)$data['description']
            : null;

        // Prep time (ISO 8601 duration -> minutes)
        $prepTime = null;
        if (!empty($data['prepTime'])) {
            $prepTime = $this->parseDuration((string)$data['prepTime']);
        }

        // Cook time (ISO 8601 duration -> minutes)
        $cookTime = null;
        if (!empty($data['cookTime'])) {
            $cookTime = $this->parseDuration((string)$data['cookTime']);
        }

        // Servings (extract leading number from recipeYield)
        $servings = null;
        if (!empty($data['recipeYield'])) {
            $yield = (string)$data['recipeYield'];
            if (preg_match('/(\d+)/', $yield, $m)) {
                $servings = (int)$m[1];
            }
        }

        // Ingredients
        $ingredients = [];
        if (!empty($data['recipeIngredient']) && is_array($data['recipeIngredient'])) {
            foreach ($data['recipeIngredient'] as $raw) {
                if (!is_string($raw) || trim($raw) === '') {
                    continue;
                }
                $ingredients[] = $parser->parse(trim($raw));
            }
        }

        // Instructions
        $instructions = [];
        if (!empty($data['recipeInstructions']) && is_array($data['recipeInstructions'])) {
            foreach ($data['recipeInstructions'] as $step) {
                if (is_array($step) && isset($step['text']) && trim($step['text']) !== '') {
                    $instructions[] = trim($step['text']);
                } elseif (is_string($step) && trim($step) !== '') {
                    $instructions[] = trim($step);
                }
            }
        }

        // Image URL (only keep if it looks like an HTTP/HTTPS URL)
        $sourceImageUrl = null;
        if (!empty($data['image'])) {
            $image = (string)$data['image'];
            if (preg_match('/^https?:\/\//i', $image)) {
                $sourceImageUrl = $image;
            }
        }

        return [
            'title'            => $title,
            'description'      => $description,
            'prep_time'        => $prepTime,
            'cook_time'        => $cookTime,
            'servings'         => $servings,
            'ingredients'      => $ingredients,
            'instructions'     => $instructions,
            'source_image_url' => $sourceImageUrl,
        ];
    }

    private function parseDuration(string $iso): ?int {
        if (preg_match('/PT(?:(\d+)H)?(?:(\d+)M)?/', $iso, $m)) {
            return ((int)($m[1] ?? 0)) * 60 + (int)($m[2] ?? 0);
        }
        return null;
    }
}
