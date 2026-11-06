#!/bin/bash
# Compare l’empreinte du dernier build EAS avec l’empreinte du dépôt local.
# Si elles diffèrent, les OTA publiées depuis ce dépôt peuvent être ignorées par l’app installée.
#
# Usage : npm run eas:verify-fingerprint
# (connexion Expo requise : eas whoami)

set -e
cd "$(dirname "$0")/.."

EAS=(./node_modules/.bin/eas)
if [ ! -x "${EAS[0]}" ]; then
  EAS=(npx eas-cli)
fi

echo "=== Empreintes EAS (fingerprint) ==="
echo ""

echo "📱 Dernier build iOS — profil production (TestFlight / store)"
IOS_HASH=$("${EAS[@]}" build:list --platform ios --limit 3 --json --non-interactive 2>/dev/null | node -e "
const b = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const f = b.find(x => x.status === 'FINISHED' && x.channel === 'production');
console.log(f?.fingerprint?.hash || '(aucun build production terminé trouvé)');
")
echo "   Build fingerprint : $IOS_HASH"
LOCAL_IOS_HASH=$("${EAS[@]}" fingerprint:generate --platform ios --build-profile production --json --non-interactive 2>/dev/null | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).hash)")
echo "   Projet local      : $LOCAL_IOS_HASH"
if [ "$IOS_HASH" = "$LOCAL_IOS_HASH" ]; then
  echo "   ✅ iOS : match — les OTA depuis ce tree sont compatibles avec ce binaire."
else
  echo "   ❌ iOS : mismatch — les OTA peuvent ne pas s’appliquer. Refaire : eas build --profile production --platform ios"
fi
echo ""

echo "🤖 Dernier build Android — profil preview (APK interne)"
AND_HASH=$("${EAS[@]}" build:list --platform android --limit 8 --json --non-interactive 2>/dev/null | node -e "
const b = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const f = b.find(x => x.status === 'FINISHED' && x.channel === 'preview');
console.log(f?.fingerprint?.hash || '(aucun build preview terminé trouvé)');
")
echo "   Build fingerprint : $AND_HASH"
LOCAL_AND_HASH=$("${EAS[@]}" fingerprint:generate --platform android --build-profile preview --json --non-interactive 2>/dev/null | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).hash)")
echo "   Projet local      : $LOCAL_AND_HASH"
if [ "$AND_HASH" = "$LOCAL_AND_HASH" ]; then
  echo "   ✅ Android preview : match."
else
  echo "   ❌ Android preview : mismatch — eas build --profile preview --platform android"
fi
echo ""
echo "Référence : https://docs.expo.dev/eas-update/how-it-works/"
