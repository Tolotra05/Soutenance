#!/usr/bin/env bash
# Diagnostic "Access denied for user ... (using password: YES)" sur la prod.
#
# Aucun mot de passe n'est affiché : seulement des empreintes (8 premiers
# caractères du sha256) pour comparer les valeurs entre :
#   - le fichier de config de la prod (.env.prod / .env, ou PROD_ENV_FILE) ;
#   - la copie vue par Jenkins (/run/secrets/taskmanager.env, lue à SON démarrage) ;
#   - les variables du conteneur mysql en place.
# Puis teste root, MYSQL_USER et le back (DATABASE_URL) contre la base.
#
# Usage (à la racine du projet) :
#   ./diag_mysql.sh                                   # détecte config et projet
#   ./diag_mysql.sh --env-file .env.prod -p taskmanager-prod
#
# Détection (comme sync_mysql_credentials.sh --prod) : config = PROD_ENV_FILE de
# jenkins/.env, sinon .env.prod, sinon .env ; projet = PROD_PROJECT de
# jenkins/.env, sinon le nom du dossier.
# Lecture seule : ne modifie ni la base, ni les conteneurs, ni les fichiers.

set -uo pipefail
cd "$(dirname "$0")"

ENVF=""
P=""
while [ $# -gt 0 ]; do
  case "$1" in
    --env-file) ENVF="$2"; shift 2 ;;
    -p|--project) P="$2"; shift 2 ;;
    -h|--help) sed -n '2,19p' "$0"; exit 0 ;;
    *) echo "Option inconnue : $1 (voir --help)" >&2; exit 2 ;;
  esac
done

jval() { grep -sE "^$1=" jenkins/.env | head -n1 | cut -d= -f2- | tr -d '\r'; }
[ -n "$ENVF" ] || ENVF=$(jval PROD_ENV_FILE)
[ -n "$ENVF" ] || { [ -f .env.prod ] && ENVF=.env.prod || ENVF=.env; }
[ -n "$P" ] || P=$(jval PROD_PROJECT)
[ -n "$P" ] || P=$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_-')

h() { sha256sum | cut -c1-8; }
unquote() { tr -d '\r' | sed -E "s/^['\"](.*)['\"]\$/\1/"; }
val() { grep -E "^$1=" "$ENVF" | head -n1 | cut -d= -f2- | unquote; }
# Conteneur d'un service compose, retrouvé par ses labels (indépendant du nom).
ctr() { docker ps -q --filter "label=com.docker.compose.project=$1" --filter "label=com.docker.compose.service=$2" | head -n1; }

echo "== Config : $ENVF | projet : $P"
[ -f "$ENVF" ] || { echo "  ERREUR : $ENVF introuvable (préciser --env-file)"; exit 1; }
MYSQL=$(ctr "$P" mysql)
BACK=$(ctr "$P" back)
JENKINS=$(ctr taskmanager-jenkins jenkins)
[ -n "$MYSQL" ] || { echo "  ERREUR : aucun conteneur mysql démarré pour le projet $P (préciser -p)"; \
  docker ps --format '  en cours : {{.Names}}'; exit 1; }
[ -n "$JENKINS" ] || echo "  (Jenkins non démarré sur cette machine : colonne jenkins vide)"

echo "== 1. Mêmes valeurs partout ? (empreintes identiques sur une ligne = OK)"
for k in MYSQL_USER MYSQL_PASSWORD MYSQL_ROOT_PASSWORD MYSQL_DATABASE; do
  f=$(val "$k" | h)
  j="--------"
  [ -n "$JENKINS" ] && j=$(docker exec "$JENKINS" sh -c "grep -E '^$k=' /run/secrets/taskmanager.env | head -n1 | cut -d= -f2-" 2>/dev/null | unquote | h)
  m=$(docker exec "$MYSQL" printenv "$k" | h)
  echo "  $k : fichier=$f  jenkins=$j  mysql=$m"
done

echo "== 2. La base accepte-t-elle les mots de passe du conteneur mysql ?"
docker exec "$MYSQL" sh -c '
  mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1" >/dev/null 2>&1 && echo "  root : OK" || echo "  root : REFUSÉ"
  mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT 1" >/dev/null 2>&1 && echo "  app  : OK" || echo "  app  : REFUSÉ"'

echo "== 3. Le back (DATABASE_URL) se connecte-t-il ?"
if [ -z "$BACK" ]; then
  echo "  back : conteneur non démarré"
elif docker exec "$BACK" php bin/console dbal:run-sql "SELECT 1" >/dev/null 2>&1; then
  echo "  back : OK"
else
  docker exec "$BACK" php bin/console dbal:run-sql "SELECT 1" 2>&1 \
    | grep -m1 -iE "denied|SQLSTATE|malformed|error" | sed 's/^ *//; s/^/  back : /'
fi

echo "== 4. Caractères à risque dans les mots de passe ?"
for k in MYSQL_PASSWORD MYSQL_ROOT_PASSWORD; do
  if val "$k" | grep -q '[#$/?%&"\\` ]'; then
    echo "  $k : CONTIENT # \$ / ? % & \" \\ \` ou espace -> remplacer (ex. openssl rand -hex 24)"
  else
    echo "  $k : OK"
  fi
done

cat <<'EOF'
== Que faire ?
  fichier ≠ jenkins     -> docker compose -f jenkins/docker-compose.yml up -d --force-recreate
                           puis relancer un build Jenkins
  fichier ≠ mysql       -> ./sync_mysql_credentials.sh --prod (ou relancer un build Jenkins)
  root/app REFUSÉ       -> ./sync_mysql_credentials.sh --prod
  caractère à risque    -> changer le mot de passe, recréer Jenkins, sync, rebuild
  root/app OK, back KO  -> vérifier DATABASE_URL (hôte mysql, port 3306) dans le fichier de config
  tout OK, Adminer KO   -> serveur "mysql", identifiants du fichier de config de la PROD
EOF
