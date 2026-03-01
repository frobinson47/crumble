# Crumble — Autonomous Build Instructions

**Target:** One-shot autonomous execution. Zero human intervention required.
**Project directory:** D:\laragon\www\crumble\
**Environment:** Windows Server, Laragon (PHP 8.3, MySQL), Node.js v24, npm 11, Vite
**Vite dev port:** 5176 (ports 5173-5175, 3000-3001, 8080 already in use)

---

## Phase 1: Project Scaffolding

### 1.1 Create directory structure

```
D:\laragon\www\crumble\
├── frontend/           # React Vite app
├── api/
│   ├── index.php       # Entry point / router
│   ├── .htaccess       # URL rewriting
│   ├── config/
│   │   ├── database.php
│   │   └── constants.php
│   ├── controllers/
│   │   ├── AuthController.php
│   │   ├── RecipeController.php
│   │   ├── TagController.php
│   │   ├── GroceryController.php
│   │   └── UserController.php
│   ├── models/
│   │   ├── Database.php
│   │   ├── Recipe.php
│   │   ├── User.php
│   │   ├── Tag.php
│   │   ├── GroceryList.php
│   │   └── GroceryItem.php
│   ├── services/
│   │   ├── RecipeScraper.php
│   │   └── ImageProcessor.php
│   └── middleware/
│       └── Auth.php
├── uploads/
│   └── recipes/        # Recipe images stored here
├── database/
│   └── schema.sql      # Full database schema
└── docs/
```

### 1.2 Initialize frontend

```bash
cd D:\laragon\www\crumble
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install react@18 react-dom@18 react-router-dom@6 tailwindcss @tailwindcss/vite lucide-react
```

**Note:** Pin React 18 explicitly. Vite may default to React 19 which has breaking changes.

### 1.3 Configure Vite

File: `frontend/vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/crumble/',
  server: {
    port: 5176,
    strictPort: true,
    proxy: {
      '/crumble/api': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/crumble/uploads': {
        target: 'http://localhost',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
  }
})
```

### 1.4 Configure Tailwind

File: `frontend/src/index.css`

```css
@import "tailwindcss";

@theme {
  --color-cream: #FFF8F0;
  --color-cream-dark: #F5EDE3;
  --color-terracotta: #C1694F;
  --color-terracotta-light: #D4896F;
  --color-terracotta-dark: #A8533A;
  --color-brown: #3E2723;
  --color-brown-light: #5D4037;
  --color-sage: #7D9B76;
  --color-sage-light: #A8C5A0;
  --color-sage-dark: #5F7A58;
  --color-warm-gray: #8D7B6E;
  --font-family-display: 'Nunito', sans-serif;
  --font-family-body: 'Nunito', sans-serif;
}
```

Load Nunito from Google Fonts in `frontend/index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap" rel="stylesheet">
```

---

## Phase 2: Database

### 2.1 Create MySQL database

Database name: `crumble_db`
Charset: `utf8mb4`
Collation: `utf8mb4_unicode_ci`

### 2.2 Run schema

File: `database/schema.sql`

```sql
CREATE DATABASE IF NOT EXISTS crumble_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE crumble_db;

-- Idempotent: DROP IF EXISTS before each CREATE to support re-runs
DROP TABLE IF EXISTS grocery_items;
DROP TABLE IF EXISTS grocery_lists;
DROP TABLE IF EXISTS recipe_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  prep_time INT DEFAULT NULL,
  cook_time INT DEFAULT NULL,
  servings INT DEFAULT NULL,
  source_url VARCHAR(2048) DEFAULT NULL,
  image_path VARCHAR(255) DEFAULT NULL,
  instructions JSON NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FULLTEXT INDEX idx_recipe_search (title, description)
) ENGINE=InnoDB;

CREATE TABLE ingredients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipe_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount VARCHAR(50) DEFAULT NULL,
  unit VARCHAR(50) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  INDEX idx_ingredient_recipe (recipe_id)
) ENGINE=InnoDB;

CREATE TABLE tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE recipe_tags (
  recipe_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (recipe_id, tag_id),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE grocery_lists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE grocery_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  list_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount VARCHAR(50) DEFAULT NULL,
  unit VARCHAR(50) DEFAULT NULL,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  recipe_id INT DEFAULT NULL,
  FOREIGN KEY (list_id) REFERENCES grocery_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,
  INDEX idx_grocery_list (list_id)
) ENGINE=InnoDB;

-- Seed admin user (password: "admin" — MUST be changed on first login)
INSERT INTO users (username, password_hash, role)
VALUES ('admin', '$2y$10$placeholder_will_be_generated_at_runtime', 'admin');
```

