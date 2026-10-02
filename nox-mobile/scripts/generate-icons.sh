#!/bin/bash
# Script pour générer les icônes de l'app depuis le logo Nox

set -e

echo "🎨 Génération des icônes depuis le logo Nox..."

# Vérifier que le logo source existe
SOURCE_LOGO="assets/vrailogo.png"
if [ ! -f "$SOURCE_LOGO" ]; then
    echo "❌ Erreur: $SOURCE_LOGO introuvable"
    echo "   Utilisation de noxlogo.png comme alternative..."
    SOURCE_LOGO="assets/noxlogo.png"
    if [ ! -f "$SOURCE_LOGO" ]; then
        echo "❌ Erreur: Aucun logo Nox trouvé dans assets/"
        exit 1
    fi
fi

echo "✅ Logo source trouvé: $SOURCE_LOGO"

# Vérifier si ImageMagick est installé
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick n'est pas installé."
    echo "   Installation requise: sudo apt-get install imagemagick"
    echo ""
    echo "   Alternative: Utilisez un outil en ligne:"
    echo "   - https://expo-assets-generator.vercel.app/"
    echo "   - https://expo-icon-builder.com/"
    echo ""
    echo "   Ou installez rn-app-icons:"
    echo "   npx rn-app-icons --input $SOURCE_LOGO"
    exit 1
fi

# Créer un dossier temporaire pour les icônes
TEMP_DIR=$(mktemp -d)
echo "📁 Dossier temporaire: $TEMP_DIR"

# Générer icon.png (1024x1024)
echo "📱 Génération de icon.png (1024x1024)..."
convert "$SOURCE_LOGO" -resize 1024x1024 -background transparent -gravity center -extent 1024x1024 "$TEMP_DIR/icon.png"

# Générer adaptive-icon.png (1024x1024 avec fond blanc)
echo "📱 Génération de adaptive-icon.png (1024x1024)..."
convert "$SOURCE_LOGO" -resize 1024x1024 -background white -gravity center -extent 1024x1024 "$TEMP_DIR/adaptive-icon.png"

# Générer splash-icon.png (1024x1024)
echo "📱 Génération de splash-icon.png (1024x1024)..."
convert "$SOURCE_LOGO" -resize 1024x1024 -background white -gravity center -extent 1024x1024 "$TEMP_DIR/splash-icon.png"

# Générer favicon.png (48x48)
echo "🌐 Génération de favicon.png (48x48)..."
convert "$SOURCE_LOGO" -resize 48x48 -background transparent -gravity center -extent 48x48 "$TEMP_DIR/favicon.png"

# Copier les fichiers générés vers assets/
echo "📋 Copie des icônes vers assets/..."
cp "$TEMP_DIR/icon.png" "assets/icon.png"
cp "$TEMP_DIR/adaptive-icon.png" "assets/adaptive-icon.png"
cp "$TEMP_DIR/splash-icon.png" "assets/splash-icon.png"
cp "$TEMP_DIR/favicon.png" "assets/favicon.png"

# Nettoyer
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Icônes générées avec succès !"
echo "   - icon.png"
echo "   - adaptive-icon.png"
echo "   - splash-icon.png"
echo "   - favicon.png"
echo ""
echo "⚠️  Important: Pour que les changements prennent effet, vous devez:"
echo "   1. Rebuild l'app native (pas juste un OTA update)"
echo "   2. Pour iOS: eas build --platform ios"
echo "   3. Pour Android: eas build --platform android"
