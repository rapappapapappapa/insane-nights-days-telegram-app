# 🚀 Insane Nights & Days - App Telegram Moderne

**Une application Telegram complète pour révolutionner l'industrie des événements avec la blockchain !**

## 🎯 Qu'est-ce que c'est ?

**Insane Nights & Days** est une **mini-application Telegram** moderne qui permet de :

- 🎵 **Découvrir des événements** de musique
- 🎟️ **Acheter des tickets** avec QR codes
- 💳 **Connecter son wallet TON** pour les paiements
- 🏆 **Gérer son profil** et gagner des points
- 👥 **Différents rôles** : User, Booker, DJ, Staff, Admin

## 🌟 Pourquoi une App Telegram ?

- **Pas besoin d'app supplémentaire** - tout dans Telegram !
- **Interface web moderne** et responsive
- **Intégration native** avec Telegram
- **Facile à partager** et à utiliser
- **Sécurisé** avec l'écosystème Telegram

## 🏗️ Architecture

```
insane-nights-days-app/
├── client/                 # Frontend React
│   ├── src/               # Code source React
│   └── public/            # Fichiers statiques
├── server/                 # Backend Node.js
│   ├── index.js           # Serveur Express
│   ├── bot.js             # Bot Telegram
│   └── data/              # Gestion des données
└── package.json            # Configuration du projet
```

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- Token bot Telegram

### 1. Cloner le projet
```bash
git clone <votre-repo>
cd insane-nights-days-app
```

### 2. Installer les dépendances
```bash
npm run install:all
```

### 3. Configuration
```bash
cp .env.example .env
# Éditer .env avec votre token bot
```

### 4. Lancer en développement
```bash
npm run dev
```

## 🎮 Fonctionnalités

### 👤 **Page d'Accueil**
- Bouton "Connecter Wallet TON"
- Animation d'introduction
- Design moderne et accrocheur

### 🎵 **Menu Principal**
- Navigation intuitive
- Accès rapide aux fonctionnalités
- Interface adaptée mobile

### 📅 **Événements**
- Liste des événements avec filtres
- Détails complets (DJs, prix, lieu)
- Achat de tickets intégré

### 🎟️ **Tickets**
- QR codes uniques
- Historique des achats
- Validation par le staff

### 🏆 **Profil Utilisateur**
- Score et statistiques
- Historique des événements
- Gestion des préférences

## 🔧 Technologies

### Frontend
- **React 18** - Interface utilisateur moderne
- **Tailwind CSS** - Design responsive et beau
- **React Router** - Navigation entre pages
- **Framer Motion** - Animations fluides

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Telegraf** - Bot Telegram
- **QRCode** - Génération de QR codes

### Blockchain
- **TON** - Intégration wallet
- **SBT** - SoulBound Tokens pour les rôles

## 📱 Pages de l'App

1. **`/`** - Accueil avec connexion wallet
2. **`/menu`** - Menu principal
3. **`/events`** - Liste des événements
4. **`/event/:id`** - Détail d'un événement
5. **`/profile`** - Profil utilisateur
6. **`/tickets`** - Mes tickets
7. **`/admin`** - Administration (si autorisé)

## 🎨 Design

- **Thème sombre** par défaut
- **Couleurs Insane** : Noir, Orange, Blanc
- **Animations fluides** et modernes
- **Interface mobile-first**
- **Icônes et emojis** pour l'expérience

## 🚀 Déploiement

### Développement
```bash
npm run dev          # Frontend + Backend
npm run server:dev   # Backend seulement
npm run client:dev   # Frontend seulement
```

### Production
```bash
npm run build        # Build du frontend
npm start            # Démarrer le serveur
```

## 🔒 Sécurité

- **Validation des rôles** à chaque action
- **Vérification des permissions** côté serveur
- **Protection CSRF** et autres attaques
- **Validation des données** entrantes

## 📈 Évolutivité

### Court terme
- [ ] Intégration TON complète
- [ ] Paiements Stars
- [ ] Notifications push

### Moyen terme
- [ ] Base de données PostgreSQL
- [ ] API publique
- [ ] Interface web desktop

### Long terme
- [ ] Smart contracts SBT
- [ ] NFT minting automatique
- [ ] Application mobile native

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Commit vos changements
4. Push vers la branche
5. Ouvrir une Pull Request

## 📄 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

## 📞 Support

- **Issues GitHub** : Pour les bugs et suggestions
- **Discussions** : Pour les questions générales
- **Email** : contact@insane-corp.com

---

**🎉 Insane Nights & Days - Révolutionner l'industrie des événements avec la blockchain !**

**Insane Corporation** 🚀