Note: The seed admin password hash must be generated at runtime using PHP's `password_hash('admin', PASSWORD_DEFAULT)`. Create an install script `api/install.php` that:
1. Reads database/schema.sql and executes it
2. Generates a proper bcrypt hash for the default admin password "admin"
3. Updates the admin user row with the real hash
4. Outputs success message
5. Deletes itself after successful execution (security)

### 2.3 Database config

File: `api/config/database.php`

```php
<?php
return [
    'host' => 'localhost',
    'dbname' => 'crumble_db',
    'username' => 'root',
    'password' => '',
    'charset' => 'utf8mb4',
];
```

---

## Phase 3: PHP API Backend

### 3.1 Router / Entry Point

File: `api/index.php`

Simple router that:
1. Sets CORS headers:
   - `Access-Control-Allow-Origin: http://localhost:5176` (dev) or same-origin (prod)
   - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
   - `Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With`
   - `Access-Control-Allow-Credentials: true`
   - Handle OPTIONS preflight: return 200 with headers immediately, no further processing
2. Starts PHP session with `session_set_cookie_params(['samesite' => 'Lax', 'httponly' => true])`
3. Parses the request URI to extract: method (GET/POST/PUT/DELETE), path segments, query params
4. Routes to the appropriate controller method
5. Returns JSON responses with proper HTTP status codes. Standard error format: `{"error": "message", "code": 400}`
6. Catches exceptions and returns JSON error responses

File: `api/.htaccess`

```
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
```

### 3.2 Database Model

File: `api/models/Database.php`

Singleton PDO connection using config from `config/database.php`. Sets PDO error mode to exceptions, default fetch mode to FETCH_ASSOC.

### 3.3 Auth Middleware

File: `api/middleware/Auth.php`

- `requireAuth()` — checks for active PHP session with user_id. Returns 401 if not authenticated.
- `requireAdmin()` — checks auth + role === 'admin'. Returns 403 if not admin.

### 3.4 Controllers

**AuthController.php**
- `login(username, password)` — Validate credentials with `password_verify()`. Start session, store user_id and role. Return user object (no password hash).
- `logout()` — Destroy session. Return success.
- `me()` — Return current user from session, or 401.

**RecipeController.php**
- `list(page, perPage, search, tag)` — Paginated recipe list. If search param present, use MySQL FULLTEXT search on title+description. If tag param, JOIN through recipe_tags. Return recipes with their tags and ingredient count. Default 20 per page.
- `get(id)` — Single recipe with all ingredients (ordered by sort_order), all tags. Include prev/next recipe IDs for navigation.
- `create(data)` — Auth required. Insert recipe, ingredients (loop with sort_order), and tags (find-or-create). Handle image upload if present. Return created recipe.
- `update(id, data)` — Auth required. Must be creator or admin. Update recipe fields. Delete existing ingredients and re-insert (simpler than diffing). Sync tags. Return updated recipe.
- `delete(id)` — Auth required. Must be creator or admin. Delete recipe (cascades to ingredients, recipe_tags). Delete associated image files. Return success.
- `import(url)` — Auth required. Call RecipeScraper service. Return parsed recipe data (do NOT save yet — frontend shows preview for user to edit first).

**TagController.php**
- `list()` — All tags with recipe count per tag. Ordered alphabetically.

**GroceryController.php**
- `listAll()` — Auth required. All grocery lists for current user.
- `create(name)` — Auth required. Create new list.
- `get(id)` — Auth required. Must be owner. List with all items.
- `addItem(listId, name, amount, unit)` — Add single item.
- `updateItem(listId, itemId, fields)` — Update checked status, name, amount, unit.
- `deleteItem(listId, itemId)` — Remove item.
- `addRecipe(listId, recipeId)` — Bulk add all ingredients from a recipe as grocery items. Set recipe_id on each item. If an item with the same name already exists in the list, combine amounts if units match.

**UserController.php** (admin only)
- `list()` — All users (no password hashes).
- `create(username, password, role)` — Create user with `password_hash()`.
- `resetPassword(id, newPassword)` — Update password hash.

