# Improved Scraper Coverage — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve recipe import success rate by adding a heuristic HTML fallback parser, AMP/cache URL fetching for JS-rendered sites, specific error messages, and User-Agent rotation.

**Architecture:** All changes are in the existing `RecipeScraper.php` service. The scrape chain becomes: JSON-LD → microdata → heuristic HTML → Open Graph (metadata only). A separate AMP/cache fetch is attempted when the primary fetch returns JS-heavy pages. The frontend `ImportForm.jsx` is updated to display specific error messages.

**Tech Stack:** PHP (cURL, DOMDocument, DOMXPath), React

---

### Task 1: Add User-Agent rotation

**Files:**
- Modify: `api/services/RecipeScraper.php`

**Step 1: Add UA pool and selection method**

Add a constant array and helper method to the `RecipeScraper` class (after the constructor added in the ingredient parsing plan):

```php
    private const USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    ];

    private function randomUserAgent(): string {
        return self::USER_AGENTS[array_rand(self::USER_AGENTS)];
    }
```

**Step 2: Replace hardcoded UA in fetchUrl()**

In `fetchUrl()`, replace the two hardcoded User-Agent strings with `$this->randomUserAgent()`.

In the cURL block (~line 106):
```php
CURLOPT_USERAGENT => $this->randomUserAgent(),
```

In the `file_get_contents` fallback (~line 136):
```php
'header' => "User-Agent: " . $this->randomUserAgent() . "\r\nAccept: text/html,application/xhtml+xml\r\n",
```

**Step 3: Verify syntax**

Run: `php -l api/services/RecipeScraper.php`
Expected: `No syntax errors detected`

**Step 4: Commit**

```bash
git add api/services/RecipeScraper.php
git commit -m "feat: add User-Agent rotation to recipe scraper"
```

---

### Task 2: Add specific error codes

**Files:**
- Modify: `api/services/RecipeScraper.php`

**Step 1: Refactor fetchUrl() to return error details**

Change `fetchUrl()` return type from `string|false` to `array` with `{html: ?string, error_code: ?string}`:

```php
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

            $caInfo = ini_get('curl.cainfo');
            if (empty($caInfo)) {
                $laragonCa = 'D:/laragon/etc/ssl/cacert.pem';
                if (file_exists($laragonCa)) {
                    curl_setopt($ch, CURLOPT_CAINFO, $laragonCa);
                }
            }

            $html = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_errno($ch);
            curl_close($ch);

            if ($curlError === CURLE_OPERATION_TIMEDOUT || $curlError === CURLE_OPERATION_TIMEOUTED) {
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
```

**Step 2: Update scrape() to use new fetchUrl() return format and error messages**

Replace the error message map and update the `scrape()` method:

```php
    private const ERROR_MESSAGES = [
        'invalid_url' => "This doesn't look like a valid URL.",
        'fetch_failed' => "Couldn't reach this website. Check the URL and try again.",
        'fetch_blocked' => "This website blocked our request. Try copying the recipe manually.",
        'fetch_timeout' => "The website took too long to respond. Try again later.",
        'parse_failed' => "Found the page but couldn't find recipe data. You can enter it manually.",
    ];

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

        if (!$this->isValidUrl($url)) {
            $result['error_code'] = 'invalid_url';
            $result['error'] = self::ERROR_MESSAGES['invalid_url'];
            return $result;
        }

        $fetchResult = $this->fetchUrl($url);
        if ($fetchResult['html'] === null) {
            $code = $fetchResult['error_code'];
            $result['error_code'] = $code;
            $result['error'] = self::ERROR_MESSAGES[$code] ?? self::ERROR_MESSAGES['fetch_failed'];
            return $result;
        }

        $html = $fetchResult['html'];

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

        // Try heuristic HTML parsing
        $heuristic = $this->parseHeuristic($html);
        if ($heuristic) {
            return array_merge($result, $heuristic);
        }

        // Fallback to Open Graph (metadata only, no ingredients/instructions)
        $og = $this->parseOpenGraph($html);
        if ($og) {
            return array_merge($result, $og);
        }

        $result['error_code'] = 'parse_failed';
        $result['error'] = self::ERROR_MESSAGES['parse_failed'];
        return $result;
    }
```

