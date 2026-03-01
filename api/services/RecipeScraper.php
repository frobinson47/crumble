<?php

class RecipeScraper {

    /**
     * Scrape a recipe from a URL.
     * Tries JSON-LD first, then microdata, then Open Graph.
     * Returns parsed recipe data. Never throws — returns partial data on failure.
     */
    public function scrape(string $url): array {
        $result = [
            'title' => '',
            'description' => '',
            'prep_time' => null,
            'cook_time' => null,
            'servings' => null,
            'ingredients' => [],
            'instructions' => [],
            'image_url' => '',
            'source_url' => $url,
        ];

        // Validate URL
        if (!$this->isValidUrl($url)) {
            $result['error'] = 'Invalid or blocked URL';
            return $result;
        }

        // Fetch HTML
        $html = $this->fetchUrl($url);
        if ($html === false) {
            $result['error'] = 'Failed to fetch URL';
            return $result;
        }

        // Try JSON-LD first
        $jsonLd = $this->parseJsonLd($html);
        if ($jsonLd) {
            return array_merge($result, $jsonLd);
        }

        // Try microdata
        $microdata = $this->parseMicrodata($html);
        if ($microdata) {
            return array_merge($result, $microdata);
        }

        // Fallback to Open Graph
        $og = $this->parseOpenGraph($html);
        if ($og) {
            return array_merge($result, $og);
        }

        $result['error'] = 'Could not parse recipe data from this URL';
        return $result;
    }

    /**
     * Validate URL scheme and block private IPs (SSRF protection).
     */
    private function isValidUrl(string $url): bool {
        $parsed = parse_url($url);

        // Must have a scheme and host
        if (empty($parsed['scheme']) || empty($parsed['host'])) {
            return false;
        }

        // Only allow http and https
        if (!in_array(strtolower($parsed['scheme']), ['http', 'https'])) {
            return false;
        }

        $host = $parsed['host'];

        // Resolve hostname to IP
        $ip = gethostbyname($host);

        // If gethostbyname returns the hostname itself, resolution failed
        if ($ip === $host && !filter_var($host, FILTER_VALIDATE_IP)) {
            return false;
        }

        // Block private and reserved IP ranges
        if (filter_var($ip, FILTER_VALIDATE_IP)) {
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Fetch URL content with browser-like User-Agent and timeout.
     * Uses cURL for HTTPS support (PHP openssl ext may not be available).
     */
    private function fetchUrl(string $url): string|false {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_MAXREDIRS => 5,
                CURLOPT_TIMEOUT => 15,
                CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                CURLOPT_HTTPHEADER => ['Accept: text/html,application/xhtml+xml'],
                CURLOPT_SSL_VERIFYPEER => true,
            ]);

            // Use Laragon's CA bundle if curl.cainfo is not configured
            $caInfo = ini_get('curl.cainfo');
            if (empty($caInfo)) {
                $laragonCa = 'D:/laragon/etc/ssl/cacert.pem';
                if (file_exists($laragonCa)) {
                    curl_setopt($ch, CURLOPT_CAINFO, $laragonCa);
                }
            }

            $html = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($html === false || $httpCode !== 200) {
                return false;
            }

            return $html;
        }