### 3.5 Recipe Scraper Service

File: `api/services/RecipeScraper.php`

Input: URL string
Output: Parsed recipe object `{ title, description, prepTime, cookTime, servings, ingredients[], instructions[], imageUrl, sourceUrl }`

Process:
1. Validate URL: must be http:// or https:// scheme only (block file://, ftp://, etc.). Resolve hostname and reject private IP ranges (127.x, 10.x, 192.168.x, 172.16-31.x) to prevent SSRF.
2. Fetch URL content using `file_get_contents()` with a browser-like User-Agent header and stream context (timeout 10s)
3. Try JSON-LD extraction first:
   - Regex or DOM parse for `<script type="application/ld+json">`
   - JSON decode, look for `@type: "Recipe"` (may be nested in `@graph`)
   - Map schema.org Recipe fields to our format
   - Parse `PT30M` ISO 8601 duration strings to minutes
   - Parse ingredients from `recipeIngredient` array
   - Parse instructions from `recipeInstructions` (may be string array or HowToStep objects)
4. If JSON-LD fails, try microdata:
   - DOM parse for elements with `itemtype="https://schema.org/Recipe"`
   - Extract `itemprop` attributes
5. If microdata fails, fallback to Open Graph:
   - Extract `og:title`, `og:description`, `og:image` from meta tags
   - Return partial data (title + image at minimum)
6. Strip all HTML tags from parsed text fields (title, description, ingredient names, instruction steps) using `strip_tags()`. This prevents stored XSS from malicious recipe sites.
7. Return parsed data. Never throw — return partial data with empty fields for what couldn't be parsed.

### 3.6 Image Processor Service

File: `api/services/ImageProcessor.php`

Input: Uploaded file ($_FILES), recipe ID
Output: Relative image path string

Process:
1. Validate file type (JPEG, PNG, WebP, GIF only)
2. Validate file size (max 10MB)
3. Create directory `uploads/recipes/{recipeId}/`
4. Use PHP GD to create two versions:
   - Full: max 800px wide, maintain aspect ratio, save as JPEG quality 85
   - Thumb: max 300px wide, maintain aspect ratio, save as JPEG quality 80
5. Name files: `full.jpg`, `thumb.jpg`
6. Return path: `recipes/{recipeId}/full.jpg`

---

## Phase 4: React Frontend

### 4.1 App Structure

```
frontend/src/
├── App.jsx              # Router setup, auth context provider
├── main.jsx             # Entry point
├── index.css            # Tailwind imports + theme
├── components/
│   ├── layout/
│   │   ├── Header.jsx       # Top bar with logo, search
│   │   ├── BottomNav.jsx    # Mobile bottom navigation
│   │   ├── Sidebar.jsx      # Desktop sidebar navigation
│   │   └── Layout.jsx       # Responsive wrapper (sidebar on desktop, bottom nav on mobile)
│   ├── recipe/
│   │   ├── RecipeCard.jsx   # Grid card with image, title, time, tags
│   │   ├── RecipeGrid.jsx   # Responsive grid of RecipeCards
│   │   ├── IngredientList.jsx
│   │   ├── StepList.jsx
│   │   ├── CookMode.jsx     # Full-screen cook mode component
│   │   ├── ImportForm.jsx   # URL import with preview
│   │   └── RecipeForm.jsx   # Manual entry / edit form
│   ├── grocery/
│   │   ├── GroceryList.jsx
│   │   └── GroceryItem.jsx
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   ├── TagBadge.jsx
│   │   ├── Timer.jsx        # Countdown timer for cook mode
│   │   └── Spinner.jsx
│   └── auth/
│       └── ProtectedRoute.jsx
├── pages/
│   ├── HomePage.jsx         # Recipe grid + search + filters
│   ├── RecipePage.jsx       # Single recipe detail view
│   ├── AddRecipePage.jsx    # New recipe (import or manual)
│   ├── EditRecipePage.jsx   # Edit existing recipe
│   ├── GroceryPage.jsx      # Grocery lists
│   ├── LoginPage.jsx
│   └── AdminPage.jsx        # User management (admin only)
├── hooks/
│   ├── useAuth.js           # Auth context hook
│   ├── useRecipes.js        # Recipe CRUD operations
│   ├── useGrocery.js        # Grocery list operations
│   └── useWakeLock.js       # Screen wake lock for cook mode
├── services/
│   └── api.js               # Fetch wrapper for all API calls
└── assets/
    └── placeholder.jpg      # Default recipe image
```