**Step 3: Verify syntax**

Run: `php -l api/services/RecipeScraper.php`
Expected: `No syntax errors detected`

**Step 4: Commit**

```bash
git add api/services/RecipeScraper.php
git commit -m "feat: add specific error codes to recipe scraper"
```

---

### Task 3: Add heuristic HTML parser

**Files:**
- Modify: `api/services/RecipeScraper.php`

**Step 1: Add the parseHeuristic() method**

Add this method to the `RecipeScraper` class (after `parseOpenGraph()`):

```php
    /**
     * Heuristic fallback: extract recipe content from common HTML patterns.
     * Looks for ingredient/instruction containers by class, id, or nearby headings.
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

        // Ingredients: find <ul>/<ol> inside containers with ingredient-related class/id/heading
        $ingredientKeywords = ['ingredient'];
        $result['ingredients'] = $this->extractListItems($xpath, $ingredientKeywords);

        // Instructions: find <li> or <p> inside containers with instruction-related class/id/heading
        $instructionKeywords = ['instruction', 'direction', 'method', 'step', 'preparation'];
        $instructionItems = $this->extractListItems($xpath, $instructionKeywords);
        if (empty($instructionItems)) {
            // Try <p> tags in instruction containers
            $instructionItems = $this->extractParagraphs($xpath, $instructionKeywords);
        }
        $result['instructions'] = array_map(function($item) {
            return $item['name'] ?? $item;
        }, $instructionItems);

        // Image: largest image in <main> or <article>, or first large image
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
     * Extract <li> items from containers matching keyword patterns in class, id, or nearby headings.
     */
    private function extractListItems(\DOMXPath $xpath, array $keywords): array {
        $items = [];

        foreach ($keywords as $kw) {
            // Search by class or id containing the keyword
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
        // Try images inside <main>, <article>, or recipe containers
        $contexts = ['//main//img', '//article//img', '//*[contains(@class,"recipe")]//img', '//img'];

        foreach ($contexts as $query) {
            $imgs = $xpath->query($query);
            for ($i = 0; $i < $imgs->length; $i++) {
                $img = $imgs->item($i);
                $src = $img->getAttribute('src') ?: $img->getAttribute('data-src') ?: '';
                if ($src === '' || strpos($src, 'data:') === 0) continue;
                // Skip tiny images (icons, avatars) by checking width/height attributes
                $width = (int) $img->getAttribute('width');
                $height = (int) $img->getAttribute('height');
                if (($width > 0 && $width < 100) || ($height > 0 && $height < 100)) continue;
                return $src;
            }
        }

        return '';
    }
```

**Step 2: Verify syntax**

Run: `php -l api/services/RecipeScraper.php`
Expected: `No syntax errors detected`

**Step 3: Test with a site that lacks JSON-LD**

Find a recipe page without structured data and test the import. Verify the heuristic parser extracts ingredients and instructions.

**Step 4: Commit**

```bash
git add api/services/RecipeScraper.php
git commit -m "feat: add heuristic HTML fallback parser to scraper"
```

---

### Task 4: Add AMP/cache fallback for JS-rendered pages

**Files:**
- Modify: `api/services/RecipeScraper.php`

**Step 1: Add AMP/cache fetch methods**

Add these methods to `RecipeScraper`:

```php
    /**
     * Try fetching a pre-rendered version of a JS-heavy page.
     * Attempts Google AMP cache and Google Web Cache.
     */
    private function fetchCachedVersion(string $url): ?string {
        $parsed = parse_url($url);
        $domain = $parsed['host'] ?? '';
        $path = $parsed['path'] ?? '/';

        // Try Google AMP cache
        $ampUrl = 'https://cdn.ampproject.org/c/s/' . $domain . $path;
        $ampResult = $this->fetchUrl($ampUrl);
        if ($ampResult['html'] !== null) {
            return $ampResult['html'];
        }

        // Try Google Web Cache
        $cacheUrl = 'https://webcache.googleusercontent.com/search?q=cache:' . urlencode($url);
        $cacheResult = $this->fetchUrl($cacheUrl);
        if ($cacheResult['html'] !== null) {
            return $cacheResult['html'];
        }

        return null;
    }
```

