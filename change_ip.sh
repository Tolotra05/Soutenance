#!/usr/bin/env bash
# Met à jour la configuration avec l'IP actuelle de la VM (IP non fixe).
#
# Usage (à la racine du projet, là où se trouvent .env et docker-compose.prod.yml) :
#   ./change_ip.sh                 # détecte automatiquement l'IP de la VM
#   ./change_ip.sh 192.168.1.50    # force une IP précise
#
# Sous Windows, utiliser .\change_ip.cmd (équivalent PowerShell, change_ip.ps1) :
# Windows ouvre les .sh dans un éditeur au lieu de les exécuter.
#
# L'application ne dépend plus de l'IP : nginx sert front et API sur la même
# origine, le front appelle l'API en relatif (NEXT_PUBLIC_API_URL vide) et les
# liens des e-mails reprennent l'adresse du visiteur. Un changement d'IP ne
# demande donc AUCUN rebuild ni redémarrage pour que l'application marche : ce
# script garde la configuration cohérente et affiche les nouvelles adresses.
#
# Ce que fait le script (idempotent, relançable sans risque), chaque fichier
# avec son propre port :
#   1. .env (obligatoire) : CORS_ALLOW_ORIGIN, FRONTEND_URL, DEFAULT_URI ;
#      NEXT_PUBLIC_API_URL vidé
#   2. .env.prod (s'il existe, prod déployée par Jenkins) : mêmes clés
#   3. jenkins/.env (s'il existe) : JENKINS_URL (liens absolus de Jenkins)
#   4. back/config/packages/nelmio_cors.yaml : lit CORS_ALLOW_ORIGIN depuis .env
#   5. front/next.config.js : ajoute NEXT_PUBLIC_API_URL au connect-src de la CSP
#   6. indique ce qu'il faut éventuellement reconstruire ou redémarrer

set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE=".env"
PROD_ENV_FILE=".env.prod"
JENKINS_ENV_FILE="jenkins/.env"
CORS_FILE="back/config/packages/nelmio_cors.yaml"
NEXT_FILE="front/next.config.js"
COMPOSE=(docker compose -f docker-compose.prod.yml)
PATCHED=0

die() { echo "Erreur : $*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "$ENV_FILE introuvable dans $(pwd)."

# --- Détection / validation de l'IP ----------------------------------------
detect_ip() {
  local ip=""
  # IP utilisée pour sortir vers le réseau (si une route par défaut existe)
  ip=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}' || true)
  # Sinon : première IPv4 qui n'est pas celle du pont Docker (172.17.x.x)
  if [ -z "$ip" ]; then
    ip=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+(\.[0-9]+){3}$' | grep -v '^172\.17\.' | head -n1 || true)
  fi
  echo "$ip"
}

