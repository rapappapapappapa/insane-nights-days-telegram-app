#!/bin/bash

# Script pour démarrer le backend et le tunnel Cloudflare
# Usage: ./start_backend_and_tunnel.sh

cd "$(dirname "$0")"
ROOT_DIR="$(pwd)"

echo "🛑 Arrêt des processus existants..."
pkill -f "node.*index.js" 2>/dev/null
pkill -f cloudflared 2>/dev/null
sleep 2

echo ""
echo "🚀 Démarrage du backend..."
cd server
# ✅ IMPORTANT: utiliser nohup pour que le process survive même si le shell appelant se termine
nohup node index.js > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid
sleep 3

if ps -p $BACKEND_PID > /dev/null 2>&1; then
  echo "✅ Backend démarré (PID: $BACKEND_PID)"
  echo "   Logs: tail -f backend.log"
else
  echo "❌ Erreur démarrage backend"
  tail -20 ../backend.log
  exit 1
fi

echo ""
echo "🌐 Démarrage du tunnel Cloudflare..."
cd ..

# Vérifier si cloudflared est installé
# ✅ Priorité au binaire du repo (plus fiable après reboot que /tmp)
if [ -f "./cloudflared" ]; then
  chmod +x ./cloudflared 2>/dev/null || true
  CLOUDFLARED="./cloudflared"
elif [ -f "/tmp/cloudflared" ]; then
  chmod +x /tmp/cloudflared 2>/dev/null || true
  CLOUDFLARED="/tmp/cloudflared"
elif command -v cloudflared >/dev/null 2>&1; then
  CLOUDFLARED="cloudflared"
else
  echo "⚠️  Installation de cloudflared..."
  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared
  chmod +x /tmp/cloudflared
  CLOUDFLARED="/tmp/cloudflared"
fi

# ✅ IMPORTANT: utiliser nohup pour que le process survive même si le shell appelant se termine
# ✅ IMPORTANT: forcer http2 (TCP) au lieu de quic (UDP) pour éviter les erreurs "network is unreachable" sur certains réseaux
nohup $CLOUDFLARED tunnel --url http://localhost:5000 --protocol http2 > cloudflare_tunnel.log 2>&1 &
TUNNEL_PID=$!
echo $TUNNEL_PID > cloudflare_tunnel.pid
sleep 8

if ps -p $TUNNEL_PID > /dev/null 2>&1; then
  echo "✅ Tunnel Cloudflare démarré (PID: $TUNNEL_PID)"
  echo "   Logs: tail -f cloudflare_tunnel.log"
  echo ""
  echo "⏳ Attente de l'URL du tunnel..."
  
  for i in {1..45}; do
    # ⚠️ Le log peut contenir l'URL de l'API Cloudflare (https://api.trycloudflare.com/tunnel).
    # On ignore explicitement "api.trycloudflare.com" et on ne garde que l'URL publique du tunnel.
    if grep -q "trycloudflare.com" cloudflare_tunnel.log 2>/dev/null; then
      TUNNEL_URL=$(
        grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' cloudflare_tunnel.log \
          | grep -v '^https://api\.trycloudflare\.com$' \
          | tail -1
      )
      if [ ! -z "$TUNNEL_URL" ]; then
        echo "✅ URL du tunnel: $TUNNEL_URL"
        echo "$TUNNEL_URL" > cloudflare_url.txt

        # URL webhook Stripe (à coller dans Stripe Dashboard si l'URL change)
        WEBHOOK_URL="${TUNNEL_URL}/api/webhooks/stripe"
        echo "$WEBHOOK_URL" > stripe_webhook_url.txt
        echo "🔔 Webhook Stripe (si besoin): $WEBHOOK_URL"
        
        # Mettre à jour config.js
        echo ""
        echo "📝 Mise à jour de api/config.js..."
        cd "$ROOT_DIR/nox-mobile/api"
        # Utiliser un délimiteur différent (#) pour éviter les problèmes avec les URLs
        sed -i "s#BASE_URL: process\.env\.EXPO_PUBLIC_API_BASE || '.*'#BASE_URL: process.env.EXPO_PUBLIC_API_BASE || '${TUNNEL_URL}'#" config.js
        echo "✅ Config mis à jour avec: $TUNNEL_URL"
        cd "$ROOT_DIR"
        break
      fi
    fi
    sleep 1
  done

  if [ ! -f "$ROOT_DIR/cloudflare_url.txt" ] || grep -q '^https://api\.trycloudflare\.com$' "$ROOT_DIR/cloudflare_url.txt" 2>/dev/null; then
    echo "❌ Impossible d'obtenir une URL trycloudflare valide."
    echo "   Dernières lignes du log tunnel:"
    tail -20 "$ROOT_DIR/cloudflare_tunnel.log"
    exit 1
  fi
else
  echo "❌ Erreur démarrage tunnel"
  tail -15 cloudflare_tunnel.log
  exit 1
fi

echo ""
echo "✅ Services démarrés avec succès!"
echo ""
echo "📊 État:"
echo "   Backend PID: $BACKEND_PID"
echo "   Tunnel PID: $TUNNEL_PID"
if [ -f cloudflare_url.txt ]; then
  echo "   URL: $(cat cloudflare_url.txt)"
fi
echo ""
echo "📋 Commandes utiles:"
echo "   Voir les logs backend: tail -f backend.log"
echo "   Voir les logs tunnel: tail -f cloudflare_tunnel.log"
echo "   Arrêter: pkill -f 'node.*index.js' && pkill -f cloudflared"
echo ""
