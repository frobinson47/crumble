<?php

require_once __DIR__ . '/IngredientParser.php';

class PaprikaImporter
{
    public function import(string $filePath): array
    {
        if (!class_exists('ZipArchive')) {
            return ['results' => [
                ['status' => 'error', 'error_message' => 'ZIP support is not available. Enable the PHP zip extension.'],
            ]];
        }

        $results = [];

        $zip = new ZipArchive();
        $opened = $zip->open($filePath);

        if ($opened !== true) {
            return [
                'results' => [
                    [
                        'status'        => 'error',
                        'error_message' => 'Failed to open file as zip archive (code: ' . $opened . ').',
                    ],
                ],
            ];
        }

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entryName = $zip->getNameIndex($i);
            $raw       = $zip->getFromIndex($i);

            if ($raw === false) {
                $results[] = [
                    'status'        => 'error',
                    'error_message' => 'Could not read entry "' . $entryName . '" from archive.',
                ];
                continue;
            }

            // Each entry is individually gzipped — decompress if needed.
            if (substr($raw, 0, 2) === "\x1f\x8b") {
                $decoded = @gzdecode($raw);
                if ($decoded === false) {
                    $results[] = [
                        'status'        => 'error',
                        'error_message' => 'Failed to gzdecode entry "' . $entryName . '".',
                    ];
                    continue;
                }
                $raw = $decoded;
            }

            $data = json_decode($raw, true);

            if (!is_array($data)) {
                $results[] = [
                    'status'        => 'error',
                    'error_message' => 'Failed to parse JSON for entry "' . $entryName . '": ' . json_last_error_msg(),
                ];
                continue;
            }

            try {
                $recipe    = $this->mapRecipe($data);
                $results[] = [
                    'status' => 'success',
                    'recipe' => $recipe,
                ];
            } catch (Throwable $e) {
                $results[] = [
                    'status'        => 'error',
                    'error_message' => 'Error mapping recipe from "' . $entryName . '": ' . $e->getMessage(),
                ];
            }
        }

        $zip->close();

        return ['results' => $results];
    }

    private function mapRecipe(array $data): array
    {
        // Ingredients: newline-separated string → parsed ingredient objects.
        $ingredients = [];
        $ingredientRaw = $data['ingredients'] ?? '';
        if (is_string($ingredientRaw) && trim($ingredientRaw) !== '') {
            foreach (explode("\n", $ingredientRaw) as $line) {
                $line = trim($line);
                if ($line === '') {
                    continue;
                }
                $ingredients[] = IngredientParser::parse($line);
            }
        }

        // Instructions: newline-separated string → array of non-empty lines.
        $instructions = [];
        $directionsRaw = $data['directions'] ?? '';
        if (is_string($directionsRaw) && trim($directionsRaw) !== '') {
            foreach (explode("\n", $directionsRaw) as $line) {
                $line = trim($line);
                if ($line !== '') {
                    $instructions[] = $line;
                }
            }
        }

        return [
            'title'        => isset($data['name']) ? trim((string) $data['name']) : '',
            'description'  => isset($data['description']) ? trim((string) $data['description']) : null,
            'prep_time'    => $this->parseTimeString($data['prep_time'] ?? null),
            'cook_time'    => $this->parseTimeString($data['cook_time'] ?? null),
            'servings'     => $this->parseServings($data['servings'] ?? null),
            'ingredients'  => $ingredients,
            'instructions' => $instructions,
            'source_url'   => isset($data['source']) && $data['source'] !== '' ? trim((string) $data['source']) : null,
        ];
    }

    private function parseTimeString(?string $str): ?int
    {
        if (!$str) return null;
        $minutes = 0;
        if (preg_match('/(\d+)\s*h/', $str, $m)) $minutes += (int) $m[1] * 60;
        if (preg_match('/(\d+)\s*m/', $str, $m)) $minutes += (int) $m[1];
        return $minutes > 0 ? $minutes : null;
    }

    private function parseServings(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        // If already numeric, cast directly.
        if (is_int($value) || is_float($value)) {
            return (int) $value;
        }

        // Extract the leading integer from strings like "4 servings", "Makes 6".
        if (preg_match('/(\d+)/', (string) $value, $m)) {
            return (int) $m[1];
        }

        return null;
    }
}