### 4.2 API Service

File: `frontend/src/services/api.js`

Thin fetch wrapper:
- Base URL: `/api` (proxied in dev, same-origin in prod)
- Auto-includes credentials (cookies for PHP session)
- JSON request/response by default
- Multipart for file uploads
- Throws on non-2xx with error message from response body
- Exports named functions: `login()`, `logout()`, `getMe()`, `getRecipes()`, `getRecipe()`, `createRecipe()`, `updateRecipe()`, `deleteRecipe()`, `importRecipe()`, `getTags()`, `getGroceryLists()`, `createGroceryList()`, `getGroceryList()`, `addGroceryItem()`, `updateGroceryItem()`, `deleteGroceryItem()`, `addRecipeToGrocery()`, `getUsers()`, `createUser()`, `resetPassword()`

### 4.3 Auth Context

File: `frontend/src/hooks/useAuth.js`

React context that:
- On mount, calls `GET /api/auth/me` to check session
- Provides: `user`, `login()`, `logout()`, `isAdmin`, `isLoading`
- `login()` calls API then refreshes user state
- `logout()` calls API then clears user state

### 4.4 Routing

File: `frontend/src/App.jsx`

```
/              → HomePage (protected)
/recipe/:id   → RecipePage (protected)
/add           → AddRecipePage (protected)
/edit/:id      → EditRecipePage (protected)
/grocery       → GroceryPage (protected)
/admin         → AdminPage (protected, admin only)
/login         → LoginPage (public)
```

### 4.5 Key Component Behaviors

**HomePage.jsx**
- Loads recipes with `useRecipes` hook
- Search input at top — debounced 300ms, sends search param to API
- Tag filter pills below search — clicking a tag filters; active tag is highlighted
- Infinite scroll or "Load More" button for pagination
- Floating "+" button (mobile) or prominent "Add Recipe" button (desktop)

**RecipePage.jsx**
- Fetches single recipe by ID
- Hero image (full width on mobile, contained on desktop)
- Metadata row: prep time, cook time, servings (with icons)
- Tags as colored pills
- Two-column layout on desktop: ingredients (sticky left column), instructions (right)
- Single column on mobile: metadata → ingredients → instructions
- "Start Cooking" button → opens CookMode component
- "Add to Grocery List" button → modal to select which list (or create new), then adds all ingredients
- Edit/Delete buttons visible only to creator or admin
- Source URL shown as link if recipe was imported

**CookMode.jsx**
- Full-screen overlay (position fixed, z-50)
- Activates Wake Lock API via `useWakeLock` hook
- Shows current step number and total (e.g. "Step 3 of 8")
- Large, readable step text (min 20px font on mobile)
- Previous/Next buttons at bottom, large tap targets
- Swipe gesture support (touch events) for advancing steps
- Slide-out ingredient panel (swipe from left edge or tap ingredient icon)
- Timer detection: regex scan step text for patterns like "(\d+)\s*(minutes?|mins?|hours?|hrs?)" — show "Start Timer" button when found
- Timer component: countdown with audio alert (simple beep) when done
- Close button (X) in top corner to exit cook mode
- Dark/dim background option for kitchen use

**RecipeForm.jsx** (used by AddRecipePage and EditRecipePage)
- Title input (required)
- Description textarea
- Prep time, cook time, servings inputs (number, optional)
- Ingredients section:
  - Dynamic rows: amount input (short), unit dropdown (cups, tbsp, tsp, oz, lb, g, kg, ml, L, pieces, cloves, pinch, to taste, custom), name input
  - "Add ingredient" button appends row
  - Drag handle or up/down buttons to reorder
  - Delete (X) button per row
- Instructions section:
  - Dynamic rows: numbered step text (textarea, auto-expand)
  - "Add step" button
  - Reorder and delete per step
- Tags input: text input with autocomplete from existing tags. Comma or Enter to add. Shows as removable pills.
- Image upload: click to browse or drag-and-drop. Preview thumbnail shown.
- Save button

**ImportForm.jsx** (used by AddRecipePage)
- URL input + "Import" button
- On submit: calls `/api/recipes/import` with URL
- Shows loading spinner while scraping
- On success: populates RecipeForm with parsed data for user to review and edit
- On partial success: populates what was found, highlights empty required fields
- On failure: shows error, offers to switch to manual entry

