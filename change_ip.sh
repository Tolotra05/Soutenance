#!/usr/bin/env bash
# Met à jour .env avec l'IP actuelle de la VM (IP non fixe).
#
# Usage (à la racine du projet, là où se trouvent .env et docker-compose.prod.yml) :
#   ./change_ip.sh                 # détecte automatiquement l'IP de la VM
#   ./change_ip.sh 192.168.1.50    # force une IP précise
#
# L'application ne dépend plus de l'IP : nginx sert front et API sur la même
# origine, le front appelle l'API en relatif (NEXT_PUBLIC_API_URL vide) et les
# liens des e-mails reprennent l'adresse du visiteur. Un changement d'IP ne
# demande donc AUCUN rebuild ni redémarrage : ce script ne fait que garder .env
# cohérent (valeurs de repli pour le CLI) et afficher la nouvelle URL.
#
# Ce que fait le script (idempotent, relançable sans risque) :
#   1. .env : CORS_ALLOW_ORIGIN, FRONTEND_URL, DEFAULT_URI ; NEXT_PUBLIC_API_URL vidé
#   2. back/config/packages/nelmio_cors.yaml : lit CORS_ALLOW_ORIGIN depuis .env
#   3. front/next.config.js : ajoute NEXT_PUBLIC_API_URL au connect-src de la CSP
#   4. signale le rebuild du front UNIQUEMENT si NEXT_PUBLIC_API_URL contenait
#      encore une URL (ancienne configuration, inlinée au build)

set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE=".env"
CORS_FILE="back/config/packages/nelmio_cors.yaml"
NEXT_FILE="front/next.config.js"
COMPOSE=(docker compose -f docker-compose.prod.yml)
CHANGED=0
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
    ip=$(hostname -I | tr ' ' '\n' | grep -E '^[0-9]+(\.[0-9]+){3}$' | grep -v '^172\.17\.' | head -n1 || true)
  fi
  echo "$ip"
}

NEW_IP="${1:-$(detect_ip)}"
[[ "$NEW_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] \
  || die "IP invalide ou non détectée ('$NEW_IP'). Relance : ./change-ip.sh 192.168.X.X"

OLD_IP=$(grep -E '^FRONTEND_URL=' "$ENV_FILE" | sed -E 's|^FRONTEND_URL=https?://([^:/]+).*|\1|' || true)
OLD_URL=$(grep -E '^FRONTEND_URL=' "$ENV_FILE" | cut -d= -f2- || true)
OLD_API_URL=$(grep -E '^NEXT_PUBLIC_API_URL=' "$ENV_FILE" | cut -d= -f2- || true)

# Front et API partagent une seule URL publique, servie par nginx sur HTTP_PORT.
HTTP_PORT=$(grep -E '^HTTP_PORT=' "$ENV_FILE" | cut -d= -f2- || true)
NEW_URL="http://$NEW_IP"
if [ -n "$HTTP_PORT" ] && [ "$HTTP_PORT" != "80" ]; then
  NEW_URL="$NEW_URL:$HTTP_PORT"
fi

echo "IP dans .env : ${OLD_IP:-<aucune>}"
echo "IP de la VM  : $NEW_IP"
echo

# --- 1. .env ----------------------------------------------------------------
set_var() {  # set_var CLE VALEUR : remplace la ligne si elle existe, sinon l'ajoute
  local key="$1" value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

if [ "$OLD_URL" != "$NEW_URL" ] || [ -n "$OLD_API_URL" ]; then
  set_var CORS_ALLOW_ORIGIN "'^http://$NEW_IP(:[0-9]+)?\$'"
  set_var FRONTEND_URL      "$NEW_URL"
  set_var DEFAULT_URI       "$NEW_URL"
  # Vide = appels relatifs : surtout PAS l'IP, sinon il faudrait rebuilder le
  # front à chaque changement d'IP.
  set_var NEXT_PUBLIC_API_URL ""
  CHANGED=1
  echo "[.env] mis à jour :"
  grep -E '^(CORS_ALLOW_ORIGIN|FRONTEND_URL|DEFAULT_URI|NEXT_PUBLIC_API_URL)=' "$ENV_FILE" | sed 's/^/    /'
else
  echo "[.env] déjà à jour"
fi

# --- 2. CORS du back (nelmio_cors.yaml) -------------------------------------
if [ -f "$CORS_FILE" ]; then
  if grep -q 'CORS_ALLOW_ORIGIN' "$CORS_FILE"; then
    echo "[$CORS_FILE] déjà adapté"
  else
    sed -i "s|\(allow_origin: \[.*\)\]|\1, '%env(CORS_ALLOW_ORIGIN)%']|" "$CORS_FILE"
    grep -q 'CORS_ALLOW_ORIGIN' "$CORS_FILE" || die "échec du patch de $CORS_FILE"
    echo "[$CORS_FILE] adapté : lit maintenant CORS_ALLOW_ORIGIN"
    CHANGED=1; PATCHED=1
  fi
else
  echo "[$CORS_FILE] introuvable, ignoré"
fi

# --- 3. CSP du front (next.config.js) ---------------------------------------
if [ -f "$NEXT_FILE" ]; then
  if grep -q 'process.env.NEXT_PUBLIC_API_URL' "$NEXT_FILE"; then
    echo "[$NEXT_FILE] déjà adapté"
  else
    sed -i "s|https://back\.dev\",|https://back.dev \" + (process.env.NEXT_PUBLIC_API_URL \|\| ''),|" "$NEXT_FILE"
    grep -q 'process.env.NEXT_PUBLIC_API_URL' "$NEXT_FILE" || die "échec du patch de $NEXT_FILE"
    echo "[$NEXT_FILE] adapté : connect-src inclut NEXT_PUBLIC_API_URL"
    CHANGED=1; PATCHED=1
  fi
else
  echo "[$NEXT_FILE] introuvable, ignoré"
fi

# --- 4. Rebuild ? ------------------------------------------------------------
echo
if [ -n "$OLD_API_URL" ]; then
  echo "NEXT_PUBLIC_API_URL valait '$OLD_API_URL' (ancienne configuration, inlinée"
  echo "dans le front) : rebuild du front nécessaire UNE fois (build sans coupure,"
  echo "puis quelques secondes de coupure du front le temps de le recréer) :"
  echo "  ${COMPOSE[*]} build front && ${COMPOSE[*]} up -d --no-deps front"
  echo "(ajouter '-f green.yml -p <projet>' si la stack tourne sous un autre projet)"
else
  echo "Aucun rebuild ni redémarrage nécessaire : l'application ne dépend pas de l'IP."
fi

echo
echo "Application accessible sur :"
echo "  Front : $NEW_URL/"
echo "  API   : $NEW_URL/api/doc"

if [ "$PATCHED" -eq 1 ]; then
  echo
  echo "Des fichiers du projet ont été adaptés. Pour les garder dans git :"
  echo "  git add $CORS_FILE $NEXT_FILE && git commit -m 'Origines CORS/CSP lues depuis .env' && git push"
fi