NEW_IP="${1:-$(detect_ip)}"
[[ "$NEW_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] \
  || die "IP invalide ou non détectée ('$NEW_IP'). Relance : ./change_ip.sh 192.168.X.X"

get_var() {  # get_var FICHIER CLE
  grep -E "^$2=" "$1" | head -n1 | cut -d= -f2- || true
}

set_var() {  # set_var FICHIER CLE VALEUR : remplace la ligne si elle existe, sinon l'ajoute
  local file="$1" key="$2" value="$3"
  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

# update_app_env FICHIER : URL = IP + HTTP_PORT du fichier. Renseigne
# APP_URL, APP_OLD_API et APP_CHANGED (0/1) pour l'appelant.
update_app_env() {
  local file="$1" port
  port=$(get_var "$file" HTTP_PORT)
  APP_URL="http://$NEW_IP"
  if [ -n "$port" ] && [ "$port" != "80" ]; then
    APP_URL="$APP_URL:$port"
  fi
  APP_OLD_API=$(get_var "$file" NEXT_PUBLIC_API_URL)
  APP_CHANGED=0
  if [ "$(get_var "$file" FRONTEND_URL)" != "$APP_URL" ] || [ -n "$APP_OLD_API" ]; then
    set_var "$file" CORS_ALLOW_ORIGIN "'^http://$NEW_IP(:[0-9]+)?\$'"
    set_var "$file" FRONTEND_URL "$APP_URL"
    set_var "$file" DEFAULT_URI "$APP_URL"
    # Vide = appels relatifs : surtout PAS l'IP, sinon il faudrait rebuilder le
    # front à chaque changement d'IP.
    set_var "$file" NEXT_PUBLIC_API_URL ""
    APP_CHANGED=1
    echo "[$file] mis à jour :"
    grep -E '^(CORS_ALLOW_ORIGIN|FRONTEND_URL|DEFAULT_URI|NEXT_PUBLIC_API_URL)=' "$file" | sed 's/^/    /'
  else
    echo "[$file] déjà à jour ($APP_URL)"
  fi
}

echo "IP de la VM : $NEW_IP"
echo

# --- 1. .env ----------------------------------------------------------------
update_app_env "$ENV_FILE"
DEV_URL=$APP_URL; DEV_OLD_API=$APP_OLD_API

# --- 2. .env.prod -------------------------------------------------------------
PROD_URL=""; PROD_CHANGED=0
if [ -f "$PROD_ENV_FILE" ]; then
  update_app_env "$PROD_ENV_FILE"
  PROD_URL=$APP_URL; PROD_CHANGED=$APP_CHANGED
fi

# --- 3. jenkins/.env ------------------------------------------------------------
JENKINS_URL=""; JENKINS_CHANGED=0
if [ -f "$JENKINS_ENV_FILE" ]; then
  jport=$(get_var "$JENKINS_ENV_FILE" JENKINS_PORT)
  JENKINS_URL="http://$NEW_IP:${jport:-8080}/"
  if [ "$(get_var "$JENKINS_ENV_FILE" JENKINS_URL)" != "$JENKINS_URL" ]; then
    set_var "$JENKINS_ENV_FILE" JENKINS_URL "$JENKINS_URL"
    JENKINS_CHANGED=1
    echo "[$JENKINS_ENV_FILE] mis à jour :"
    echo "    JENKINS_URL=$JENKINS_URL"
  else
    echo "[$JENKINS_ENV_FILE] déjà à jour ($JENKINS_URL)"
  fi
fi

# --- 4. CORS du back (nelmio_cors.yaml) -------------------------------------
if [ -f "$CORS_FILE" ]; then
  if grep -q 'CORS_ALLOW_ORIGIN' "$CORS_FILE"; then
    echo "[$CORS_FILE] déjà adapté"
  else
    sed -i "s|\(allow_origin: \[.*\)\]|\1, '%env(CORS_ALLOW_ORIGIN)%']|" "$CORS_FILE"
    grep -q 'CORS_ALLOW_ORIGIN' "$CORS_FILE" || die "échec du patch de $CORS_FILE"
    echo "[$CORS_FILE] adapté : lit maintenant CORS_ALLOW_ORIGIN"
    PATCHED=1
  fi
else
  echo "[$CORS_FILE] introuvable, ignoré"
fi

# --- 5. CSP du front (next.config.js) ---------------------------------------
if [ -f "$NEXT_FILE" ]; then
  if grep -q 'process.env.NEXT_PUBLIC_API_URL' "$NEXT_FILE"; then
    echo "[$NEXT_FILE] déjà adapté"
  else
    sed -i "s|https://back\.dev\",|https://back.dev \" + (process.env.NEXT_PUBLIC_API_URL \|\| ''),|" "$NEXT_FILE"
    grep -q 'process.env.NEXT_PUBLIC_API_URL' "$NEXT_FILE" || die "échec du patch de $NEXT_FILE"
    echo "[$NEXT_FILE] adapté : connect-src inclut NEXT_PUBLIC_API_URL"
    PATCHED=1
  fi
else
  echo "[$NEXT_FILE] introuvable, ignoré"
fi

# --- 6. Ce qu'il reste à faire --------------------------------------------------
echo
TODO=0
if [ -n "$DEV_OLD_API" ]; then
  TODO=1
  echo "À faire : NEXT_PUBLIC_API_URL de .env valait '$DEV_OLD_API' (ancienne configuration,"
  echo "inlinée dans le front) : reconstruire le front UNE fois (build sans coupure,"
  echo "puis quelques secondes de coupure du front le temps de le recréer) :"
  echo "  ${COMPOSE[*]} build front && ${COMPOSE[*]} up -d --no-deps front"
fi
if [ "$JENKINS_CHANGED" = 1 ] || [ "$PROD_CHANGED" = 1 ]; then
  TODO=1
  echo "À faire : Jenkins relit jenkins/.env et .env.prod seulement au démarrage. Pour appliquer"
  echo "(facultatif : l'application fonctionne déjà avec la nouvelle IP ; éviter pendant un build) :"
  echo "  docker compose -f jenkins/docker-compose.yml up -d --force-recreate"
  if [ "$PROD_CHANGED" = 1 ]; then
    echo "  puis lancer un build dans Jenkins pour redéployer la prod avec .env.prod à jour"
  fi
fi
if [ "$TODO" = 0 ]; then
  echo "Aucun rebuild ni redémarrage nécessaire : l'application ne dépend pas de l'IP."
fi

echo
echo "Adresses :"
echo "  Application (.env)      : $DEV_URL/"
if [ -n "$PROD_URL" ]; then echo "  Application (.env.prod) : $PROD_URL/"; fi
if [ -n "$JENKINS_URL" ]; then echo "  Jenkins                 : $JENKINS_URL"; fi

if [ "$PATCHED" -eq 1 ]; then
  echo
  echo "Des fichiers du projet ont été adaptés. Pour les garder dans git :"
  echo "  git add $CORS_FILE $NEXT_FILE && git commit -m 'Origines CORS/CSP lues depuis .env' && git push"
fi
