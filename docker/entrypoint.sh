#!/bin/bash
set -e

echo "Cookslate: Starting up..."

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
max_tries=30
count=0
until mysqladmin ping -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" --silent 2>/dev/null; do
    count=$((count + 1))
    if [ $count -ge $max_tries ]; then
        echo "ERROR: MySQL not reachable after ${max_tries} seconds"
        exit 1
    fi
    sleep 1
done
echo "MySQL is ready."

# Generate .env if it doesn't exist
if [ ! -f /var/www/html/api/.env ]; then
    echo "Generating api/.env..."
    cat > /var/www/html/api/.env <<EOF
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${DB_NAME:-cookslate_db}
DB_USER=${DB_USER:-cookslate}
DB_PASS=${DB_PASS:-cookslate}
CORS_ORIGINS=http://localhost:8080
APP_ENV=production
APP_URL=http://localhost:8080
EOF
fi

# Apply schema on first boot (check if recipes table exists)
table_exists=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='recipes';" 2>/dev/null)

if [ "$table_exists" = "0" ]; then
    echo "First boot — applying database schema..."
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < /var/www/html/database/schema.sql
    echo "Schema applied."
else
    echo "Database already initialized."
fi

# Apply any pending migrations
for migration in /var/www/html/database/migrations/*.sql; do
    [ -f "$migration" ] || continue
    migration_name=$(basename "$migration")
    # Simple check: try to apply, ignore errors (already applied)
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$migration" 2>/dev/null || true
done

# Fix permissions
chown -R www-data:www-data /var/www/html/uploads

echo "Cookslate: Ready!"

# Start Apache
exec apache2-foreground
