# 🎉 Insane Nights & Days - App Telegram

**Plateforme d'événements musique révolutionnaire avec blockchain TON**

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.2.0-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18.2-black.svg)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3.0-38B2AC.svg)](https://tailwindcss.com/)

## 🚀 Aperçu

**Insane Nights & Days** est une application Telegram moderne qui révolutionne l'industrie des événements musique en intégrant la blockchain TON. L'app propose une interface mobile-first avec connexion wallet, gestion d'événements et système de tickets.

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
- **Thème sombre** avec couleurs Insane
- **Responsive design** pour tous les appareils

## 🏗️ Architecture

```
insane-nights-days-app/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── pages/        # Pages de l'application
│   │   └── telegram-web-app.js  # Intégration Telegram
│   ├── public/           # Assets statiques
│   └── tailwind.config.js # Configuration Tailwind
├── server/                # Backend Express
│   ├── index.js          # Serveur principal
│   └── package.json      # Dépendances backend
└── docs/                  # Documentation
```

## 🛠️ Technologies

### Frontend
- **React 18.2.0** - Interface utilisateur
- **Tailwind CSS 3.3.0** - Styling et design
- **React Router 6.8.0** - Navigation
- **Telegram Web App SDK** - Intégration native

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

### 1. Cloner le projet
```bash
git clone <votre-repo>
cd "insane-nights-days-app"
```

### 2. Installer les dépendances
```bash
# Dépendances racine
npm install

# Dépendances client
cd client && npm install

# Dépendances serveur
cd ../server && npm install
```

### 3. Lancer l'application
```bash
# Terminal 1 - Backend
cd server && npm start

# Terminal 2 - Frontend
cd client && npm start
```

### 4. Accéder à l'app
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:5000
- **Test API** : http://localhost:5000/api/test

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

### Couleurs
- **Insane Black** : #000000 (Fond principal)
- **Insane Orange** : #FF6B35 (Accents, boutons)
- **Insane Gray** : #1A1A1A (Cartes, éléments)
- **Insane White** : #FFFFFF (Texte principal)

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

## 📄 Licence

**MIT License** - Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👥 Équipe

**Insane Corporation** - Révolutionner l'industrie des événements avec la blockchain

### Contact
- **Email** : dev@insane-corp.com
- **Site** : https://insane-corp.com
- **Telegram** : @InsaneNightsDays

## 🙏 Remerciements

- **Telegram** pour la plateforme Web App
- **TON Foundation** pour la blockchain
- **React Team** pour l'écosystème frontend
- **Express.js** pour le framework backend

---

**🎵 Révolutionnez l'industrie des événements avec Insane Nights & Days ! 🎵**