**Step 2: Integrate into scrape() after the primary parse chain fails**

In the `scrape()` method, after all four parsers fail on the original HTML but before returning `parse_failed`, add a cached version attempt:

```php
        // Try cached/AMP version for JS-rendered pages
        $cachedHtml = $this->fetchCachedVersion($url);
        if ($cachedHtml !== null) {
            $jsonLd = $this->parseJsonLd($cachedHtml);
            if ($jsonLd) return array_merge($result, $jsonLd);

            $microdata = $this->parseMicrodata($cachedHtml);
            if ($microdata) return array_merge($result, $microdata);

            $heuristic = $this->parseHeuristic($cachedHtml);
            if ($heuristic) return array_merge($result, $heuristic);
        }
```

Place this block right before the final `$result['error_code'] = 'parse_failed';` line.

**Step 3: Verify syntax**

Run: `php -l api/services/RecipeScraper.php`
Expected: `No syntax errors detected`

**Step 4: Commit**

```bash
git add api/services/RecipeScraper.php
git commit -m "feat: add AMP/cache fallback for JS-rendered recipe pages"
```

---

### Task 5: Update frontend error display

**Files:**
- Modify: `frontend/src/components/recipe/ImportForm.jsx`

**Step 1: Update error handling to show specific messages**

In `ImportForm.jsx`, update the catch block in `handleSubmit` (line 32-34) to check for error messages from the API response:

```jsx
    } catch (err) {
      // The API returns { error, error_code } for specific failures
      setError(err.message || 'Failed to import recipe');
    }
```

This already works because the `useRecipes` hook throws with the error message from the API. But also update `handleImportSuccess` in `AddRecipePage.jsx` to handle partial success (recipe parsed with error field):

In `AddRecipePage.jsx`, the `handleImportSuccess` callback (line 28) receives the API response. If the response has an `error` field but also has a `title`, it's a partial success (e.g., Open Graph got title/image but no ingredients). If it has `error` and no `title`, the import failed. Check the `useRecipes` hook to verify how errors are currently propagated.

**Step 2: Read and verify the useRecipes hook error handling**

Read `frontend/src/hooks/useRecipes.js` to understand how `importRecipe` propagates errors. If the API returns `{error: "...", error_code: "..."}` with HTTP 200, the hook may not throw. In that case, update `handleImportSuccess` in `AddRecipePage.jsx`:

```jsx
  const handleImportSuccess = (data) => {
    const parsed = data.recipe || data;

    // Check if the scraper returned an error
    if (parsed.error && !parsed.title) {
      // Full failure — show error in ImportForm
      throw new Error(parsed.error);
    }

    setImportedData({
      // ... existing mapping code
    });
    setMode('manual');
  };
```

**Step 3: Build to verify no compilation errors**

Run: `cd frontend && npx vite build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add frontend/src/components/recipe/ImportForm.jsx frontend/src/pages/AddRecipePage.jsx
git commit -m "feat: display specific scraper error messages in import UI"
```

---

### Task 6: End-to-end verification

**Step 1: Test successful JSON-LD import**

Import a recipe from a popular site (e.g., allrecipes.com). Verify:
- Ingredients are parsed with structured amount/unit/name
- Recipe preview form shows correct data
- Save works and recipe displays correctly

**Step 2: Test a blocked/failing site**

Try importing from a site that blocks scrapers. Verify a specific error message appears instead of the generic "Failed to import recipe".

**Step 3: Test the heuristic parser**

Find a recipe page without JSON-LD/microdata. Verify the heuristic parser extracts at least some content.

**Step 4: Push all changes**

```bash
git push
```
