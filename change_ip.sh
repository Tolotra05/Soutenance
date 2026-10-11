#!/usr/bin/env bash
# Adapte le projet à l'IP de la VM puis rebuild la stack de prod.
#
# Usage (à la racine du projet, là où se trouvent .env et docker-compose.prod.yml) :
#   ./change-ip.sh                 # détecte automatiquement l'IP de la VM
#   ./change-ip.sh 192.168.1.50    # force une IP précise
#
# Ce que fait le script (idempotent, relançable sans risque) :
#   1. .env : CORS_ALLOW_ORIGIN, FRONTEND_URL, DEFAULT_URI, NEXT_PUBLIC_API_URL
#   2. back/config/packages/nelmio_cors.yaml : lit CORS_ALLOW_ORIGIN depuis .env
#      (avant : origines codées en dur localhost / front.dev -> login bloqué)
#   3. front/next.config.js : ajoute NEXT_PUBLIC_API_URL au connect-src de la CSP
#      (avant : seuls localhost / back.dev autorisés -> appels API bloqués)
#   4. docker compose -f docker-compose.prod.yml up -d --build

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

if [ "$OLD_IP" != "$NEW_IP" ]; then
  set_var CORS_ALLOW_ORIGIN "'^http://$NEW_IP:3000\$'"
  set_var FRONTEND_URL      "http://$NEW_IP:3000"
  set_var DEFAULT_URI       "http://$NEW_IP:8000"
  set_var NEXT_PUBLIC_API_URL "http://$NEW_IP:8000"
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

# --- 4. Rebuild -------------------------------------------------------------
if [ "$CHANGED" -eq 0 ]; then
  echo
  echo "Tout est déjà à jour, rien à reconstruire."
  exit 0
fi

echo
echo "Rebuild de la stack (environ 3 min pour le front)..."
"${COMPOSE[@]}" up -d --build

echo
"${COMPOSE[@]}" ps
echo
echo "Terminé."
echo "  Front : http://$NEW_IP:3000"
echo "  API   : http://$NEW_IP:8000/api/doc"

if [ "$PATCHED" -eq 1 ]; then
  echo
  echo "Des fichiers du projet ont été adaptés. Pour les garder dans git :"
  echo "  git add $CORS_FILE $NEXT_FILE && git commit -m 'Origines CORS/CSP lues depuis .env' && git push"
fi