        // Fallback to file_get_contents
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\nAccept: text/html,application/xhtml+xml\r\n",
                'timeout' => 10,
                'follow_location' => true,
                'max_redirects' => 5,
            ],
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
            ],
        ]);

        $html = @file_get_contents($url, false, $context);
        return $html;
    }

    /**
     * Parse JSON-LD structured data for Recipe schema.
     */
    private function parseJsonLd(string $html): ?array {
        // Find all JSON-LD blocks
        if (!preg_match_all('/<script\s+type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/si', $html, $matches)) {
            return null;
        }

        foreach ($matches[1] as $jsonStr) {
            $data = json_decode($jsonStr, true);
            if (!$data) continue;

            $recipe = $this->findRecipeInJsonLd($data);
            if ($recipe) {
                return $this->mapJsonLdRecipe($recipe);
            }
        }

        return null;
    }

    /**
     * Recursively find a Recipe object in JSON-LD data (may be nested in @graph).
     */
    private function findRecipeInJsonLd($data): ?array {
        if (!is_array($data)) return null;

        // Direct Recipe type
        if (isset($data['@type'])) {
            $type = $data['@type'];
            if (is_array($type)) $type = implode(',', $type);
            if (stripos($type, 'Recipe') !== false) {
                return $data;
            }
        }

        // Check @graph array
        if (isset($data['@graph']) && is_array($data['@graph'])) {
            foreach ($data['@graph'] as $item) {
                $found = $this->findRecipeInJsonLd($item);
                if ($found) return $found;
            }
        }

        // Check if it's a plain array of items
        if (isset($data[0])) {
            foreach ($data as $item) {
                $found = $this->findRecipeInJsonLd($item);
                if ($found) return $found;
            }
        }

        return null;
    }

    /**
     * Map JSON-LD Recipe fields to our format.
     */
    private function mapJsonLdRecipe(array $data): array {
        $result = [];

        $result['title'] = $this->cleanText($data['name'] ?? '');
        $result['description'] = $this->cleanText($data['description'] ?? '');
        $result['prep_time'] = $this->parseDuration($data['prepTime'] ?? null);
        $result['cook_time'] = $this->parseDuration($data['cookTime'] ?? null);
        $result['servings'] = $this->parseServings($data['recipeYield'] ?? null);

        // Image
        $image = $data['image'] ?? null;
        if (is_array($image)) {
            if (isset($image['url'])) {
                $result['image_url'] = $image['url'];
            } elseif (isset($image[0])) {
                $result['image_url'] = is_array($image[0]) ? ($image[0]['url'] ?? '') : $image[0];
            }
        } elseif (is_string($image)) {
            $result['image_url'] = $image;
        }

        // Ingredients
        $result['ingredients'] = [];
        if (!empty($data['recipeIngredient']) && is_array($data['recipeIngredient'])) {
            foreach ($data['recipeIngredient'] as $i => $ingredient) {
                $result['ingredients'][] = [
                    'name' => $this->cleanText($ingredient),
                    'amount' => null,
                    'unit' => null,
                    'sort_order' => $i,
                ];
            }
        }

        // Instructions
        $result['instructions'] = [];
        if (!empty($data['recipeInstructions'])) {
            $instructions = $data['recipeInstructions'];
            if (is_string($instructions)) {
                // Single string — split on newlines
                $steps = preg_split('/\n+/', $instructions);
                foreach ($steps as $step) {
                    $step = $this->cleanText($step);
                    if ($step !== '') {
                        $result['instructions'][] = $step;
                    }
                }
            } elseif (is_array($instructions)) {
                foreach ($instructions as $step) {
                    if (is_string($step)) {
                        $cleaned = $this->cleanText($step);
                        if ($cleaned !== '') {
                            $result['instructions'][] = $cleaned;
                        }
                    } elseif (is_array($step)) {
                        // HowToStep or HowToSection
                        if (isset($step['text'])) {
                            $cleaned = $this->cleanText($step['text']);
                            if ($cleaned !== '') {
                                $result['instructions'][] = $cleaned;
                            }
                        } elseif (isset($step['itemListElement']) && is_array($step['itemListElement'])) {
                            // HowToSection with nested steps
                            foreach ($step['itemListElement'] as $subStep) {
                                if (is_array($subStep) && isset($subStep['text'])) {
                                    $cleaned = $this->cleanText($subStep['text']);
                                    if ($cleaned !== '') {
                                        $result['instructions'][] = $cleaned;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return $result;
    }

    /**
     * Parse microdata (itemtype="https://schema.org/Recipe") from HTML.
     */
    private function parseMicrodata(string $html): ?array {
        $dom = new \DOMDocument();
        @$dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);
        $xpath = new \DOMXPath($dom);

        // Find the Recipe element
        $recipeNodes = $xpath->query('//*[contains(@itemtype, "schema.org/Recipe")]');
        if ($recipeNodes->length === 0) {
            return null;
        }

        $recipeEl = $recipeNodes->item(0);
        $result = [];

        // Helper to get itemprop text
        $getProp = function(string $prop) use ($xpath, $recipeEl): string {
            $nodes = $xpath->query('.//*[@itemprop="' . $prop . '"]', $recipeEl);
            if ($nodes->length > 0) {
                $node = $nodes->item(0);
                // Check for content attribute first (meta tags)
                $content = $node->getAttribute('content');
                if ($content) return $content;
                return $node->textContent;
            }
            return '';
        };

        $result['title'] = $this->cleanText($getProp('name'));
        $result['description'] = $this->cleanText($getProp('description'));
        $result['prep_time'] = $this->parseDuration($getProp('prepTime') ?: null);
        $result['cook_time'] = $this->parseDuration($getProp('cookTime') ?: null);
        $result['servings'] = $this->parseServings($getProp('recipeYield') ?: null);

        // Image
        $imgNodes = $xpath->query('.//*[@itemprop="image"]', $recipeEl);
        if ($imgNodes->length > 0) {
            $imgEl = $imgNodes->item(0);
            $result['image_url'] = $imgEl->getAttribute('src') ?: $imgEl->getAttribute('content') ?: '';
        }

        // Ingredients
        $result['ingredients'] = [];
        $ingNodes = $xpath->query('.//*[@itemprop="recipeIngredient" or @itemprop="ingredients"]', $recipeEl);
        for ($i = 0; $i < $ingNodes->length; $i++) {
            $text = $this->cleanText($ingNodes->item($i)->textContent);
            if ($text !== '') {
                $result['ingredients'][] = [
                    'name' => $text,
                    'amount' => null,
                    'unit' => null,
                    'sort_order' => $i,
                ];
            }
        }

        // Instructions
        $result['instructions'] = [];
        $stepNodes = $xpath->query('.//*[@itemprop="recipeInstructions"]', $recipeEl);
        for ($i = 0; $i < $stepNodes->length; $i++) {
            $text = $this->cleanText($stepNodes->item($i)->textContent);
            if ($text !== '') {
                $result['instructions'][] = $text;
            }
        }

        // Only return if we got at least a title
        if (empty($result['title'])) {
            return null;
        }

        return $result;
    }

    /**
     * Fallback: parse Open Graph meta tags.
     */
    private function parseOpenGraph(string $html): ?array {
        $result = [];
        $found = false;

        // og:title
        if (preg_match('/<meta\s+(?:property|name)=["\']og:title["\']\s+content=["\']([^"\']*)["\']|<meta\s+content=["\']([^"\']*?)["\']\s+(?:property|name)=["\']og:title["\']/i', $html, $m)) {
            $result['title'] = $this->cleanText($m[1] ?: $m[2]);
            $found = true;
        }

        // og:description
        if (preg_match('/<meta\s+(?:property|name)=["\']og:description["\']\s+content=["\']([^"\']*)["\']|<meta\s+content=["\']([^"\']*?)["\']\s+(?:property|name)=["\']og:description["\']/i', $html, $m)) {
            $result['description'] = $this->cleanText($m[1] ?: $m[2]);
            $found = true;
        }

        // og:image
        if (preg_match('/<meta\s+(?:property|name)=["\']og:image["\']\s+content=["\']([^"\']*)["\']|<meta\s+content=["\']([^"\']*?)["\']\s+(?:property|name)=["\']og:image["\']/i', $html, $m)) {
            $result['image_url'] = $m[1] ?: $m[2];
            $found = true;
        }

        return $found ? $result : null;
    }

    /**
     * Parse ISO 8601 duration string (e.g., "PT30M", "PT1H15M") to minutes.
     */
    private function parseDuration(?string $duration): ?int {
        if ($duration === null || $duration === '') return null;

        // Try ISO 8601 format
        if (preg_match('/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i', $duration, $m)) {
            $hours = (int) ($m[1] ?? 0);
            $minutes = (int) ($m[2] ?? 0);
            $seconds = (int) ($m[3] ?? 0);
            $total = ($hours * 60) + $minutes + (int) ceil($seconds / 60);
            return $total > 0 ? $total : null;
        }

        // Try plain number
        if (is_numeric($duration)) {
            return (int) $duration;
        }

        return null;
    }

    /**
     * Parse recipe yield/servings to an integer.
     */
    private function parseServings($yield): ?int {
        if ($yield === null) return null;

        if (is_array($yield)) {
            $yield = $yield[0] ?? '';
        }

        // Extract first number
        if (preg_match('/(\d+)/', (string) $yield, $m)) {
            return (int) $m[1];
        }

        return null;
    }

    /**
     * Strip HTML tags and clean whitespace from text.
     */
    private function cleanText(string $text): string {
        $text = strip_tags($text);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/', ' ', $text);
        return trim($text);
    }
}
