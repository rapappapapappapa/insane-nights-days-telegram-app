# NOX

**Plateforme événementielle — app mobile Expo (`nox-mobile/`), API (`server/`), client web legacy (`client/`).**

> **Doc à jour :** voir [`docs/STACK.md`](docs/STACK.md), [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) et [`CHANGELOG.md`](CHANGELOG.md).  
> Ce README racine est partiellement obsolète (SQLite, port 5000 local, etc.) — la prod tourne sur **PostgreSQL + Railway**.

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.2.0-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18.2-black.svg)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3.0-38B2AC.svg)](https://tailwindcss.com/)

## 🚀 Aperçu

**NOX** est la plateforme Nox : application mobile (Expo), API Node/Railway et billetterie événementielle.

## ✨ Fonctionnalités

### 🔐 Authentification
- **Connexion Wallet TON** simulée
- **Système SBT** (SoulBound Token) pour la gestion des rôles
- **Profils utilisateurs** avec scores et niveaux

### 📅 Événements
- **Catalogue d'événements** dynamique
- **Filtres par genre** (Electro, Drum & Bass, etc.)
- **Recherche intelligente** par titre et localisation
- **Gestion des capacités** et places disponibles

### 🎟️ Tickets
- **Achat de tickets** en temps réel
- **Génération de QR codes** pour validation
- **Historique des achats** par utilisateur

### 📱 Interface
- **Design mobile-first** optimisé pour Telegram
- **Navigation fluide** entre les écrans
- **Thème sombre NOX** (tokens `#2852E8`, fond `#0A0A09`)
- **Responsive design** pour tous les appareils

## 🏗️ Architecture

```
nox-platform/
├── client/                 # Frontend React Web
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── pages/        # Pages de l'application
│   │   └── telegram-web-app.js  # Intégration Telegram
│   ├── public/           # Assets statiques
│   └── tailwind.config.js # Configuration Tailwind
├── server/                # Backend Express
│   ├── index.js          # Serveur principal
│   └── package.json      # Dépendances backend
└── nox-mobile/  # Application Mobile React Native
    ├── screens/          # Écrans de l'application
    ├── api/             # Configuration API
    └── App.js           # Point d'entrée
```

## 🛠️ Technologies

### Frontend Web
- **React 18.2.0** - Interface utilisateur
- **Tailwind CSS 3.3.0** - Styling et design
- **React Router 6.8.0** - Navigation
- **Telegram Web App SDK** - Intégration native

### Frontend Mobile
- **React Native** - Framework mobile
- **Expo** - Outils de développement
- **React Navigation** - Navigation native
- **API Config** - Configuration backend prête

### Backend
- **Node.js 22.2.0** - Runtime JavaScript
- **Express 4.18.2** - Framework web
- **UUID** - Génération d'identifiants uniques
- **QRCode** - Génération de codes QR
- **CORS** - Gestion des requêtes cross-origin

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Expo CLI (pour l'app mobile)

### 1. Cloner le projet
```bash
git clone https://github.com/rapappapapappapa/nox-mobile.git
cd nox-mobile
```

### 2. Installer les dépendances
```bash
# Dépendances racine, client et serveur
npm run install:all

# Pour l'app mobile
cd nox-mobile && npm install
```

### 3. Lancer l'application

#### Application Web
```bash
# Lancer en mode développement (client + serveur)
npm run dev

# Ou séparément :
npm run server:dev  # Terminal 1
npm run client:dev  # Terminal 2
```

#### Application Mobile
```bash
cd nox-mobile
npx expo start
```

### 4. Accéder à l'app
- **Frontend Web** : http://localhost:3000
- **Backend API** : http://localhost:5000
- **Test API** : http://localhost:5000/api/test
- **App Mobile** : Scanner le QR code avec Expo Go

## 📱 Utilisation

### Flow utilisateur
1. **Écran d'accueil** → Bouton "Connecter Wallet TON"
2. **Connexion** → Création/authentification utilisateur
3. **Menu principal** → Navigation vers les fonctionnalités
4. **Événements** → Découverte et achat de tickets

### API Endpoints
- `POST /api/wallet/connect` - Connexion wallet
- `GET /api/events` - Liste des événements
- `POST /api/tickets/buy` - Achat de tickets
- `GET /api/user/:id` - Profil utilisateur
- `GET /api/stats` - Statistiques globales

## 🎨 Design System

### Couleurs (client web legacy)
- **Nox Black** : #000000
- **Nox Primary** : #FF6B35 (legacy web)
- **Nox Gray** : #1A1A1A
- **Nox White** : #FFFFFF

> L’app mobile utilise les tokens dans `nox-mobile/constants/colors.js` (bleu `#2852E8`).

### Typographie
- **Fonts** : Système par défaut
- **Tailles** : Responsive (sm, base, lg, xl, 2xl, 3xl)
- **Poids** : Regular, Medium, Bold, Black

## 🔧 Configuration

### Variables d'environnement
```bash
# .env
HOST=0.0.0.0
PORT=3000
REACT_APP_API_URL=http://172.20.10.7:5000
```

### Ports par défaut
- **Frontend** : 3000
- **Backend** : 5000

## 📊 Base de données

### Structure en mémoire
- **Utilisateurs** : Profils, scores, niveaux
- **Événements** : Titres, dates, capacités, DJs
- **Tickets** : Achats, QR codes, statuts

### Données d'exemple
- 2 événements pré-configurés
- Système de scores automatique
- Gestion des capacités en temps réel

## 🧪 Tests

### Test de l'API
```bash
curl http://localhost:5000/api/test
```

### Test du frontend
```bash
curl http://localhost:3000
```

## 🚀 Déploiement

### Production
```bash
# Build du frontend
cd client && npm run build

# Démarrage du serveur
cd ../server && npm start
```

### Docker (optionnel)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📈 Roadmap

### Phase 1 ✅ (Actuelle)
- [x] Interface mobile-first
- [x] Connexion wallet simulée
- [x] Gestion des événements
- [x] Système de tickets

### Phase 2 🔄
- [ ] Intégration TON réelle
- [ ] Paiements en crypto
- [ ] Notifications push
- [ ] Géolocalisation

### Phase 3 🚀
- [ ] Marketplace NFT
- [ ] Système de récompenses
- [ ] Intégration DJs
- [ ] Analytics avancées

## 🤝 Contribution

### Guidelines
1. Fork le projet
2. Créer une branche feature
3. Commit avec messages descriptifs
4. Pull request avec description détaillée

### Standards de code
- **ESLint** pour la qualité JavaScript
- **Prettier** pour le formatage
- **Conventional Commits** pour les messages

## 📋 Changelog

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique des modifications. À mettre à jour à chaque changement significatif.

## 📄 Licence

**MIT License** - Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👥 Équipe

**NOX** - Révolutionner l'industrie des événements avec la blockchain

### Contact
- **Email** : support@nox.world
- **Site** : https://nox.world

## 🙏 Remerciements

- **Telegram** pour la plateforme Web App
- **TON Foundation** pour la blockchain
- **React Team** pour l'écosystème frontend
- **Express.js** pour le framework backend

---

**🎵 Révolutionnez l'industrie des événements avec NOX ! 🎵**
