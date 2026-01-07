#!/bin/bash

# Script pour démarrer le backend et le tunnel Cloudflare
# Usage: ./start_backend_and_tunnel.sh

cd "$(dirname "$0")"

echo "🛑 Arrêt des processus existants..."
pkill -f "node.*index.js" 2>/dev/null
pkill -f cloudflared 2>/dev/null
sleep 2

echo ""
echo "🚀 Démarrage du backend..."
cd server
node index.js > ../backend.log 2>&1 &
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
if [ -f "/tmp/cloudflared" ]; then
  CLOUDFLARED="/tmp/cloudflared"
elif command -v cloudflared >/dev/null 2>&1; then
  CLOUDFLARED="cloudflared"
else
  echo "⚠️  Installation de cloudflared..."
  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared
  chmod +x /tmp/cloudflared
  CLOUDFLARED="/tmp/cloudflared"
fi

$CLOUDFLARED tunnel --url http://localhost:5000 > cloudflare_tunnel.log 2>&1 &
TUNNEL_PID=$!
echo $TUNNEL_PID > cloudflare_tunnel.pid
sleep 8

if ps -p $TUNNEL_PID > /dev/null 2>&1; then
  echo "✅ Tunnel Cloudflare démarré (PID: $TUNNEL_PID)"
  echo "   Logs: tail -f cloudflare_tunnel.log"
  echo ""
  echo "⏳ Attente de l'URL du tunnel..."
  
  for i in {1..30}; do
    if grep -q "https://.*trycloudflare.com" cloudflare_tunnel.log 2>/dev/null; then
      TUNNEL_URL=$(grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' cloudflare_tunnel.log | tail -1)
      if [ ! -z "$TUNNEL_URL" ]; then
        echo "✅ URL du tunnel: $TUNNEL_URL"
        echo "$TUNNEL_URL" > cloudflare_url.txt
        
        # Mettre à jour config.js
        echo ""
        echo "📝 Mise à jour de api/config.js..."
        cd insane-nights-days-mobile/api
        sed -i "s|BASE_URL: process\.env\.EXPO_PUBLIC_API_BASE ||.*|BASE_URL: process.env.EXPO_PUBLIC_API_BASE || '$TUNNEL_URL',|" config.js
        echo "✅ Config mis à jour avec: $TUNNEL_URL"
        break
      fi
    fi
    sleep 1
  done
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
