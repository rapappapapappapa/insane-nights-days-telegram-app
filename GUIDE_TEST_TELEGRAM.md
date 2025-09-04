# 🚀 Guide de Test - App Telegram Insane Nights & Days

## 📱 **Comment tester votre app dans Telegram :**

### **Étape 1 : Tester en local d'abord**
```bash
cd client
npm start
```
Ouvrez `http://localhost:3000` pour vérifier que l'app fonctionne.

### **Étape 2 : Tester dans Telegram (3 options)**

#### **Option A : Via @BotFather (Recommandé)**
1. **Ouvrez Telegram** et cherchez `@BotFather`
2. **Envoyez** `/newbot`
3. **Donnez un nom** à votre bot (ex: "Insane Nights Bot")
4. **Donnez un username** (ex: "insane_nights_bot")
5. **Envoyez** `/newapp`
6. **Sélectionnez votre bot**
7. **Donnez un titre** : "Insane Nights & Days"
8. **Donnez une description** : "Plateforme d'événements musique avec blockchain TON"
9. **Donnez l'URL** : `http://localhost:3000` (pour test local)
10. **Testez** en cliquant sur le bouton "Open App"

#### **Option B : Via @WebAppBot (Plus simple)**
1. **Ouvrez Telegram** et cherchez `@WebAppBot`
2. **Envoyez** `/start`
3. **Cliquez sur "Create Web App"**
4. **Remplissez les infos** :
   - **Title** : Insane Nights & Days
   - **Description** : Plateforme d'événements musique avec blockchain TON
   - **URL** : `http://localhost:3000`
5. **Testez** immédiatement !

#### **Option C : Via un lien direct (Test rapide)**
1. **Ouvrez Telegram** sur votre téléphone
2. **Tapez dans la barre de recherche** : `https://t.me/WebAppBot`
3. **Cliquez sur le lien** pour ouvrir @WebAppBot
4. **Suivez les étapes** de l'Option B

### **Étape 3 : Tester l'app**

**Une fois l'app ouverte dans Telegram :**

1. **Écran 1** : Vous devriez voir le logo Insane et le bouton "Connecter Wallet TON"
2. **Cliquez sur "Connecter Wallet"** : Simulation de connexion TON
3. **Écran 2** : Redirection automatique vers le menu principal
4. **Testez la navigation** : Cliquez sur les différentes options

### **Étape 4 : Déploiement en production**

**Pour la démo finale, il faudra :**
1. **Déployer l'app** sur un serveur (Vercel, Netlify, etc.)
2. **Remplacer l'URL** par l'URL de production
3. **Tester** avec la vraie URL

## 🎯 **Ce que vous devriez voir :**

- ✅ **Interface mobile** optimisée pour téléphone
- ✅ **Couleurs Insane** (noir/orange)
- ✅ **Navigation simple** entre 2 écrans principaux
- ✅ **Intégration Telegram** native

## 🚨 **En cas de problème :**

- **Vérifiez que l'app fonctionne** en local d'abord
- **Assurez-vous que l'URL** est accessible
- **Vérifiez la console** pour les erreurs
- **Testez sur mobile** pour voir l'interface réelle

---

**Votre app Insane Nights & Days est prête à être testée dans Telegram ! 🎉**
