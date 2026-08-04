#!/bin/bash
# Vérifie les prérequis avant soumission App Store / Play Store.
# Usage : npm run store:check

set -e
cd "$(dirname "$0")/.."
ROOT="$(cd .. && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
ok() { echo -e "${GREEN}✅${NC} $1"; }
warn() { echo -e "${YELLOW}⚠️${NC}  $1"; }
fail() { echo -e "${RED}❌${NC} $1"; ERR=1; }

ERR=0
echo "=== Checklist technique publication stores — Nox ==="
echo ""

# --- App identity ---
if grep -q '"bundleIdentifier": "com.nox.mobile"' app.json 2>/dev/null; then
  ok "Bundle ID iOS : com.nox.mobile"
else
  fail "bundleIdentifier iOS manquant ou incorrect dans app.json"
fi

if grep -q '"package": "com.nox.mobile"' app.json 2>/dev/null; then
  ok "Package Android : com.nox.mobile"
else
  fail "package Android manquant dans app.json"
fi

VERSION=$(node -e "console.log(require('./app.json').expo.version)")
BUILD=$(node -e "console.log(require('./app.json').expo.ios.buildNumber)")
echo "   Version affichée : $VERSION (iOS buildNumber: $BUILD)"

# --- Assets ---
for f in assets/icon.png assets/splash-icon.png assets/adaptive-icon.png; do
  if [ -f "$f" ]; then ok "Asset présent : $f"; else warn "Asset manquant : $f (requis pour les stores)"; fi
done

# --- EAS config ---
if grep -q '"distribution": "store"' eas.json; then
  ok "Profil EAS production → distribution store"
else
  fail "eas.json : profil production sans distribution store"
fi

if grep -q '"submit"' eas.json; then
  ok "Section eas.json → submit configurée"
else
  fail "Section submit absente de eas.json"
fi

if grep -q '"autoIncrement": true' eas.json; then
  ok "autoIncrement activé (iOS et/ou Android)"
else
  warn "autoIncrement non trouvé — versionCode/buildNumber à gérer manuellement"
fi

# --- Pages légales publiques (serveur) ---
LEGAL_DIR="$ROOT/server/public/legal"
for page in privacy.html cgu.html cgv.html mentions.html index.html; do
  if [ -f "$LEGAL_DIR/$page" ]; then ok "Page légale serveur : /legal/$page"; else fail "Manquant : server/public/legal/$page"; fi
done

if grep -q "app.use('/legal'" "$ROOT/server/index.js" 2>/dev/null; then
  ok "Route Express /legal configurée"
else
  fail "Route /legal non trouvée dans server/index.js"
fi

# --- Placeholders légaux restants ---
if grep -q '\[Raison sociale à compléter\]' constants/legalConfig.js 2>/dev/null; then
  warn "Raison sociale encore à compléter dans constants/legalConfig.js"
fi

# --- Env prod mobile ---
if [ -f env.example.txt ]; then
  if grep -q 'EXPO_PUBLIC_API_BASE' env.example.txt; then ok "env.example.txt documente EXPO_PUBLIC_API_BASE"; fi
fi

# --- Expo login ---
EAS=(./node_modules/.bin/eas)
[ -x "${EAS[0]}" ] || EAS=(npx eas-cli)
if "${EAS[@]}" whoami >/dev/null 2>&1; then
  ok "Connecté à Expo : $("${EAS[@]}" whoami 2>/dev/null | head -1)"
else
  warn "Non connecté à Expo — lancer : eas login"
fi

echo ""
API_BASE="${EXPO_PUBLIC_API_BASE:-https://api.nox.world}"
echo "URLs légales à renseigner dans App Store Connect / Play Console :"
echo "   Politique de confidentialité : ${API_BASE%/}/legal/privacy.html"
echo "   CGU                         : ${API_BASE%/}/legal/cgu.html"
echo "   Index                       : ${API_BASE%/}/legal/"
echo ""
echo "Commandes utiles :"
echo "   npm run build:store:ios       # Build App Store"
echo "   npm run build:store:android   # Build Play Store (AAB)"
echo "   npm run submit:store:ios      # Soumettre le dernier build iOS"
echo "   npm run submit:store:android  # Soumettre le dernier build Android"
echo "   npm run update:both           # OTA après publication (JS uniquement)"
echo ""
echo "Doc complète : docs/mobile/PUBLICATION_STORES.md"
echo "Infos légales : docs/mobile/INFORMATIONS_LEGALES_A_COMPLETER.md"
echo ""

if [ "$ERR" -eq 1 ]; then
  echo -e "${RED}Des points bloquants ont été détectés.${NC}"
  exit 1
fi
echo -e "${GREEN}Vérification technique OK.${NC} Compléter la checklist humaine dans docs/mobile/PUBLICATION_STORES.md"
