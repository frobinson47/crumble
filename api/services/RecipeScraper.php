<?php

require_once __DIR__ . '/IngredientParser.php';

class RecipeScraper {

    private IngredientParser $ingredientParser;

    private const USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    ];

    private const ERROR_MESSAGES = [
        'invalid_url' => "This doesn't look like a valid URL.",
        'fetch_failed' => "Couldn't reach this website. Check the URL and try again.",
        'fetch_blocked' => "This website blocked our request. Try copying the recipe manually.",
        'fetch_timeout' => "The website took too long to respond. Try again later.",
        'parse_failed' => "Found the page but couldn't find recipe data. You can enter it manually.",
    ];

    public function __construct() {
        $this->ingredientParser = new IngredientParser();
    }

    private function randomUserAgent(): string {
        return self::USER_AGENTS[array_rand(self::USER_AGENTS)];
    }

    /**
     * Scrape a recipe from a URL.
     * Tries JSON-LD, microdata, heuristic HTML, then Open Graph.
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
            $result['error_code'] = 'invalid_url';
            $result['error'] = self::ERROR_MESSAGES['invalid_url'];
            return $result;
        }

        // Fetch HTML
        $fetchResult = $this->fetchUrl($url);
        if ($fetchResult['html'] === null) {
            $code = $fetchResult['error_code'];
            $result['error_code'] = $code;
            $result['error'] = self::ERROR_MESSAGES[$code] ?? self::ERROR_MESSAGES['fetch_failed'];
            return $result;
        }

        $html = $fetchResult['html'];

        // Try parsers in priority order
        $parsed = $this->parseJsonLd($html)
            ?? $this->parseMicrodata($html)
            ?? $this->parseHeuristic($html)
            ?? $this->parseOpenGraph($html);

        // Try cached/AMP version for JS-rendered pages
        if (!$parsed) {
            $cachedHtml = $this->fetchCachedVersion($url);
            if ($cachedHtml !== null) {
                $parsed = $this->parseJsonLd($cachedHtml)
                    ?? $this->parseMicrodata($cachedHtml)
                    ?? $this->parseHeuristic($cachedHtml);
            }
        }

        if (!$parsed) {
            $result['error_code'] = 'parse_failed';
            $result['error'] = self::ERROR_MESSAGES['parse_failed'];
            return $result;
        }

        $result = array_merge($result, $parsed);

        // Resolve relative image URLs
        if (!empty($result['image_url']) && !preg_match('#^https?://#i', $result['image_url'])) {
            $parsedUrl = parse_url($url);
            $base = ($parsedUrl['scheme'] ?? 'https') . '://' . ($parsedUrl['host'] ?? '');
            if (!empty($parsedUrl['port'])) {
                $base .= ':' . $parsedUrl['port'];
            }
            $result['image_url'] = $result['image_url'][0] === '/'
                ? $base . $result['image_url']
                : $base . '/' . $result['image_url'];
        }

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
     * Returns array with 'html' and 'error_code' keys.
     */
    private function fetchUrl(string $url): array {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_MAXREDIRS => 5,
                CURLOPT_TIMEOUT => 15,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_USERAGENT => $this->randomUserAgent(),
                CURLOPT_HTTPHEADER => ['Accept: text/html,application/xhtml+xml'],
                CURLOPT_SSL_VERIFYPEER => true,
            ]);

            // Use CA bundle for SSL verification if not configured in php.ini
            $caBundle = getCaBundlePath();
            if ($caBundle) {
                curl_setopt($ch, CURLOPT_CAINFO, $caBundle);
            }

            $html = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_errno($ch);
            curl_close($ch);

            if ($curlError === 28) { // CURLE_OPERATION_TIMEDOUT
                return ['html' => null, 'error_code' => 'fetch_timeout'];
            }

            if ($html === false || $curlError !== 0) {
                return ['html' => null, 'error_code' => 'fetch_failed'];
            }

            if ($httpCode === 403 || $httpCode === 429) {
                return ['html' => null, 'error_code' => 'fetch_blocked'];
            }

            if ($httpCode !== 200) {
                return ['html' => null, 'error_code' => 'fetch_failed'];
            }

            return ['html' => $html, 'error_code' => null];
        }

        // Fallback to file_get_contents
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => "User-Agent: " . $this->randomUserAgent() . "\r\nAccept: text/html,application/xhtml+xml\r\n",
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
        if ($html === false) {
            return ['html' => null, 'error_code' => 'fetch_failed'];
        }
        return ['html' => $html, 'error_code' => null];
    }

    /**
     * Try fetching a pre-rendered version of a JS-heavy page.
     */
    private function fetchCachedVersion(string $url): ?string {
        $parsed = parse_url($url);
        $domain = $parsed['host'] ?? '';
        $path = $parsed['path'] ?? '/';

        // Try Google AMP cache (still works for some sites)
        $ampUrl = 'https://cdn.ampproject.org/c/s/' . $domain . $path;
        $ampResult = $this->fetchUrl($ampUrl);
        if ($ampResult['html'] !== null) {
            return $ampResult['html'];
        }

        // Note: Google Web Cache was shut down in September 2024
        // and webcache.googleusercontent.com no longer serves content.

        return null;
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
        // Fall back to totalTime when both prep and cook are missing
        if (!$result['prep_time'] && !$result['cook_time']) {
            $total = $this->parseDuration($data['totalTime'] ?? null);
            if ($total) {
                $result['cook_time'] = $total;
            }
        }
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

        // Ingredients — parse into structured amount/unit/name
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
                            // HowToSection with nested steps — preserve section heading
                            if (!empty($step['name'])) {
                                $sectionName = $this->cleanText($step['name']);
                                if ($sectionName !== '') {
                                    $result['instructions'][] = '--- ' . $sectionName . ' ---';
                                }
                            }
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

        // Nutrition from schema.org NutritionInformation
        if (!empty($data['nutrition']) && is_array($data['nutrition'])) {
            $n = $data['nutrition'];
            $result['calories'] = $this->parseNutritionValue($n['calories'] ?? null);
            $result['protein'] = $this->parseNutritionValue($n['proteinContent'] ?? null);
            $result['fat'] = $this->parseNutritionValue($n['fatContent'] ?? null);
            $result['carbs'] = $this->parseNutritionValue($n['carbohydrateContent'] ?? null);
            $result['fiber'] = $this->parseNutritionValue($n['fiberContent'] ?? null);
            $result['sugar'] = $this->parseNutritionValue($n['sugarContent'] ?? null);
        }

        // Tags from recipeCategory, recipeCuisine, and keywords
        $tags = [];
        foreach (['recipeCategory', 'recipeCuisine'] as $field) {
            if (!empty($data[$field])) {
                $value = $data[$field];
                if (is_string($value)) {
                    $tags = array_merge($tags, array_map('trim', explode(',', $value)));
                } elseif (is_array($value)) {
                    $tags = array_merge($tags, $value);
                }
            }
        }
        if (!empty($data['keywords'])) {
            $kw = $data['keywords'];
            if (is_string($kw)) {
                $tags = array_merge($tags, array_map('trim', explode(',', $kw)));
            } elseif (is_array($kw)) {
                $tags = array_merge($tags, $kw);
            }
        }
        // Deduplicate and filter empty
        $tags = array_values(array_unique(array_filter(array_map('trim', $tags), fn($t) => $t !== '')));
        if (!empty($tags)) {
            $result['tags'] = $tags;
        }

        return $result;
    }

    /**
     * Extract a numeric value from a nutrition string like "250 calories" or "12 g".
     */
    private function parseNutritionValue($value): ?int {
        if ($value === null) return null;
        $value = (string) $value;
        if (preg_match('/(\d+(?:\.\d+)?)/', $value, $m)) {
            return (int) round((float) $m[1]);
        }
        return null;
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
        if (!$result['prep_time'] && !$result['cook_time']) {
            $total = $this->parseDuration($getProp('totalTime') ?: null);
            if ($total) {
                $result['cook_time'] = $total;
            }
        }
        $result['servings'] = $this->parseServings($getProp('recipeYield') ?: null);

        // Image
        $imgNodes = $xpath->query('.//*[@itemprop="image"]', $recipeEl);
        if ($imgNodes->length > 0) {
            $imgEl = $imgNodes->item(0);
            $result['image_url'] = $imgEl->getAttribute('src') ?: $imgEl->getAttribute('content') ?: '';
        }

        // Ingredients — parse into structured amount/unit/name
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
     * Heuristic fallback: extract recipe content from common HTML patterns.
     */
    private function parseHeuristic(string $html): ?array {
        $dom = new \DOMDocument();
        @$dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);
        $xpath = new \DOMXPath($dom);

        $result = [];

        // Title: first <h1>, or <h2> if no <h1>
        $h1 = $xpath->query('//h1');
        if ($h1->length > 0) {
            $result['title'] = $this->cleanText($h1->item(0)->textContent);
        } else {
            $h2 = $xpath->query('//h2');
            if ($h2->length > 0) {
                $result['title'] = $this->cleanText($h2->item(0)->textContent);
            }
        }

        if (empty($result['title'])) {
            return null;
        }

        // Ingredients: find <li> inside containers with ingredient-related class/id
        $result['ingredients'] = $this->extractListItems($xpath, ['ingredient']);

        // Instructions: find <li> or <p> inside containers with instruction-related class/id
        $instructionKeywords = ['instruction', 'direction', 'method', 'step', 'preparation'];
        $instructionItems = $this->extractListItems($xpath, $instructionKeywords);
        if (empty($instructionItems)) {
            $instructionItems = $this->extractParagraphs($xpath, $instructionKeywords);
        }
        $result['instructions'] = array_map(function ($item) {
            return is_array($item) ? ($item['name'] ?? '') : $item;
        }, $instructionItems);

        // Image
        $result['image_url'] = $this->findHeroImage($xpath);

        // Parse times/servings from text near the top
        $metaText = '';
        $metaNodes = $xpath->query('//main|//article|//div[contains(@class,"recipe")]');
        if ($metaNodes->length > 0) {
            $metaText = substr($metaNodes->item(0)->textContent, 0, 2000);
        }

        if (preg_match('/prep[:\s]*(\d+)\s*(?:min|minute)/i', $metaText, $m)) {
            $result['prep_time'] = (int) $m[1];
        }
        if (preg_match('/cook[:\s]*(\d+)\s*(?:min|minute)/i', $metaText, $m)) {
            $result['cook_time'] = (int) $m[1];
        }
        if (preg_match('/serv(?:es|ings?)[:\s]*(\d+)/i', $metaText, $m)) {
            $result['servings'] = (int) $m[1];
        }

        // Only return if we got ingredients or instructions
        if (empty($result['ingredients']) && empty($result['instructions'])) {
            return null;
        }

        return $result;
    }

    /**
     * Extract <li> items from containers matching keyword patterns in class or id.
     */
    private function extractListItems(\DOMXPath $xpath, array $keywords): array {
        $items = [];

        foreach ($keywords as $kw) {
            $containers = $xpath->query(
                '//*[contains(translate(@class,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"' . $kw . '") or '
                . 'contains(translate(@id,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"' . $kw . '")]'
            );

            for ($i = 0; $i < $containers->length; $i++) {
                $container = $containers->item($i);
                $lis = $xpath->query('.//li', $container);
                for ($j = 0; $j < $lis->length; $j++) {
                    $text = $this->cleanText($lis->item($j)->textContent);
                    if ($text !== '' && strlen($text) > 2) {
                        $parsed = $this->ingredientParser->parse($text);
                        $items[] = [
                            'name' => $parsed['name'],
                            'amount' => $parsed['amount'],
                            'unit' => $parsed['unit'],
                            'sort_order' => count($items),
                        ];
                    }
                }
                if (!empty($items)) break 2;
            }
        }

        return $items;
    }

    /**
     * Extract <p> tags from containers matching keyword patterns.
     */
    private function extractParagraphs(\DOMXPath $xpath, array $keywords): array {
        $items = [];

        foreach ($keywords as $kw) {
            $containers = $xpath->query(
                '//*[contains(translate(@class,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"' . $kw . '") or '
                . 'contains(translate(@id,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"' . $kw . '")]'
            );

            for ($i = 0; $i < $containers->length; $i++) {
                $container = $containers->item($i);
                $ps = $xpath->query('.//p', $container);
                for ($j = 0; $j < $ps->length; $j++) {
                    $text = $this->cleanText($ps->item($j)->textContent);
                    if ($text !== '' && strlen($text) > 10) {
                        $items[] = $text;
                    }
                }
                if (!empty($items)) break 2;
            }
        }

        return $items;
    }

    /**
     * Find the most likely hero/recipe image on the page.
     */
    private function findHeroImage(\DOMXPath $xpath): string {
        $contexts = ['//main//img', '//article//img', '//*[contains(@class,"recipe")]//img', '//img'];

        foreach ($contexts as $query) {
            $imgs = $xpath->query($query);
            for ($i = 0; $i < $imgs->length; $i++) {
                $img = $imgs->item($i);
                $src = $img->getAttribute('src') ?: $img->getAttribute('data-src') ?: '';
                if ($src === '' || strpos($src, 'data:') === 0) continue;
                // Skip tiny images (icons, avatars)
                $width = (int) $img->getAttribute('width');
                $height = (int) $img->getAttribute('height');
                if (($width > 0 && $width < 100) || ($height > 0 && $height < 100)) continue;
                return $src;
            }
        }

        return '';
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
