#!/bin/bash
# Script pour publier une update sur les deux canaux (preview pour Android, production pour iOS)
#
# Depuis le dossier insane-nights-days-mobile : npm run update:both -- "Mon message"
#
# CI=1 : mode non interactif attendu par expo export (remplace --non-interactive déprécié).
# EAS_SKIP_AUTO_FINGERPRINT=1 : optionnel, accélère si le calcul d’empreinte bloque (décommenter si besoin).

set -e

# Toujours exécuter depuis la racine du package mobile (évite les erreurs si le shell n’y est pas)
cd "$(dirname "$0")/.."

export CI=1
# export EAS_SKIP_AUTO_FINGERPRINT=1

MESSAGE="${1:-Update automatique}"

echo "📱 Publication de l'update sur les deux canaux..."
echo "Message: $MESSAGE"
echo ""

echo "🔵 Publication sur canal PREVIEW (Android)..."
eas update --branch preview --message "$MESSAGE (Android)"

echo ""
echo "🟢 Publication sur canal PRODUCTION (iOS)..."
eas update --branch production --message "$MESSAGE (iOS)"

echo ""
echo "✅ Updates publiées sur les deux canaux !"
echo "   - Preview (Android): https://expo.dev/accounts/rapapapapapp/projects/insane-nights-days-mobile/updates"
echo "   - Production (iOS): https://expo.dev/accounts/rapapapapapp/projects/insane-nights-days-mobile/updates"
