#!/bin/bash
# Script pour publier une update sur les deux canaux (preview pour Android, production pour iOS)

set -e

MESSAGE="${1:-Update automatique}"

echo "📱 Publication de l'update sur les deux canaux..."
echo "Message: $MESSAGE"
echo ""

echo "🔵 Publication sur canal PREVIEW (Android)..."
eas update --branch preview --message "$MESSAGE (Android)" --non-interactive

echo ""
echo "🟢 Publication sur canal PRODUCTION (iOS)..."
eas update --branch production --message "$MESSAGE (iOS)" --non-interactive

echo ""
echo "✅ Updates publiées sur les deux canaux !"
echo "   - Preview (Android): https://expo.dev/accounts/rapapapapapp/projects/insane-nights-days-mobile/updates"
echo "   - Production (iOS): https://expo.dev/accounts/rapapapapapp/projects/insane-nights-days-mobile/updates"
