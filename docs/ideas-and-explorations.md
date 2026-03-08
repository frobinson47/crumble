# Crumble — Ideas, Explorations & Honest Assessments

*Started: 2026-03-08 — A living document of thoughts on where Crumble could go.*

---

## Where Crumble Stands Today

After spending time digging through the codebase and looking at the self-hosted recipe manager landscape (Mealie, Tandoor, KitchenOwl, Grocy, Recipya), I think Crumble occupies an interesting niche. It's *deliberately simple*. No Docker requirement, no Python/Node backend complexity — just PHP, MySQL, and a React frontend. That's its strength and its constraint.

The codebase is clean. No TODO debris, consistent patterns, good security posture (CSRF, rate limiting, account lockout, SSRF protection). The custom PHP router is lightweight and readable. But there are cracks worth examining.

---

## Things That Should Be Fixed Before New Features

These aren't glamorous, but they matter:

### 1. The N+1 Problem in Recipe Detail
`Recipe.findById()` fires **7 separate queries** per recipe view: avg rating, favorite count, user favorite status, user rating, cook count, prev/next IDs. These could be collapsed into 1-2 queries with JOINs or subqueries. On a database with thousands of recipes, this will feel slow.

### 2. Hardcoded Laragon CA Path
`RecipeScraper` has `D:/laragon/etc/ssl/cacert.pem` hardcoded. This will break on any non-Laragon deployment. Should be configurable via `.env` or use the system default.

### 3. Nutrition Fields Are in Limbo
The database has columns for calories, protein, carbs, fat, fiber, sugar — but they're VARCHAR (not numeric), the frontend only shows them conditionally, and there's no way to populate them from scraping. Either commit to nutrition tracking or remove the dead weight.

### 4. Grocery Item Property Mismatch
`GroceryItem.jsx` references `item.recipe_name` but the backend returns `recipe_title`. This is a silent bug — the recipe origin probably never displays correctly in the grocery list.

### 5. No Error Boundaries
If any React component throws during render, the entire app white-screens. A simple `<ErrorBoundary>` wrapper around route content would prevent this.

---

## Feature Ideas — Ranked by Impact vs. Effort

### Tier 1: High Impact, Moderate Effort

#### Meal Planning
Every serious competitor has this (Mealie, Tandoor, KitchenOwl, Grocy). The pattern is well-established:
- Calendar-style weekly view
- Drag recipes onto days/meals (breakfast, lunch, dinner)
- "Add all ingredients to grocery list" for a day or week
- Database: `meal_plans` table with `date`, `meal_type`, `recipe_id`, `user_id`

This is probably the single most-requested feature in recipe managers. Crumble already has grocery lists — connecting them to a meal plan is a natural extension. The question is whether to keep it simple (just a week view) or go full calendar. I'd start with a simple week view.

#### Smart Grocery List Consolidation
Current grocery lists can merge quantities when units match, but can't handle "2 cups" + "16 oz" or recognize that "chicken breast" and "boneless skinless chicken breasts" are the same thing. Two approaches:
- **Unit conversion table** — map common cooking unit equivalencies. Straightforward, finite problem.
- **Ingredient normalization** — strip modifiers ("boneless", "fresh", "large") to match base ingredients. Harder but much more useful.

Even basic unit conversion would be a significant quality-of-life improvement.

#### Recipe Sharing / Public Links
Currently Crumble is single-household. But people constantly want to share recipes. A simple implementation:
- Generate a unique share token per recipe
- `/shared/{token}` renders a read-only recipe view (no auth required)
- Owner can revoke tokens

No user account complexity, no social features — just "here's a link to my recipe."

---

### Tier 2: Medium Impact, Interesting Problems

#### Social Media Recipe Import
This is a hot trend in 2026. Apps like Honeydew and Pestle let you paste an Instagram/TikTok URL and extract the recipe. The technical challenge is real:
- Video content requires AI transcription
- Instagram/TikTok APIs are restrictive
- Recipe content is often spoken, not structured

