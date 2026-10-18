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
#   ./sync_mysql_credentials.sh --prod                     # la prod (voir ci-dessous)
#   ./sync_mysql_credentials.sh docker-compose.yml         # le dev (.env, projet du dossier)
#   ./sync_mysql_credentials.sh                            # fichier compose détecté
#   ./sync_mysql_credentials.sh docker-compose.prod.yml --env-file .env.prod -p taskmanager-prod
#
# --prod = docker-compose.prod.yml + .env.prod s'il existe (sinon .env) + projet
# PROD_PROJECT de jenkins/.env s'il existe (sinon le nom du dossier). Couvre la
# prod séparée du dev (.env.prod, projet taskmanager-prod) comme la prod seule
# d'un serveur (.env, projet du dossier).
#
# Sans --env-file ni -p, Docker Compose lit .env et prend le nom du dossier (ou
# COMPOSE_PROJECT_NAME, comme dans le pipeline Jenkins). Sur une machine où dev
# et prod cohabitent, viser la prod ainsi toucherait le projet du DEV : --prod.
# Sans fichier compose, c'est celui qui a créé le conteneur mysql en place ; à
# défaut docker-compose.prod.yml.
# Windows : .\sync_mysql_credentials.cmd (équivalent PowerShell : -Prod,
# -EnvFile, -Project).
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

FILE=""; ENV_FILE=".env"; PROJECT=""; PROD=0
while [ $# -gt 0 ]; do
  case "$1" in
    --prod) PROD=1 ;;
    --env-file) ENV_FILE="${2:?--env-file attend un fichier}"; shift ;;
    -p|--project) PROJECT="${2:?-p attend un nom de projet}"; shift ;;
    -*) die "option inconnue : $1 (options : --prod, --env-file FICHIER, -p PROJET)" ;;
    *) FILE="$1" ;;
  esac
  shift
done

if [ "$PROD" = 1 ]; then
  FILE="${FILE:-docker-compose.prod.yml}"
  if [ "$ENV_FILE" = ".env" ] && [ -f .env.prod ]; then ENV_FILE=".env.prod"; fi
  if [ -z "$PROJECT" ] && [ -f jenkins/.env ]; then
    PROJECT=$(grep -E '^PROD_PROJECT=' jenkins/.env | head -n1 | cut -d= -f2- | tr -d '\r' || true)
  fi
fi

[ -f "$ENV_FILE" ] || die "$ENV_FILE introuvable dans $(pwd)."
# Options communes à toutes les commandes Compose : fichier d'environnement et projet visés.
TARGET=(--env-file "$ENV_FILE")
if [ -n "$PROJECT" ]; then TARGET+=(-p "$PROJECT"); fi

detect_compose_file() {  # fichier compose du conteneur mysql existant de ce projet
  local project files f
  project=$(docker compose "${TARGET[@]}" -f docker-compose.prod.yml config 2>/dev/null | sed -n 's/^name: //p' | head -1)
  [ -n "$project" ] || return 0
  files=$(docker ps -a --filter "label=com.docker.compose.project=$project" \
            --filter "label=com.docker.compose.service=mysql" \
            --format '{{.Label "com.docker.compose.project.config_files"}}' | head -1)
  f=${files%%,*}          # premier fichier de la liste
  f=${f##*[\\/]}          # nom seul (chemins Linux ou Windows)
  [ -n "$f" ] && [ -f "$f" ] && echo "$f"
  return 0
}

FILE="${FILE:-$(detect_compose_file)}"
FILE="${FILE:-docker-compose.prod.yml}"
[ -f "$FILE" ] || die "$FILE introuvable dans $(pwd)."
DC=(docker compose "${TARGET[@]}" -f "$FILE")
echo "Fichier compose : $FILE | environnement : $ENV_FILE | projet : $("${DC[@]}" config 2>/dev/null | sed -n 's/^name: //p' | head -1)"

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

echo "[1/3] Vérification des accès de $ENV_FILE..."
"${DC[@]}" up -d mysql >/dev/null 2>&1   # (re)crée mysql avec les valeurs actuelles du .env
wait_mysql
if credentials_ok; then
  echo "      OK : root et MYSQL_USER acceptent déjà les mots de passe de $ENV_FILE. Rien à faire."
  exit 0
fi
echo "      Les comptes MySQL ne correspondent pas à $ENV_FILE : réalignement."

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
echo "      Comptes root et MYSQL_USER mis à jour depuis $ENV_FILE."

echo "[3/3] Redémarrage de mysql et back..."
trap - EXIT
docker stop "$RECOVERY" >/dev/null
"${DC[@]}" up -d mysql back >/dev/null 2>&1
wait_mysql
credentials_ok || die "les accès de $ENV_FILE sont toujours refusés (voir : ${DC[*]} logs mysql)."
echo "      OK : MySQL utilise maintenant les accès de $ENV_FILE."
echo "      Vérifier back : ${DC[*]} ps   /   ${DC[*]} logs back --tail 20"
