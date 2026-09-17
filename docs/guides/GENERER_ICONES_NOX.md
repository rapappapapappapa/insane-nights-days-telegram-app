# 🎨 Générer les icônes de l'app depuis le logo Nox

## 📋 Méthode 1 : Script automatique (recommandé)

### Prérequis
- ImageMagick installé : `sudo apt-get install imagemagick` (Linux) ou `brew install imagemagick` (Mac)

### Utilisation
```bash
cd nox-mobile
bash scripts/generate-icons.sh
```

Le script va :
1. Utiliser `vrailogo.png` comme source (ou `noxlogo.png` en alternative)
2. Générer automatiquement :
   - `icon.png` (1024x1024) - Icône principale
   - `adaptive-icon.png` (1024x1024) - Icône Android adaptative
   - `splash-icon.png` (1024x1024) - Écran de démarrage
   - `favicon.png` (48x48) - Favicon web

## 📋 Méthode 2 : Outils en ligne (plus simple)

Si ImageMagick n'est pas installé, utilisez un outil en ligne :

### Expo Assets Generator
1. Allez sur https://expo-assets-generator.vercel.app/
2. Uploadez `assets/vrailogo.png` ou `assets/noxlogo.png`
3. Téléchargez le ZIP généré
4. Extrayez les fichiers dans `assets/`

### Expo Icon Builder
1. Allez sur https://expo-icon-builder.com/
2. Uploadez votre logo Nox
3. Configurez les options (couleur de fond, etc.)
4. Téléchargez et remplacez les fichiers dans `assets/`

## 📋 Méthode 3 : rn-app-icons (CLI)

```bash
cd nox-mobile
npx rn-app-icons --input assets/vrailogo.png
```

Cet outil génère automatiquement toutes les tailles nécessaires.

## ⚠️ Important après génération

Les icônes système nécessitent un **rebuild natif** pour être visibles :

### Pour iOS
```bash
eas build --platform ios
```

### Pour Android
```bash
eas build --platform android
```

⚠️ **Un simple OTA update (expo update) ne suffit pas** - les icônes sont intégrées dans le build natif.

## ✅ Vérification

Après le rebuild, vérifiez que :
- L'icône sur l'écran d'accueil affiche le logo Nox
- L'écran de démarrage affiche le logo Nox
- Le favicon du site web affiche le logo Nox