Crumble's scraper already handles structured web pages well. Extending to social media would require either:
- An external AI service (OpenAI/Claude API) to parse unstructured content
- A simpler approach: let users paste the caption text and use NLP to extract ingredients/instructions

The simpler approach might actually be more useful — most people screenshot or copy the caption anyway.

#### Cooking Mode Improvements
CookMode.jsx exists and has step-by-step navigation with timers, but it could be much more:
- **Voice control** — Web Speech API for hands-free "next step" / "start timer"
- **Inline timers** — Parse "bake for 25 minutes" from instructions and offer auto-start timers
- **Keep screen on** — `useWakeLock` hook already exists! Just needs to be activated in cook mode
- **Post-cook notes** — After finishing, prompt for notes ("too salty", "reduce garlic next time") and save to cook log

The wake lock hook is already there but I'd want to verify it's actually used in CookMode. If not, that's a quick win.

#### Recipe Scaling
"Serves 4" but you need to feed 6. This requires:
- Parsing ingredient quantities (IngredientParser already does this!)
- Multiplying amounts by a scale factor
- Handling fractional display (1.5 → "1 1/2", 0.33 → "1/3")
- Frontend slider or +/- buttons

The ingredient parser already breaks ingredients into amount/unit/name. The hard part is just the fractional display and edge cases ("a pinch of salt" doesn't scale).

---

### Tier 3: Lower Priority But Interesting to Think About

#### AI-Powered Features
The 2026 recipe app landscape is drowning in AI features. Some actually useful ones:
- **"What can I make with...?"** — Input available ingredients, get matching recipes. This is a search/filter problem more than an AI problem. Could be done with ingredient indexing.
- **Recipe suggestions based on history** — "You haven't cooked Italian in 2 weeks" or "You rated pasta dishes highly." Cook log + ratings data already exists.
- **Automatic tagging** — Parse recipe title/ingredients/instructions to suggest tags. Could use simple keyword matching without AI.

I'm skeptical of adding AI for AI's sake. Most "AI features" in recipe apps are thin wrappers around LLM APIs that add latency and cost. The ingredient-matching search is the most genuinely useful one and doesn't need AI at all.

#### Multi-User Collaboration
Tandoor and KitchenOwl both support household/group features:
- Multiple users contributing recipes
- Shared grocery lists (real-time sync)
- Per-user preferences (dietary restrictions, favorites)

Crumble already has multi-user auth with roles. Shared grocery lists would be the natural first step. Real-time sync via WebSockets or SSE would be nice but is architecturally heavy for a PHP backend. Polling every 30 seconds might be "good enough."

#### Progressive Web App (PWA)
Recipe apps benefit enormously from offline support — you're often cooking in a kitchen with spotty wifi. A service worker that caches:
- Recently viewed recipes
- The user's favorites
- Active grocery list

Would make Crumble feel native. Vite has good PWA plugin support (`vite-plugin-pwa`).

---

## Architectural Thoughts

### Should Crumble Stay PHP?
Honestly? Yes. The PHP backend is simple, fast, and works. Rewriting in Node/Go/Rust would be resume-driven development. PHP 8.x is performant, the codebase is clean, and Laragon makes deployment trivial. The only argument for switching would be WebSocket support for real-time features, but that's a bridge to cross later.

### React Query / TanStack Query
The custom hooks (`useRecipes`, `useGrocery`, etc.) work but don't cache, deduplicate, or handle stale data. React Query would add:
- Automatic caching and background refetching
- Optimistic updates (check off grocery item → instant UI, sync in background)
- Request deduplication
- Loading/error states for free

This is the highest-leverage frontend architectural change. It would make every data-fetching component faster and more resilient.

### Database Considerations
MySQL is fine for Crumble's scale. But if meal planning + more users + more data comes:
- Add indexes on `recipes.created_by` and `cook_log.user_id`
- Consider `DECIMAL` for nutrition fields instead of `VARCHAR`
- The full-text search works but is basic — for advanced recipe search (by ingredient, by cooking method), a dedicated search approach might be needed eventually

---

## What I Find Most Interesting

The **ingredient intelligence** space is where Crumble could differentiate without massive effort:
1. The IngredientParser already exists and works
2. Building an ingredient-to-recipe index would enable "what can I make?" search
3. Smart grocery consolidation builds on the same parsing
4. Recipe scaling builds on the same parsing

All four features share a foundation. Investing in making IngredientParser more robust (handling "2-3 cloves garlic", "one 14oz can", Unicode fractions) would pay dividends across multiple features.

The other thing that interests me is **the simplicity angle**. Most self-hosted recipe managers are trying to be everything — Tandoor has nutritional tracking, cost calculation, Nextcloud integration, AI ingredient recognition. Crumble could win by being the recipe manager that's *easy*. Easy to deploy, easy to use, easy to understand. Not every app needs to be a platform.

---

## Questions I Don't Have Answers To Yet

- How many recipes does a typical Crumble instance hold? 50? 500? 5000? This changes which performance optimizations matter.
- Is Crumble used by single users or households? This changes whether multi-user features matter.
- What's the deployment target? Laragon-only, or should it work on generic LAMP/Docker? The hardcoded paths suggest Laragon-only today.
- Is there interest in a mobile app, or is the PWA approach sufficient?

---

---

## Deep Dive: IngredientParser Capabilities & Gaps

*Explored 2026-03-08*

After reading the actual parser code (`api/services/IngredientParser.php`), here's what it handles:

**Works well:**
- Integer, decimal, fraction, mixed number amounts ("2", "1.5", "1/2", "1 1/2")
- Ranges ("2-3")
- 27 unit types with plural/abbreviation aliases
- Parenthetical patterns like "2 (14 oz) cans tomatoes" → amount=2, unit=can, name=(14 oz) tomatoes
- Graceful fallback — unparseable strings become the full name with null amount/unit

**Gaps that matter for grocery consolidation & recipe scaling:**
- **No Unicode fractions** — "½ cup" won't parse the amount (½ is a single character, not "1/2")
- **No word-form numbers** — "one", "two", "a dozen" are not recognized
- **No amount arithmetic** — amounts are stored as strings ("1 1/2"), not floats. Any consolidation needs a `stringToFloat` converter and a `floatToFraction` formatter.
- **No unit conversion** — knows what "cup" and "ml" are, but can't convert between them
- **No ingredient normalization** — "garlic cloves" and "cloves garlic" and "garlic, minced" are three different ingredients

**What's needed for consolidation (in order of implementation):**

1. `AmountConverter` utility — parse "1 1/2" → 1.5, and format 1.5 → "1 1/2". Handle Unicode fractions.
2. `UnitConverter` class — conversion tables for volume (tsp→tbsp→cup→pint→quart→gallon, ml→L) and weight (g→kg, oz→lb). Cross-system (cups→ml) is trickier but doable with standard cooking conversions.
3. `IngredientMatcher` — at minimum, case-insensitive trimmed comparison. Next level: strip common modifiers ("fresh", "dried", "chopped", "minced", "large", "small") before comparing.

The parser itself is solid for what it does. The gaps are in the *math layer* on top of it.

---

## Deep Dive: Meal Planning UI Patterns

*Explored 2026-03-08*

After researching meal planning UIs across Mealie, Tandoor, KitchenOwl, and design case studies:

**What works in the wild:**
- **Week-at-a-glance** is the dominant pattern. Monthly views exist but are rarely used day-to-day.
- **Simple > Structured** — apps that force breakfast/lunch/dinner slots get complaints from users who eat 2 meals or have non-traditional schedules. A flat "meals for this day" list is more flexible.
- **Quick-add is critical** — the #1 friction point is "how do I get a recipe onto my plan?" Must be <3 taps/clicks. Search + click = done.
- **Mobile = stacked days** — 7 columns doesn't work on mobile. Stack days vertically with collapsible sections or a horizontal day-picker + single-day detail view.

**Crumble-specific frontend considerations:**
- Existing search is inline with debounce in `HomePage.jsx` — not a reusable component. For meal planning, I need a recipe search modal. The existing `Modal.jsx` component supports sizes up to 'xl' and has escape/backdrop close. Good foundation.
- Nav pattern: Sidebar uses `lucide-react` icons. `CalendarDays` icon exists in Lucide and fits perfectly.
- Color palette: terracotta (#C1694F) as primary, sage (#7D9B76) as secondary. The meal plan could use sage for "planned" states to differentiate from terracotta actions.
- Card pattern: `bg-white rounded-2xl shadow-md` is consistent everywhere. Meal plan day cards should match.
- Touch targets: 44px minimum enforced throughout. Important for the day cards on mobile.
- Typography: Playfair Display (serif) for headings, Nunito (sans) for body. Week header should use serif.

**Mobile layout decision:**
A horizontal day-picker (Mon|Tue|Wed|...) fixed at top, with the selected day's meals below, is probably better than stacking all 7 days. It keeps the screen focused and matches mobile calendar patterns users already know. Desktop can show all 7 columns in a grid.

**Grocery list generation from meal plan:**
The existing `addRecipeToGrocery(listId, recipeId)` endpoint adds one recipe at a time. For meal plan → grocery, we'd want a batch endpoint that adds all planned recipes at once. The backend `GroceryController` already has smart merging for same-unit ingredients — we just need to call it in a loop or batch.

---

## Competitive Landscape Notes

*2026-03-08*

| Feature | Mealie | Tandoor | KitchenOwl | Crumble |
|---------|--------|---------|------------|---------|
| Meal Planning | Yes | Yes | Yes | **No** |
| Grocery Lists | Yes (auto from plan) | Yes | Yes (real-time sync) | Yes (manual) |
| Recipe Scaling | Yes | Yes | Yes | **No** |
| Recipe Sharing | Yes (groups) | Yes (public links) | Yes (household) | **No** |
| Offline/PWA | Partial | No | Yes (Flutter) | **No** |
| AI Features | No | Yes (ingredient recognition) | No | **No** |
| Import from URL | Yes | Yes | Yes | Yes |
| Social Import | No | No | No | **No** |
| Docker Required | Yes | Yes | Yes | **No** (advantage!) |
| Tech Stack | Python/Vue | Python/Vue | Flask/Flutter | PHP/React |

**Crumble's differentiator is deployment simplicity.** Every competitor requires Docker. Crumble runs on shared hosting with PHP and MySQL. That's a real advantage for non-technical users who just want a recipe box.

The gap to close: meal planning + recipe scaling + sharing. Those three features would make Crumble competitive with the big names while keeping its simplicity advantage.

---

## Deep Dive: Smart Grocery Consolidation — Technical Design

*Explored 2026-03-08*

After reading the actual grocery merging code (`GroceryItem::addFromRecipe()`), here's how it works today:

**Current merging logic:**
1. Fetch all ingredients from recipe (`SELECT name, amount, unit FROM ingredients WHERE recipe_id = ?`)
2. Build lookup of existing grocery items by `strtolower(trim(name))`
3. For each ingredient:
   - If name matches AND units match AND both amounts are numeric → **add amounts** (float addition)
   - If name matches but units differ or amounts non-numeric → **skip** (already exists)
   - If name doesn't match → **create new item**

**What this can't do:**
- "2 cups flour" + "8 oz flour" → stays as two items (units differ)
- "chicken breast" + "boneless skinless chicken breast" → stays as two items (names differ)
- "1 1/2 cups" + "2 cups" → stays as two items (amounts are strings, not numeric — `is_numeric("1 1/2")` returns false!)

Wait — that last one is a **bug in the existing code**. The merging only works when amounts are simple numbers like "2" or "0.5". Any mixed number ("1 1/2"), fraction ("3/4"), or range ("2-3") won't merge because `is_numeric()` returns false for those strings. This means the current "smart merging" only works for a subset of ingredients.

### Proposed Unit Conversion Table

Based on standard cooking conversions:

```php
// Volume conversions — everything in teaspoons as base unit
private const VOLUME_TO_TSP = [
    'tsp'    => 1,
    'tbsp'   => 3,
    'oz'     => 6,        // fluid ounces
    'cup'    => 48,
    'pint'   => 96,
    'quart'  => 192,
    'gallon' => 768,
    'ml'     => 0.202884, // 1 ml ≈ 0.2 tsp
    'L'      => 202.884,  // 1 L ≈ 203 tsp
];

// Weight conversions — everything in grams as base unit
private const WEIGHT_TO_G = [
    'g'  => 1,
    'kg' => 1000,
    'oz' => 28.3495,    // weight ounces
    'lb' => 453.592,
];
```

**The oz ambiguity problem:** "oz" can mean fluid ounces (volume) or weight ounces. In cooking:
- Liquids: usually fluid ounces (volume)
- Solids: usually weight ounces
- We can't know which without ingredient context

**Pragmatic solution:** Only convert within unambiguous groups:
- Volume-only: tsp ↔ tbsp ↔ cup ↔ pint ↔ quart ↔ gallon ↔ ml ↔ L
- Weight-only: g ↔ kg ↔ lb
- "oz" stays separate — don't auto-convert oz to cups or oz to grams

**Display unit preference:** When combining, prefer the larger unit if the result is ≥ 1 of that unit. "96 tsp" → "2 cups". "0.5 tsp" stays as "1/2 tsp".

### AmountConverter — Parsing and Formatting

This is needed both for grocery consolidation AND for the meal planning grocery generation (servings scaling). Should be a standalone service class:

```php
class AmountConverter {
    // Parse string amount to float
    public static function toFloat(?string $amount): ?float {
        if ($amount === null || trim($amount) === '') return null;
        $amount = trim($amount);

        // Handle Unicode fractions: ½→0.5, ⅓→0.333, ¼→0.25, ¾→0.75, ⅔→0.667, ⅛→0.125
        $unicodeMap = ['½'=>0.5, '⅓'=>0.333, '⅔'=>0.667, '¼'=>0.25, '¾'=>0.75, '⅕'=>0.2, '⅖'=>0.4, '⅗'=>0.6, '⅘'=>0.8, '⅙'=>0.167, '⅚'=>0.833, '⅛'=>0.125, '⅜'=>0.375, '⅝'=>0.625, '⅞'=>0.875];

        // Range: "2-3" → average 2.5
        if (preg_match('/^(\S+)\s*-\s*(\S+)$/', $amount, $m)) {
            $low = self::toFloat($m[1]);
            $high = self::toFloat($m[2]);
            return ($low !== null && $high !== null) ? ($low + $high) / 2 : null;
        }

        // Mixed number: "1 1/2" → 1.5
        if (preg_match('/^(\d+)\s+(\d+)\/(\d+)$/', $amount, $m)) {
            return (float)$m[1] + (float)$m[2] / (float)$m[3];
        }

        // Fraction: "3/4" → 0.75
        if (preg_match('/^(\d+)\/(\d+)$/', $amount, $m)) {
            return (float)$m[1] / (float)$m[2];
        }

        // Plain number
        if (is_numeric($amount)) return (float)$amount;

        // Check for Unicode fraction character
        foreach ($unicodeMap as $char => $val) {
            if (mb_strpos($amount, $char) !== false) {
                $prefix = trim(mb_substr($amount, 0, mb_strpos($amount, $char)));
                return ($prefix !== '' ? (float)$prefix : 0) + $val;
            }
        }

        return null; // "to taste", "a pinch", etc.
    }

    // Format float back to readable string
    public static function toString(float $value): string {
        // Common fractions lookup
        $fractions = [
            0.125 => '1/8', 0.25 => '1/4', 0.333 => '1/3',
            0.375 => '3/8', 0.5 => '1/2', 0.625 => '5/8',
            0.667 => '2/3', 0.75 => '3/4', 0.875 => '7/8',
        ];

        $whole = floor($value);
        $frac = round($value - $whole, 3);

        if ($frac < 0.01) return (string)(int)$whole;

        $fracStr = $fractions[$frac] ?? null;
        if ($fracStr !== null) {
            return $whole > 0 ? "$whole $fracStr" : $fracStr;
        }

        // Irregular decimal — round to reasonable precision
        return (string)round($value, 2);
    }
}
```

**This class should be shared** between:
1. `MealPlan::generateGroceryList()` — for servings scaling
2. `GroceryItem::addFromRecipe()` — to fix the existing merging bug and enable unit conversion
3. Future recipe scaling feature

### Implementation Plan for Consolidation

1. Create `api/services/AmountConverter.php` (standalone, no dependencies)
2. Create `api/services/UnitConverter.php` (uses AmountConverter, conversion tables)
3. Update `GroceryItem::addFromRecipe()` to use both:
   - Parse amounts with `AmountConverter::toFloat()` instead of `is_numeric()`
   - When units differ, check if `UnitConverter::canConvert($unitA, $unitB)` — if yes, convert both to a common unit and add
   - Format result with `AmountConverter::toString()`

This fixes the existing merging bug AND adds cross-unit consolidation in one change.

---

## Deep Dive: Recipe Sharing — Technical Design

*Explored 2026-03-08*

### Data Model

```sql
CREATE TABLE recipe_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipe_id INT NOT NULL,
  token CHAR(36) NOT NULL,          -- UUID v4
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,    -- 30 days from creation
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY idx_token (token),
  INDEX idx_recipe (recipe_id)
) ENGINE=InnoDB;
```

30-day expiration as discussed. `ON DELETE CASCADE` from recipes means deleting a recipe kills its share links automatically.

### API Design

```
POST   /api/recipes/{id}/share    → create share token, return { token, url, expires_at }
DELETE /api/recipes/{id}/share    → revoke all share tokens for this recipe
GET    /api/shared/{token}        → public endpoint, no auth, returns recipe data
```

The public endpoint is the interesting one. It needs to:
- Look up token, verify not expired
- Return recipe with ingredients, instructions, tags — but NOT user info, ratings, favorites, or cook history
- Be rate-limited separately from auth'd endpoints (prevent scraping)
- NOT set any session or CSRF cookies

### Frontend Approach

**Share button on RecipePage:**
- Click "Share" → POST to create token → show modal with copyable URL
- URL format: `https://crumble.fmr.local/shared/{token}`
- "Copy Link" button with clipboard API
- Show expiration date
- "Revoke" button

**Public recipe page:**
- New route: `/shared/:token` → `SharedRecipePage.jsx`
- Renders outside of `<ProtectedRoute>` and `<Layout>` — no sidebar, no nav
- Minimal branded page: Crumble logo, recipe content, "Get your own Crumble" footer link
- No edit/delete/favorite/rate buttons
- Mobile-responsive (same responsive patterns as RecipePage but simpler)

### Security Considerations

- UUID v4 tokens are 128-bit random — unguessable without the link
- 30-day expiration prevents indefinite exposure
- Public endpoint returns recipe data only — no user IDs, no session creation
- Rate limit: 30 requests per minute per IP on the public endpoint
- No search/index of shared recipes — you need the exact token

### Edge Cases

- Recipe deleted while share link exists → CASCADE deletes share, public endpoint returns 404
- User revokes and re-shares → new token, old links stop working
- Multiple shares of same recipe → could allow (multiple tokens) or enforce one active token per recipe. I'd enforce one — simpler, less confusion. `UNIQUE KEY (recipe_id)` or delete-then-insert.

Actually, on reflection: **one active share per recipe is better.** If someone shares, then shares again, they probably expect the old link to still work. So: if a share already exists and isn't expired, return the existing token. Only create new if none exists or current is expired. Revoke explicitly deletes.

This is the simplest Tier 1 feature by far — maybe 2-3 hours of work. Could be a good warm-up before tackling grocery consolidation.
