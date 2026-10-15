# 📱 Guide de Setup - Application Mobile NOX

## 🎯 Objectif
Transformer votre application React web en application mobile native pour iOS et Android.

---

## 📋 ÉTAPE 1 : Installation des Outils Nécessaires

### Pour Android (Requis) :

1. **Android Studio** (pour l'émulateur et les outils de build)
   ```bash
   # Télécharger depuis : https://developer.android.com/studio
   # Installer Android SDK, Android SDK Platform-Tools, et Android Virtual Device
   ```

2. **Variables d'environnement Android**
   ```bash
   # Ajouter dans ~/.bashrc ou ~/.zshrc :
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

### Pour iOS (Seulement si vous avez un Mac) :

1. **Xcode** (depuis l'App Store Mac)
2. **CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

### Outils Globaux (Nécessaires) :

```bash
# Expo (nouvelle méthode - recommandée)
npm install -g @expo/cli

# Ou utiliser npx directement (pas besoin d'installer)
# npx expo init
```

---

## 🚀 ÉTAPE 2 : Créer le Projet Mobile

### Option A : Créer un nouveau projet Expo (Recommandé)

```bash
# Dans le dossier parent de votre projet
cd ..
npx create-expo-app nox-mobile --template blank

# Ou avec TypeScript
npx create-expo-app nox-mobile --template blank-typescript
```

### Option B : Migrer votre code React existant

Votre code React actuel peut être adapté pour React Native, mais il faudra :
- Remplacer `div` par `View`
- Remplacer `button` par `TouchableOpacity` ou `Pressable`
- Remplacer `input` par `TextInput`
- Adapter le routing avec `@react-navigation/native`
- Adapter les styles (pas de Tailwind directement, mais `react-native-tailwindcss` ou StyleSheet)

---

## 📲 ÉTAPE 3 : Tester sur Votre Téléphone

### Méthode 1 : Expo Go (LE PLUS SIMPLE - Recommandé pour commencer)

1. **Installer Expo Go sur votre téléphone** :
   - Android : [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS : [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **Démarrer le serveur de développement** :
   ```bash
   cd nox-mobile
   npx expo start
   ```

#### ⚠️ Android: erreur “Invalid input to toASCII”
Si sur Android tu n’arrives pas à ouvrir le QR code en **Tunnel** avec une erreur du type **“Invalid input to toASCII”**, c’est généralement parce que le sous-domaine du tunnel contient un caractère invalide pour un hostname (ex: `_`).

➡️ Solution (automatique) :

```bash
cd nox-mobile
npm run tunnel:android
```

Puis scanne le QR code avec **Expo Go**.

3. **Scanner le QR code** :
   - Android : Ouvrir Expo Go et scanner le QR code
   - iOS : Ouvrir l'app Caméra et scanner le QR code, puis ouvrir dans Expo Go

4. **Changements en temps réel** :
   - L'app se met à jour automatiquement quand vous modifiez le code !

### Méthode 2 : Build pour Android (APK)

```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter à Expo
eas login

# Configurer le build
eas build:configure

# Créer un build Android
eas build --platform android
```

### Méthode 3 : Build pour iOS (IPA - Nécessite un Mac)

```bash
eas build --platform ios
```

---

## 🔧 ÉTAPE 4 : Installer les Dépendances pour Mobile

### Dans votre nouveau projet Expo :

```bash
cd nox-mobile

# Navigation
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context

# Telegram Web App SDK (pour mobile)
npm install @twa-dev/sdk

# Autres dépendances utiles
npm install axios
npm install react-native-qrcode-svg  # Pour les QR codes
npm install expo-camera  # Pour scanner les QR codes
```

---

## 📱 ÉTAPE 5 : Configuration pour Telegram

### Intégration Telegram Web App dans React Native :

1. **Installer le SDK Telegram** :
```bash
npm install @twa-dev/sdk
```

2. **Initialiser dans votre App.js** :
```javascript
import { useEffect } from 'react';
import { initTelegramApp } from '@twa-dev/sdk';

export default function App() {
  useEffect(() => {
    try {
      initTelegramApp();
    } catch (error) {
      console.log('Pas dans Telegram, mode développement');
    }
  }, []);
  
  // ... reste de votre code
}
```

---

## 🎨 ÉTAPE 6 : Adapter votre Code React → React Native

### Conversions courantes :

| React Web | React Native |
|-----------|--------------|
| `<div>` | `<View>` |
| `<button>` | `<TouchableOpacity>` ou `<Pressable>` |
| `<input>` | `<TextInput>` |
| `<img>` | `<Image>` |
| `<span>`, `<p>` | `<Text>` |
| CSS classes | `StyleSheet.create()` ou `react-native-tailwindcss` |
| `react-router-dom` | `@react-navigation/native` |

### Exemple de conversion :

**React Web (avant) :**
```javascript
<div className="container">
  <button onClick={handleClick}>Click me</button>
</div>
```

**React Native (après) :**
```javascript
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

<View style={styles.container}>
  <TouchableOpacity onPress={handleClick}>
    <Text>Click me</Text>
  </TouchableOpacity>
</View>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});
```

---

## ✅ Checklist de Démarrage Rapide

- [ ] Installer Android Studio (pour Android)
- [ ] Installer Expo Go sur votre téléphone
- [ ] Créer le projet Expo : `npx create-expo-app nox-mobile`
- [ ] Installer les dépendances
- [ ] Démarrer : `npx expo start`
- [ ] Scanner le QR code avec Expo Go
- [ ] Commencer à adapter votre code !

---

## 🚨 Points Importants

1. **Votre code actuel** est en React web, il faudra l'adapter pour React Native
2. **Expo Go** est parfait pour tester rapidement, mais pour publier sur les stores, il faudra faire un build complet
3. **Les stores** (Apple/Google) ont des règles strictes sur les paiements crypto - utilisez Telegram Stars pour être conforme
4. **Le backend** (Express) reste le même, seule l'interface client change

---

## 📞 Besoin d'aide ?

- Documentation Expo : https://docs.expo.dev
- Documentation React Native : https://reactnative.dev
- Telegram Web App : https://core.telegram.org/bots/webapps

---

## 🎯 Prochaines Étapes

1. Créer le projet mobile avec Expo
2. Migrer progressivement vos composants
3. Tester sur votre téléphone avec Expo Go
4. Préparer les builds pour les stores
5. Soumettre sur App Store et Google Play

