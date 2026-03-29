#!/bin/bash
set -e

echo "Cookslate: Starting up..."

# Wait for MySQL to be ready (use PHP since mysqladmin may not be available)
echo "Waiting for MySQL..."
max_tries=60
count=0
until php -r "new PDO('mysql:host=${DB_HOST};port=${DB_PORT}', '${DB_USER}', '${DB_PASS}');" 2>/dev/null; do
    count=$((count + 1))
    if [ $count -ge $max_tries ]; then
        echo "ERROR: MySQL not reachable after ${max_tries} seconds"
        exit 1
    fi
    echo "  MySQL not ready yet (attempt $count/$max_tries)..."
    sleep 1
done
echo "MySQL is ready."

# Generate .env if it doesn't exist
if [ ! -f /var/www/html/api/.env ]; then
    echo "Generating api/.env..."
    cat > /var/www/html/api/.env << ENVEOF
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${DB_NAME:-cookslate_db}
DB_USER=${DB_USER:-cookslate}
DB_PASS=${DB_PASS:-cookslate}
CORS_ORIGINS=http://localhost:8080
APP_ENV=production
APP_URL=http://localhost:8080
ENVEOF
fi

# Apply schema on first boot (check if recipes table exists)
table_exists=$(php -r "
\$pdo = new PDO('mysql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_NAME}', '${DB_USER}', '${DB_PASS}');
\$stmt = \$pdo->query(\"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='recipes'\");
echo \$stmt->fetchColumn();
" 2>/dev/null || echo "0")

if [ "$table_exists" = "0" ]; then
    echo "First boot - applying database schema..."
    php -r "
    \$pdo = new PDO('mysql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_NAME}', '${DB_USER}', '${DB_PASS}');
    \$sql = file_get_contents('/var/www/html/database/schema.sql');
    // Strip CREATE DATABASE block, USE line, and seed users (install wizard handles user creation)
    \$sql = preg_replace('/CREATE DATABASE.*?;\s*/s', '', \$sql);
    \$sql = preg_replace('/^USE\s+\w+;\s*/m', '', \$sql);
    \$sql = preg_replace('/^--.*seed.*$/mi', '', \$sql);
    \$sql = preg_replace('/^INSERT INTO users.*?;\s*/ms', '', \$sql);
    \$pdo->exec(\$sql);
    echo 'Schema applied.';
    "
else
    echo "Database already initialized."
fi

# Apply any pending migrations
for migration in /var/www/html/database/migrations/*.sql; do
    [ -f "$migration" ] || continue
    php -r "
    \$pdo = new PDO('mysql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_NAME}', '${DB_USER}', '${DB_PASS}');
    \$sql = file_get_contents('$migration');
    try { \$pdo->exec(\$sql); } catch (Exception \$e) {}
    " 2>/dev/null || true
done

# Unblock install.php if no users exist yet (first-run)
if [ "$table_exists" = "0" ] || [ "$(php -r "
\$pdo = new PDO('mysql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_NAME}', '${DB_USER}', '${DB_PASS}');
\$stmt = \$pdo->query('SELECT COUNT(*) FROM users');
echo \$stmt->fetchColumn();
" 2>/dev/null)" = "0" ]; then
    echo "No users found - enabling install wizard..."
    sed -i '/<FilesMatch "^install\\.php">/,/<\/FilesMatch>/d' /var/www/html/api/.htaccess
fi

# Fix permissions
chown -R www-data:www-data /var/www/html/uploads

echo "Cookslate: Ready!"

# Start Apache
exec apache2-foreground
