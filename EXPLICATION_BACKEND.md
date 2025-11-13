# 🎯 Explication du Backend - Insane Nights & Days

## 📋 Vue d'ensemble

Le backend est un **serveur Express.js** qui gère toute la logique métier de l'application. Il sert d'API REST pour que l'application mobile puisse récupérer et manipuler des données.

## 🗄️ Stockage des données

**Base de données en mémoire** (pas de vraie base de données pour l'instant) :
- `users` : Liste des utilisateurs connectés via leur wallet TON
- `events` : Liste des événements disponibles
- `tickets` : Liste des tickets achetés par les utilisateurs

⚠️ **Note** : Les données sont perdues quand le serveur redémarre. C'est normal pour une version de développement.

## 🔌 Endpoints API disponibles

### 1. **POST /api/wallet/connect** - Connexion Wallet TON
- **Fonction** : Connecte un utilisateur avec son adresse wallet TON
- **Données reçues** : `{ walletAddress, username }`
- **Ce que ça fait** :
  - Vérifie si l'utilisateur existe déjà
  - Si non, crée un nouvel utilisateur avec :
    - Score initial : 100 points
    - Niveau : 1
    - SBT (Soul Bound Token) actif
  - Génère un token de session
  - Retourne les infos utilisateur

### 2. **GET /api/user/:userId** - Profil utilisateur
- **Fonction** : Récupère toutes les infos d'un utilisateur
- **Données retournées** : Score, niveau, événements participés, tickets achetés, etc.

### 3. **GET /api/events** - Liste des événements
- **Fonction** : Récupère tous les événements disponibles
- **Données retournées** : Liste complète avec titres, dates, DJs, prix, capacités, etc.
- **✅ C'est celui que l'app mobile utilise maintenant !**

### 4. **POST /api/tickets/buy** - Acheter un ticket
- **Fonction** : Permet à un utilisateur d'acheter un ticket pour un événement
- **Données reçues** : `{ userId, eventId, quantity }`
- **Ce que ça fait** :
  - Vérifie que l'événement a des places disponibles
  - Crée un ticket avec un QR code unique
  - Met à jour le nombre de places vendues
  - Ajoute des points au score utilisateur (+50 points par ticket)
  - Calcule le nouveau niveau (1 niveau tous les 200 points)

### 5. **GET /api/user/:userId/tickets** - Tickets de l'utilisateur
- **Fonction** : Récupère tous les tickets d'un utilisateur
- **Données retournées** : Liste des tickets avec leurs QR codes

### 6. **GET /api/tickets/:ticketId/qr** - QR Code d'un ticket
- **Fonction** : Génère l'image QR code d'un ticket
- **Retourne** : Une image QR code en base64 (format DataURL)

### 7. **GET /api/stats** - Statistiques globales
- **Fonction** : Donne des stats sur l'application
- **Données retournées** :
  - Nombre total d'utilisateurs
  - Nombre d'événements
  - Nombre de tickets vendus
  - Revenus totaux
  - Score moyen des utilisateurs

### 8. **GET /api/test** - Route de test
- **Fonction** : Vérifie que le serveur fonctionne
- **Utile pour** : Debug et vérification de connexion

## 🎮 Système de points et niveaux

- **Score initial** : 100 points
- **Points gagnés** : +50 points par ticket acheté
- **Niveau** : Calculé automatiquement (1 niveau tous les 200 points)
  - 100 points = Niveau 1
  - 300 points = Niveau 2
  - 500 points = Niveau 3
  - etc.

## 🔒 Sécurité (version actuelle)

⚠️ **Version de développement** - À améliorer pour la production :
- Tokens de session simples (UUID)
- Pas de validation d'adresse wallet TON
- Pas d'authentification réelle
- Données en mémoire (pas persistantes)

## 🚀 Comment ça marche avec l'app mobile

1. **L'app démarre** → Elle se connecte au backend (port 5000)
2. **L'utilisateur ouvre "Événements"** → L'app appelle `GET /api/events`
3. **Le backend répond** → Retourne la liste des événements
4. **L'app affiche** → Les événements sont affichés dans l'interface

## 📝 Notes importantes

- Le backend tourne sur le **port 5000** par défaut
- Accessible en local : `http://localhost:5000`
- Accessible sur le réseau : `http://172.20.10.7:5000`
- CORS activé pour permettre les requêtes depuis l'app mobile
- Format de réponse : JSON avec `{ success: true/false, ... }`

## 🔄 Prochaines étapes possibles

- [ ] Ajouter une vraie base de données (MongoDB, PostgreSQL)
- [ ] Implémenter l'authentification réelle avec Telegram
- [ ] Ajouter la validation des wallets TON
- [ ] Persister les données entre les redémarrages
- [ ] Ajouter la gestion des paiements Telegram Stars
- [ ] Ajouter des notifications push