**GroceryPage.jsx**
- List of grocery lists (cards with name, item count, date)
- "New List" button → name input modal
- Click list → shows items
- Items are checkable (checkbox + text)
- Checked items get strikethrough + move to bottom of list
- Add item inline (text input at bottom of list)
- Swipe left to delete item (mobile) or show delete icon on hover (desktop)
- If item has recipe_id, show small recipe name label

### 4.6 Wake Lock Hook

File: `frontend/src/hooks/useWakeLock.js`

```js
// Uses navigator.wakeLock.request('screen')
// Acquires lock on mount, releases on unmount
// Re-acquires on visibility change (tab switching releases it)
// Exports: { isSupported, isActive, request, release }
```

### 4.7 Responsive Design Rules

- Mobile-first: all base styles for < 768px
- `md:` breakpoint (768px+): two-column layouts, sidebar appears, bottom nav hides
- `lg:` breakpoint (1024px+): wider content area, three-column recipe grid
- Bottom nav (mobile): 4 items — Home (grid icon), Add (plus icon), Grocery (shopping cart icon), Profile (user icon)
- Sidebar (desktop): same 4 items + expanded labels, plus admin link if admin

### 4.8 Color/Style Application

All components use the Tailwind theme tokens defined in index.css:
- Page backgrounds: `bg-cream`
- Card backgrounds: `bg-white` with `shadow-md` and `rounded-2xl`
- Primary buttons: `bg-terracotta text-white hover:bg-terracotta-dark`
- Secondary buttons: `bg-sage text-white hover:bg-sage-dark`
- Text: `text-brown` for headings, `text-brown-light` for body
- Tags: `bg-sage-light text-sage-dark rounded-full px-3 py-1`
- Inputs: `border-cream-dark focus:border-terracotta rounded-xl`
- Transitions: `transition-colors duration-200` on interactive elements

---

## Phase 5: Integration & Polish

### 5.1 Install Script

File: `api/install.php`

