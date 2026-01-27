#!/bin/bash
# Script pour lancer cloudflared et capturer l'URL

/tmp/cloudflared tunnel --url http://localhost:5000 2>&1 | while IFS= read -r line; do
    echo "$line"
    if echo "$line" | grep -qE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com'; then
        URL=$(echo "$line" | grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | head -1)
        echo "$URL" > /tmp/cloudflare_url.txt
        echo "URL capturée: $URL"
    fi
done



















