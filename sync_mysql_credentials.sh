#!/usr/bin/env bash
# Aligne les comptes MySQL (root + MYSQL_USER) sur les mots de passe du .env.
#
# Pourquoi : l'image mysql n'applique MYSQL_ROOT_PASSWORD / MYSQL_USER /
# MYSQL_PASSWORD qu'à la TOUTE PREMIÈRE initialisation du volume mysql_data.
# Si .env change ensuite (ou est recréé depuis .env.docker.example), la base
# garde les anciens comptes : back reçoit "Access denied", sa migration échoue
# et le conteneur reste unhealthy.
#
# Usage (à la racine du projet, là où se trouvent .env et les fichiers compose) :
#   ./sync_mysql_credentials.sh                       # fichier compose détecté
#   ./sync_mysql_credentials.sh docker-compose.yml    # ou imposé
# Sans argument, le fichier compose est celui qui a créé le conteneur mysql en
# place (dev et prod partagent le même nom de projet : viser le mauvais
# recréerait mysql avec l'autre configuration) ; à défaut docker-compose.prod.yml.
# Windows : .\sync_mysql_credentials.cmd (équivalent PowerShell, même usage).
#
# Ce que fait le script (relançable sans risque, données jamais modifiées) :
#   1. teste root et MYSQL_USER avec les valeurs du .env -> s'ils passent, ne fait rien ;
#   2. sinon : arrête back et mysql, relance mysql SANS contrôle des mots de
#      passe (--skip-grant-tables --skip-networking : inaccessible du réseau),
#      redéfinit les mots de passe depuis .env, puis redémarre mysql et back.
# Coupure : environ une minute, uniquement si un réalignement est nécessaire.
# Limite : les mots de passe ne doivent pas contenir " $ \ ou `.

set -euo pipefail
cd "$(dirname "$0")"

RECOVERY=mysql-recovery

die() { echo "Erreur : $*" >&2; exit 1; }
[ -f .env ] || die ".env introuvable dans $(pwd)."

detect_compose_file() {  # fichier compose du conteneur mysql existant de ce projet
  local project files f
  project=$(docker compose -f docker-compose.prod.yml config 2>/dev/null | sed -n 's/^name: //p' | head -1)
  [ -n "$project" ] || return 0
  files=$(docker ps -a --filter "label=com.docker.compose.project=$project" \
            --filter "label=com.docker.compose.service=mysql" \
            --format '{{.Label "com.docker.compose.project.config_files"}}' | head -1)
  f=${files%%,*}          # premier fichier de la liste
  f=${f##*[\\/]}          # nom seul (chemins Linux ou Windows)
  [ -n "$f" ] && [ -f "$f" ] && echo "$f"
  return 0
}

FILE="${1:-$(detect_compose_file)}"
FILE="${FILE:-docker-compose.prod.yml}"
[ -f "$FILE" ] || die "$FILE introuvable dans $(pwd)."
DC=(docker compose -f "$FILE")
echo "Fichier compose : $FILE"

wait_mysql() {  # serveur prêt (mysqladmin ping répond même si le mot de passe est refusé)
  for _ in $(seq 1 60); do
    "${DC[@]}" exec -T mysql mysqladmin ping -h 127.0.0.1 --silent >/dev/null 2>&1 && return 0
    sleep 2
  done
  die "MySQL ne répond pas (voir : ${DC[*]} logs mysql)."
}

credentials_ok() {
  "${DC[@]}" exec -T mysql sh -c '
    mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1" >/dev/null 2>&1 &&
    mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT 1" >/dev/null 2>&1'
}

echo "[1/3] Vérification des accès du .env..."
"${DC[@]}" up -d mysql >/dev/null 2>&1   # (re)crée mysql avec les valeurs actuelles du .env
wait_mysql
if credentials_ok; then
  echo "      OK : root et MYSQL_USER acceptent déjà les mots de passe du .env. Rien à faire."
  exit 0
fi
echo "      Les comptes MySQL ne correspondent pas au .env : réalignement."

echo "[2/3] Réalignement (MySQL temporairement sans contrôle des mots de passe)..."
docker rm -f "$RECOVERY" >/dev/null 2>&1 || true
"${DC[@]}" stop back mysql >/dev/null 2>&1
"${DC[@]}" run --rm -d --name "$RECOVERY" --no-deps mysql --skip-grant-tables --skip-networking >/dev/null

# Quoi qu'il arrive ensuite, ne jamais laisser tourner le MySQL sans mots de
# passe : on l'arrête et on relance le service normal.
restore() { docker stop "$RECOVERY" >/dev/null 2>&1 || true; "${DC[@]}" up -d mysql back >/dev/null 2>&1 || true; }
trap restore EXIT

for _ in $(seq 1 60); do
  docker exec "$RECOVERY" sh -c 'mysql -uroot -e "SELECT 1"' >/dev/null 2>&1 && break
  sleep 2
done

DB=$(docker exec "$RECOVERY" printenv MYSQL_DATABASE | tr -d '\r')
if ! docker exec "$RECOVERY" sh -c 'mysql -uroot -N -e "SHOW DATABASES"' | tr -d '\r' | grep -qx "$DB"; then
  echo "      La base MYSQL_DATABASE='$DB' n'existe pas dans ce volume. Bases présentes :" >&2
  docker exec "$RECOVERY" sh -c 'mysql -uroot -N -e "SHOW DATABASES"' | sed 's/^/        /' >&2
  die "corrigez MYSQL_DATABASE (et DATABASE_URL) dans .env, puis relancez. Rien n'a été modifié."
fi

docker exec -i "$RECOVERY" sh -c 'mysql -uroot <<SQL
FLUSH PRIVILEGES;
ALTER USER "root"@"localhost" IDENTIFIED BY "$MYSQL_ROOT_PASSWORD";
ALTER USER IF EXISTS "root"@"%" IDENTIFIED BY "$MYSQL_ROOT_PASSWORD";
CREATE USER IF NOT EXISTS "$MYSQL_USER"@"%" IDENTIFIED BY "$MYSQL_PASSWORD";
ALTER USER "$MYSQL_USER"@"%" IDENTIFIED BY "$MYSQL_PASSWORD";
GRANT ALL PRIVILEGES ON \`$MYSQL_DATABASE\`.* TO "$MYSQL_USER"@"%";
FLUSH PRIVILEGES;
SQL'
echo "      Comptes root et MYSQL_USER mis à jour depuis .env."

echo "[3/3] Redémarrage de mysql et back..."
trap - EXIT
docker stop "$RECOVERY" >/dev/null
"${DC[@]}" up -d mysql back >/dev/null 2>&1
wait_mysql
credentials_ok || die "les accès du .env sont toujours refusés (voir : ${DC[*]} logs mysql)."
echo "      OK : MySQL utilise maintenant les accès du .env."
echo "      Vérifier back : ${DC[*]} ps   /   ${DC[*]} logs back --tail 20"
