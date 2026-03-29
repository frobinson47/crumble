# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: PHP + Apache
FROM php:8.1-apache

# Install PHP extensions and MySQL client
RUN apt-get update && apt-get install -y \
        libpng-dev libjpeg-dev libwebp-dev libfreetype6-dev \
        default-mysql-client \
    && docker-php-ext-configure gd --with-jpeg --with-webp --with-freetype \
    && docker-php-ext-install pdo_mysql gd \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

# Apache config
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf

# Copy application code
COPY api/ /var/www/html/api/
COPY database/ /var/www/html/database/
COPY .htaccess /var/www/html/.htaccess

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist /var/www/html/frontend/dist

# Create uploads directory
RUN mkdir -p /var/www/html/uploads/recipes \
    && chown -R www-data:www-data /var/www/html/uploads

# Entrypoint
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80
ENTRYPOINT ["entrypoint.sh"]