Accessible at `localhost/crumble/api/install.php`. On load:
1. Read and execute `../database/schema.sql` via PDO (execute each statement separately — PDO::exec doesn't support multi-statement by default, so split on semicolons or use multi_query approach)
2. Generate bcrypt hash for password "admin" using `password_hash('admin', PASSWORD_DEFAULT)`
3. Update the admin user row: `UPDATE users SET password_hash = ? WHERE username = 'admin'`
4. Create `uploads/recipes/` directory with write permissions if it doesn't exist
5. Output JSON response: `{"success": true, "message": "Installation complete", "credentials": {"username": "admin", "password": "admin"}, "warning": "Change the admin password after first login"}`
6. Rename install.php to install.php.bak (safer than delete on Windows due to file lock issues)

### 5.2 Production Build

`npm run build` in frontend/ outputs to `frontend/dist/`. Laragon serves `frontend/dist/index.html` as the app entry. PHP API accessible at `/api/`. Need an `.htaccess` in the crumble root to:
1. Route `/api/*` to `api/index.php`
2. Route `/uploads/*` to static files
3. Route everything else to `frontend/dist/index.html` (SPA fallback)

File: `crumble/.htaccess`

```
RewriteEngine On

# API routes
RewriteRule ^api/(.*)$ api/index.php [QSA,L]

# Uploaded files
RewriteCond %{REQUEST_URI} ^/crumble/uploads/
RewriteRule ^(.*)$ $1 [L]

# Frontend static assets
RewriteCond %{REQUEST_URI} ^/crumble/frontend/dist/
RewriteRule ^(.*)$ $1 [L]

# SPA fallback
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ frontend/dist/index.html [QSA,L]
```

### 5.3 Git Init

```bash
cd D:\laragon\www\crumble
git init
```

File: `.gitignore`

```
node_modules/
frontend/dist/
uploads/recipes/*
!uploads/recipes/.gitkeep
api/config/database.php
.env
```

Create `uploads/recipes/.gitkeep` (empty file).

---

## Execution Order (Deterministic — follow exactly)

**STOP CONDITION:** If any step fails, do NOT continue. Fix the failure before proceeding.

### Stage A: Foundation (must complete before Stage B)
1. Create all directories (api/, api/config/, api/controllers/, api/models/, api/services/, api/middleware/, uploads/recipes/, database/, docs/)
2. Git init + .gitignore + uploads/recipes/.gitkeep
3. Write database/schema.sql
4. Write api/config/database.php and api/config/constants.php
5. Write api/models/Database.php — verify PDO connection works by running a test query

### Stage B: Backend API (must complete before Stage C)
6. Write api/.htaccess
7. Write api/middleware/Auth.php
8. Write all model files (Recipe.php, User.php, Tag.php, GroceryList.php, GroceryItem.php)
9. Write all controller files (AuthController, RecipeController, TagController, GroceryController, UserController)
10. Write api/services/RecipeScraper.php
11. Write api/services/ImageProcessor.php
12. Write api/index.php (router)
13. Write api/install.php
14. Write root .htaccess
15. **CHECKPOINT:** Run install.php via curl/browser. Verify: database created, admin user exists, can login via API, CORS headers present on responses.

### Stage C: Frontend (must complete before Stage D)
16. Scaffold React frontend via Vite (npm create vite, install pinned dependencies)
17. Configure vite.config.js (port 5176, base, proxy)
18. Configure Tailwind theme in index.css, add Nunito font to index.html
19. Build UI primitives: Button, Input, Modal, TagBadge, Timer, Spinner
20. Build layout components: Header, BottomNav, Sidebar, Layout
21. Build auth: useAuth hook, ProtectedRoute, LoginPage
22. Build API service layer (services/api.js)
23. **CHECKPOINT:** Start Vite dev server. Verify: app loads on localhost:5176, login works, session persists.

### Stage D: Features
24. Build HomePage (RecipeCard, RecipeGrid, search, tag filter, pagination)
25. Build RecipeForm + AddRecipePage (manual entry with dynamic ingredients/steps)
26. Build ImportForm (URL import with preview)
27. Build RecipePage (detail view with two-column layout)
28. Build CookMode (full-screen, step-by-step, wake lock, timers)
29. Build EditRecipePage
30. Build GroceryPage (lists, items, check-off, add-from-recipe)
31. Build AdminPage (user management)
32. Build useWakeLock hook

### Stage E: Verification
33. **FINAL CHECK:** Test login as admin. Create a recipe manually. Import a recipe from a real URL (try allrecipes.com or similar). Enter cook mode. Add ingredients to a grocery list. Check off items. Edit recipe. Delete recipe. Create a second user. Verify all flows work.

## Critical Details That Must Not Be Missed

- **Laragon uses Apache by default.** The .htaccess rewrite rules are correct for this environment. Do NOT switch to Nginx config.
- **Vite base path:** `base: '/crumble/'` is REQUIRED because the app lives in a subdirectory. Without it, all asset paths will 404.
- PHP session CORS: `session_set_cookie_params(['samesite' => 'Lax', 'httponly' => true])` and `Access-Control-Allow-Credentials: true` header
- CORS preflight: Must handle OPTIONS requests explicitly, returning Allow-Methods (GET, POST, PUT, DELETE, OPTIONS) and Allow-Headers (Content-Type, Accept, X-Requested-With)
- Vite proxy must forward cookies: `changeOrigin: true` is not enough — the fetch calls in React must include `credentials: 'include'`
- MySQL JSON column: `instructions` uses MySQL 8+ native JSON. All queries use JSON functions if needed.
- Image upload: `enctype="multipart/form-data"` on the form, and the API service must use FormData (not JSON) for recipe create/update when an image is attached.
- Wake Lock API: only works on HTTPS or localhost. Works in dev (localhost:5176). For production on LAN, need HTTPS or users access via localhost.
- Recipe scraper: validate URL scheme (http/https only), block private IPs (SSRF prevention), set browser-like User-Agent, strip HTML tags from all parsed text fields.
- PHP `file_get_contents` for URL fetching: ensure `allow_url_fopen = On` in php.ini (Laragon default is On).
- Ingredient amount field is VARCHAR not DECIMAL — allows "1/2", "2-3", "to taste" etc.
- Tag autocomplete: fetch all tags once on component mount, filter client-side. Re-fetch after creating a new tag.
- **Never use `dangerouslySetInnerHTML`** — React's default escaping handles XSS for all rendered text.
- All database writes that span multiple tables (recipe + ingredients + tags) must use PDO transactions (`beginTransaction`, `commit`, `rollback` on error).
