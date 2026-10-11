#!/bin/sh
set -e

DB_HOST="${DATABASE_HOST:-mysql}"
DB_PORT="${DATABASE_PORT:-3306}"

echo "[entrypoint] En attente de MySQL sur ${DB_HOST}:${DB_PORT}..."
until php -r "exit(@fsockopen('${DB_HOST}', ${DB_PORT}) ? 0 : 1);" 2>/dev/null; do
  sleep 1
done
echo "[entrypoint] MySQL est prêt."

# Filet de sécurité pour un volume vendor_* vidé ou un premier clone sans
# cette étape déjà faite par le stage "dev"/"prod" du Dockerfile.
if [ ! -f vendor/autoload.php ]; then
  echo "[entrypoint] vendor/ absent, installation des dépendances Composer..."
  composer install --no-interaction --prefer-dist
fi

mkdir -p var/cache var/log config/jwt

if [ ! -f config/jwt/private.pem ]; then
  echo "[entrypoint] Génération des clés JWT (config/jwt/)..."
  php bin/console lexik:jwt:generate-keypair --skip-if-exists --no-interaction
fi

if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  echo "[entrypoint] Exécution des migrations Doctrine..."
  php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
fi

# En dev le conteneur tourne en root (pour pouvoir corriger les permissions
# d'un bind-mount créé côté hôte) ; en prod il tourne déjà en www-data
# (USER défini dans le Dockerfile), donc ce bloc est un no-op.
if [ "$(id -u)" = "0" ]; then
  chown -R www-data:www-data var config/jwt
fi

exec "$@"
