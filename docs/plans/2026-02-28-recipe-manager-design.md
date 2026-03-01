# Crumble — Design Document

**Date:** 2026-02-28
**Status:** Approved

## Overview

A self-hosted recipe manager with a modern, mobile-first UI. Replaces Mealie with something cleaner, warmer, and easier to use — especially on mobile while cooking. Runs on the existing Laragon stack (PHP + MySQL) with a React SPA frontend.

## Goals

- Clean, warm/cozy UI that works great on phones
- Import recipes from URLs + manual entry
- Cook mode: distraction-free, step-by-step cooking view
- Grocery list generation from recipes
- Household auth (no email recovery — admin resets passwords)
- Easy to edit and maintain (no Docker)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (Vite, port 5176), Tailwind CSS, React Router, Lucide icons |
| Backend | Plain PHP REST API (PDO, prepared statements) |
| Database | MySQL (Laragon) |
| Auth | PHP sessions, bcrypt password hashing |
| Images | PHP GD for resize, stored in uploads/ |

## Project Structure

```
D:\laragon\www\crumble\
├── frontend/              # React (Vite) app
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route-level views
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API client functions
│   │   └── assets/        # Images, fonts
│   └── dist/              # Built output (served by Laragon)
├── api/                   # PHP REST API
│   ├── index.php          # Router/entry point
│   ├── controllers/       # Request handlers
│   ├── models/            # Database models
│   ├── services/          # Business logic (scraper, etc.)
│   └── config/            # DB config, constants
├── uploads/               # Recipe images
└── docs/                  # Design docs, plans
```

## Data Model

### recipes
- id (PK)
- title
- description
- prep_time (minutes)
- cook_time (minutes)
- servings
- source_url (nullable)
- image_path (nullable)
- instructions (JSON array of steps)
- created_by (FK -> users)
- created_at, updated_at

### ingredients
- id (PK)
- recipe_id (FK -> recipes)
- name, amount, unit, sort_order

### tags
- id (PK)
- name (unique)

### recipe_tags
- recipe_id (FK), tag_id (FK)

### users
- id (PK)
- username, password_hash, role (admin/member)

### grocery_lists
- id (PK)
- name, created_by (FK -> users), created_at

### grocery_items
- id (PK)
- list_id (FK -> grocery_lists)
- name, amount, unit, checked (boolean)
- recipe_id (nullable — tracks source recipe)

## API Endpoints

### Auth
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### Recipes
- GET /api/recipes (list with search/filter/pagination)
- GET /api/recipes/:id
- POST /api/recipes
- PUT /api/recipes/:id
- DELETE /api/recipes/:id
- POST /api/recipes/import (scrape from URL)

### Tags
- GET /api/tags

### Grocery Lists
- GET /api/grocery-lists
- POST /api/grocery-lists
- GET /api/grocery-lists/:id
- POST /api/grocery-lists/:id/items
- PUT /api/grocery-lists/:id/items/:itemId
- DELETE /api/grocery-lists/:id/items/:itemId
- POST /api/grocery-lists/:id/add-recipe/:recipeId

### Users (admin)
- GET /api/users
- POST /api/users
- PUT /api/users/:id/reset-password

### Images
- POST /api/upload

## UI/UX Design

### Visual Style: Warm/Cozy Kitchen
- **Background:** Warm cream/off-white
- **Accents:** Terracotta/burnt orange
- **Text:** Dark brown
- **Secondary:** Sage green
- **Font:** Nunito or Quicksand (rounded, friendly)
- **Cards:** Soft rounded corners, warm shadows

### Pages
1. **Home / Recipe Grid** — Cards with photos, title, cook time, tags. Search + tag filter.
2. **Recipe Detail** — Hero image, two-column (desktop) / single-column (mobile). Cook mode button.
3. **Add/Edit Recipe** — URL import mode + manual entry mode. Dynamic ingredient rows.
4. **Grocery List** — Checklist UI. Add from recipes or manually. Check-off with strikethrough.
5. **Login** — Simple username/password. No email.

### Cook Mode
- One step at a time, large readable text
- Swipe/tap to advance steps
- Ingredient list in slide-out panel
- Screen stays awake (Wake Lock API)
- Auto-suggested timers from step text (e.g. "bake 25 minutes" -> 25min timer)

### Mobile
- Bottom nav bar (Home, Add, Grocery, Profile)
- 44px minimum tap targets
- Mobile-first responsive (< 768px, tablet, desktop)
- PWA-ready structure

## Recipe Import Strategy
1. JSON-LD structured data (@type: Recipe) — most reliable
2. Microdata (schema.org attributes) — fallback
3. Open Graph / meta tags — last resort
4. User always reviews/edits before saving

## Dev Workflow
- Frontend: `npm run dev` on port 5176, proxies /api to Laragon
- Backend: Edit PHP directly, Laragon picks up changes instantly
- Build: `npm run build` outputs to frontend/dist/

## Image Handling
- Resize on upload: max 800px width + 300px thumbnail (PHP GD)
- Stored in uploads/recipes/{id}/
- Placeholder for recipes without photos
