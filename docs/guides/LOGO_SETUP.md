# 🎨 Configuration du Logo NOX

## 📍 Emplacement du fichier logo

Le logo doit être placé dans :
```
nox-mobile/assets/logo.png
```

## 📋 Format recommandé

- **Format** : PNG (avec fond transparent ou fond noir)
- **Taille recommandée** : 512x512 pixels minimum (pour une bonne qualité sur tous les écrans)
- **Fond** : Transparent ou noir (selon votre préférence)

## ✅ Utilisation

Le logo est utilisé dans :
- `SplashPage.js` — écran de lancement (déconnecté)
- `LoginPage.js` — connexion / inscription
- `ProHomePage.js`, `CommunityHomePage.js` — accueils connectés
- Composant réutilisable `components/Logo.js` (drawer, headers, etc.)

## 🔧 Composant Logo

Le composant `Logo.js` est réutilisable et peut être importé partout :

```javascript
import Logo from '../components/Logo';

// Utilisation avec taille par défaut (100x100)
<Logo />

// Utilisation avec taille personnalisée
<Logo size={80} />

// Avec style personnalisé
<Logo size={100} style={{ marginBottom: 20 }} />
```

## ⚠️ Important

Si le fichier `logo.png` n'existe pas dans `assets/`, l'application va crasher au démarrage.
Assurez-vous de placer le logo avant de lancer l'application.
