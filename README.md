# Cookslate

**Your recipes. Your way.**

A recipe manager that remembers how *you* cook — not just what you cook. Self-hosted on any PHP hosting, no Docker required.

## Features

**Free (open source):**
- Import recipes from any URL
- Full-text search across titles, descriptions, and ingredients
- Tags, favorites, and ratings
- Cook Mode — step-by-step with timers, wake lock, and vibration alerts
- Mobile-friendly responsive design
- Dark mode

**Pro ($9.99 one-time):**
- Meal planning with weekly view
- Grocery list generation from meal plans
- Cook tracking — journal, stats, forgotten favorites
- Recipe annotations (margin notes)
- Multi-user household support (up to 5)
- Data export (JSON-LD, Cooklang)
- PWA with offline support

## Quick Start

1. Clone the repo to your web server's document root
2. Copy `api/.env.example` to `api/.env` and configure database credentials
3. Create a MySQL database and import `database/schema.sql`
4. Run `cd frontend && npm install && npm run build`
5. Point your web server to the project root (Apache with mod_rewrite, or Caddy)
6. Visit your site and run the install wizard at `/api/install.php`
7. Start importing recipes!

## Requirements

- PHP 8.1+ with GD, PDO MySQL, OpenSSL extensions
- MySQL 8.0+
- Node.js 18+ (for building the frontend)
- Apache with mod_rewrite (or Caddy/Nginx with equivalent config)

## Tech Stack

- **Backend:** PHP (custom microframework, no dependencies)
- **Frontend:** React 18 + Vite + Tailwind CSS 4
- **Database:** MySQL
- **Icons:** Lucide React

## License

- Free-tier code (`api/`, `frontend/src/`, excluding `pro/` directories): [MIT](LICENSE)
- Pro-tier code (`api/pro/`, `frontend/src/pro/`): [BSL 1.1](LICENSE-BSL.md) — converts to MIT on 2029-03-24

## Links

- [Get a Pro license](https://cookslate.com)
- [Report a bug](https://github.com/frobinson47/cookslate/issues)
