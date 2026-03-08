# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Crumble is a self-hosted recipe management app with a PHP API backend and React frontend, running on Laragon/Apache with MySQL.

## Development Commands

### Frontend (from `frontend/`)
```bash
npm run dev       # Vite dev server on port 5176, proxies /api to crumble.fmr.local
npm run build     # Production build to dist/
npm run lint      # ESLint
```

### Backend Tests (from `api/`)
```bash
vendor/bin/phpunit                          # All tests
vendor/bin/phpunit tests/Unit               # Unit tests only
vendor/bin/phpunit tests/Unit/SomeTest.php  # Single test file
```

### Database
- Schema: `database/schema.sql`
- Migrations: `database/migrations/` (numbered SQL files, apply manually)

## Architecture

### Backend (`api/`)
Custom PHP microframework — no external framework. `api/index.php` is the single entry point and manual router.

**Request flow:** `.htaccess` rewrites → `index.php` (parses URL segments, applies middleware) → Controller → Model → JSON response.

**URL structure:** `/api/{resource}/{id}/{subResource}/{subId}` (also supports `/crumble/api/` prefix).

**Key directories:**
- `controllers/` — Request handlers (AuthController, RecipeController, GroceryController, etc.)
- `models/` — Database queries via PDO singleton (`Database` model)
- `services/` — Business logic: RecipeScraper, IngredientParser, ImageProcessor, MealieImporter, PaprikaImporter
- `middleware/` — Auth, CSRF, RateLimiter, DemoGuard
- `config/` — env loader, database connection, constants

### Frontend (`frontend/`)
React 18 + Vite + Tailwind CSS 4. SPA with React Router.

**Key patterns:**
- Auth via `useAuth()` hook (React Context wrapping PHP sessions)
- CSRF token fetched from `/auth/me` after login, sent as `X-CSRF-Token` header
- Centralized API client in `src/services/api.js`
- Protected routes via `ProtectedRoute` component

### Authentication
- Session-based with PHP sessions (2-hour timeout, HttpOnly, SameSite=Lax)
- Account lockout: 5 failed attempts → 15 min lockout
- Authentik SSO support via `X-Authentik-Username`/`X-Authentik-Email` headers
- Demo account: `is_demo` flag, DemoGuard middleware blocks writes
- Roles: `admin` or `member`

### Database (MySQL)
Core tables: `users`, `recipes`, `ingredients`, `tags`, `recipe_tags`, `grocery_lists`, `grocery_items`, `favorites`, `ratings`, `cook_log`. Full-text index on `recipes(title, description)`.

## Conventions

- All API responses are JSON
- Recipe instructions stored as JSON array in the database
- Images processed server-side (max 800px width, thumbnails at 300px)
- Rate limiting is file-based (temp dir), no Redis dependency
- Frontend uses Lucide React for icons
