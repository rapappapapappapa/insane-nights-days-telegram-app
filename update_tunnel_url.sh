#!/bin/bash

# Script pour démarrer le tunnel et mettre à jour config.js

# Vérifier si une URL est fournie en paramètre
if [ -n "$1" ]; then
    URL="$1"
    echo "✅ Utilisation de l'URL fournie: $URL"
else
    echo "🌐 Démarrage du tunnel Cloudflare..."
    
    # Trouver cloudflared
    CLOUDFLARED=$(which cloudflared 2>/dev/null || echo "")
    if [ -z "$CLOUDFLARED" ]; then
        echo "❌ cloudflared non trouvé. Veuillez:"
        echo "   1. Installer cloudflared"
        echo "   2. Ou démarrer le tunnel manuellement et fournir l'URL:"
        echo "      ./update_tunnel_url.sh https://votre-url.trycloudflare.com"
        exit 1
    fi
    
    # Arrêter les tunnels existants
    pkill -f cloudflared 2>/dev/null
    sleep 1
    
    # Démarrer le tunnel en arrière-plan
    $CLOUDFLARED tunnel --url http://localhost:5000 > /tmp/cloudflare_output.log 2>&1 &
    TUNNEL_PID=$!

    echo "Tunnel démarré (PID: $TUNNEL_PID)"
    echo "⏳ Attente de l'URL..."
    
    # Attendre l'URL
    for i in {1..20}; do
        URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' /tmp/cloudflare_output.log 2>/dev/null | head -1)
        if [ -n "$URL" ]; then
            break
        fi
        sleep 1
    done
    
    if [ -z "$URL" ]; then
        echo "❌ Timeout: URL non trouvée"
        echo "Vérifiez les logs: /tmp/cloudflare_output.log"
        echo "Ou démarrez le tunnel manuellement et fournissez l'URL:"
        echo "  ./update_tunnel_url.sh https://votre-url.trycloudflare.com"
        exit 1
    fi
fi

echo "✅ URL trouvée: $URL"

# Mettre à jour config.js
CONFIG_FILE="insane-nights-days-mobile/api/config.js"
if [ -f "$CONFIG_FILE" ]; then
    # Sauvegarder l'ancienne URL
    OLD_URL=$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" "$CONFIG_FILE" | head -1)
    
    # Remplacer l'URL dans config.js
    sed -i "s|https://[a-zA-Z0-9-]*\.trycloudflare\.com|$URL|g" "$CONFIG_FILE"
    
    echo "✅ config.js mis à jour avec la nouvelle URL"
    if [ -n "$OLD_URL" ]; then
        echo "   Ancienne URL: $OLD_URL"
    fi
    echo "   Nouvelle URL: $URL"
else
    echo "❌ Fichier config.js non trouvé: $CONFIG_FILE"
    exit 1
fi

# Sauvegarder l'URL dans un fichier
echo "$URL" > cloudflare_url.txt
echo "URL sauvegardée dans cloudflare_url.txt"
echo ""
echo "🎉 Configuration terminée ! Vous pouvez maintenant utiliser l'app mobile."

