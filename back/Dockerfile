# syntax=docker/dockerfile:1
#
# Symfony 7.4 / PHP 8.3, served by php-fpm behind nginx (not FrankenPHP).
# Reasoning: FrankenPHP's worker mode keeps the app (and Doctrine's
# EntityManager/UnitOfWork) alive between requests for speed, which requires
# explicitly resetting that state every request to avoid leaking it across
# users -- a discipline this codebase doesn't follow yet. Classic php-fpm
# boots a fresh app per request, matching what the code already assumes, at
# the cost of a bit of raw throughput. Safer default for a first dockerization.
#
# Stages:
#   composer   -> resolve PHP deps in isolation (cached independently of code/PHP-ext changes)
#   composer-dev -> same + require-dev + autoloader, for the dev image
#   php-base   -> PHP + extensions + php.ini shared by dev and prod
#   dev        -> docker-compose.yml: code bind-mounted over this, vendor baked in as a fallback
#   prod       -> docker-compose.prod.yml: code copied in, optimized autoloader, non-root
#   nginx-prod -> nginx image with prod's public/ baked in + the nginx vhost

FROM composer:2 AS composer
WORKDIR /app
COPY composer.json composer.lock symfony.lock ./
# --no-scripts: Symfony's post-install scripts (cache:clear, assets:install)
# need the full app (src/, config/, bin/console), not copied yet at this
# stage -- they run naturally when the app boots instead.
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

# ---------------------------------------------------------------------------
# The dev image has no `composer dump-autoload` step like prod does, so it
# needs a vendor/ that already contains autoload.php / autoload_runtime.php,
# plus require-dev packages (MakerBundle is enabled for APP_ENV=dev in
# config/bundles.php and would otherwise crash the kernel on boot).
FROM composer AS composer-dev
RUN composer install --no-scripts --prefer-dist --no-interaction

# ---------------------------------------------------------------------------
FROM php:8.3-fpm-alpine AS php-base

RUN apk add --no-cache \
        icu-dev \
        libzip-dev \
        oniguruma-dev \
        libsodium-dev \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        intl \
        zip \
        opcache \
        sodium

COPY docker/php/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint.sh
# sed : retire d'éventuels CRLF (checkout Windows avec core.autocrlf=true),
# sinon le shebang devient "#!/bin/sh\r" et le conteneur ne démarre pas.
# .gitattributes force déjà LF sur *.sh ; ceci est un filet de sécurité.
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /var/www/html
ENTRYPOINT ["entrypoint.sh"]
CMD ["php-fpm"]

# ---------------------------------------------------------------------------
# Code is bind-mounted by docker-compose.yml (hot reload, no rebuild on edit).
# vendor/ is baked in here only so a named volume can seed itself from it on
# first `up` -- see docker-compose.yml's `back_vendor` volume.
FROM php-base AS dev
ENV APP_ENV=dev
# composer binary: used by entrypoint.sh's fallback when vendor/ is empty.
COPY --from=composer /usr/bin/composer /usr/bin/composer
COPY --from=composer-dev /app/vendor ./vendor

# ---------------------------------------------------------------------------
FROM php-base AS prod

ARG APP_ENV=prod
ENV APP_ENV=${APP_ENV}

COPY --from=composer /app/vendor ./vendor
COPY --from=composer /usr/bin/composer /usr/bin/composer
COPY . .
RUN composer dump-autoload --classmap-authoritative --no-dev \
    && mkdir -p var/cache var/log config/jwt \
    && chown -R www-data:www-data var config/jwt

# zz-opcache-prod.ini loads after zz-app.ini (alphabetical) and overrides it:
# code is immutable once the image is built (rebuilt on every deploy instead),
# so there's no need to stat/revalidate files on every request.
COPY docker/php/opcache-prod.ini /usr/local/etc/php/conf.d/zz-opcache-prod.ini

USER www-data

# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS nginx-prod
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=prod /var/www/html/public /var/www/html/public
