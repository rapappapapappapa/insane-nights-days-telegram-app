# 📚 Documentation API - NOX

## Vue d'ensemble

API REST pour l'application mobile **Nox** (Expo) et le client web legacy.

| Environnement | Base URL |
|---------------|----------|
| **Production** | Instance Railway (ex. `https://….up.railway.app`) — voir `EXPO_PUBLIC_API_BASE` |
| **Local** | `http://localhost:5000/api` (port selon `server/.env`) |

Auth : **JWT** dans le header `Authorization: Bearer <token>`.  
Connexion également via **Google** et **Apple** (`POST /api/auth/google`, `/api/auth/apple`).

> ⚠️ La route `POST /api/wallet/connect` (wallet TON mock) est **obsolète** — ne pas utiliser dans le mobile actuel.

---

## 🔐 Authentification

La plupart des endpoints nécessitent un token JWT dans le header `Authorization` :
```
Authorization: Bearer <token>
```

---

## 📋 Endpoints 

### Authentification

#### `POST /api/auth/register`
Inscription d'un nouvel utilisateur.

**Body:**
```json
{
  "email": "user@example.com",
  "username": "pseudo",
  "password": "motdepasse123"
}
```

**Réponse (201):**
```json
{
  "success": true,
  "message": "Compte créé avec succès.",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "pseudo",
    "score": 100,
    "level": 1
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### `POST /api/auth/login`
Connexion d'un utilisateur (par email ou username).

**Body:**
```json
{
  "email": "user@example.com", // ou username
  "password": "motdepasse123"
}
```

**Réponse (200):**
```json
{
  "success": true,
  "message": "Connexion réussie.",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Authentification sociale (production)

#### `POST /api/auth/google`
Body : `{ "idToken": "…" }` (+ champs inscription si mode register).

#### `POST /api/auth/apple`
Body : `{ "identityToken": "…" }` (+ champs inscription si mode register).

---

### ~~Wallet TON~~ (obsolète)

~~`POST /api/wallet/connect`~~ — mock développement initial, **non utilisé** par l'app Nox actuelle.

---

### Utilisateurs

#### `GET /api/user/profiles`
Récupère tous les profils d'un utilisateur (nécessite authentification).

**Headers:** `Authorization: Bearer <token>`

**Réponse (200):**
```json
{
  "success": true,
  "activeProfileType": "DJ",
  "profiles": {
    "community": [...],
    "dj": [...],
    "booker": [...],
    "venue": [...]
  }
}
```

#### `POST /api/user/switch-profile`
Bascule le profil actif d'un utilisateur (nécessite authentification).

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "profileType": "DJ" // COMMUNITY, DJ, BOOKER, ou VENUE
}
```

#### `POST /api/user/change-password`
Change le mot de passe d'un utilisateur (nécessite authentification).

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "oldPassword": "ancien123",
  "newPassword": "nouveau123",
  "confirmPassword": "nouveau123"
}
```

#### `GET /api/user/:userId`
Récupère les informations d'un utilisateur par son ID.

**Réponse (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "pseudo",
    "score": 100,
    "level": 1,
    "tickets": 5,
    "lastTicket": { ... },
    "eventsParticipated": 5
  }
}
```

---

### Profils

#### `POST /api/profile/community`
Crée un profil Communauté (nécessite authentification).

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "nom": "Dupont",
  "prenom": "Jean",
  "pays": "France",
  "dateNaissance": "15/01/1990"
}
```

#### `POST /api/profile/dj`
Crée un profil DJ (nécessite authentification).

**Body:**
```json
{
  "artistName": "DJ Nox",
  "city": "Paris",
  "genre": "Electro"
}
```

#### `POST /api/profile/booker`
Crée un profil Booker (nécessite authentification).

**Body:**
```json
{
  "nom": "Martin",
  "prenom": "Sophie",
  "bookerType": "INDEPENDENT"
}
```

#### `POST /api/profile/venue`
Crée un profil Venue (nécessite authentification).

**Body:**
```json
{
  "venueName": "Club Nox",
  "address": "123 Rue de la Musique, Paris"
}
```

---

### Événements

#### `GET /api/events`
Récupère la liste de tous les événements.

**Query params (optionnels):**
- `genre`: Filtrer par genre
- `search`: Rechercher dans le titre ou la localisation

**Réponse (200):**
```json
{
  "success": true,
  "events": [...]
}
```

#### `GET /api/events/:eventId`
Récupère les détails d'un événement spécifique.

---

### Tickets

#### `POST /api/tickets/buy`
Achète un ticket pour un événement (nécessite authentification).

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "eventId": 1,
  "quantity": 2
}
```

#### `GET /api/user/:userId/tickets`
Récupère tous les tickets d'un utilisateur.

#### `DELETE /api/tickets/:ticketId`
Supprime un ticket (nécessite authentification).

#### `GET /api/tickets/:ticketId/qr`
Génère un QR code pour un ticket.

---

### Notes (Ratings)

#### `POST /api/ratings/dj`
Note un DJ après un événement (nécessite authentification).

**Body:**
```json
{
  "djId": 1,
  "eventId": 1,
  "rating": 5,
  "comment": "Excellent set !"
}
```

#### `POST /api/ratings/venue`
Note un lieu après un événement (nécessite authentification).

#### `GET /api/ratings/check/:eventId`
Vérifie si l'utilisateur a déjà noté cet événement (nécessite authentification).

---

### DJs

#### `GET /api/djs`
Récupère la liste de tous les DJs.

#### `GET /api/djs/ranking`
Récupère le classement des DJs.

#### `GET /api/dj/:identifier/ratings`
Récupère les notes d'un DJ spécifique.

---

### Statistiques

#### `GET /api/stats`
Récupère les statistiques globales de la plateforme.

**Réponse (200):**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 150,
    "registeredUsers": 100,
    "walletUsers": 50,
    "totalEvents": 25,
    "totalTicketsSold": 500,
    "totalRevenue": 12500,
    "averageUserScore": 450
  }
}
```

---

### Test

#### `GET /api/test`
Vérifie que le serveur fonctionne.

**Réponse (200):**
```json
{
  "message": "🎉 Backend NOX fonctionne parfaitement",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "walletUsersCount": 50,
  "registeredUsersCount": 100,
  "eventsCount": 25
}
```

---

## 🔧 Codes d'erreur

- `200` - Succès
- `201` - Créé avec succès
- `400` - Requête invalide
- `401` - Non autorisé (token manquant ou invalide)
- `403` - Accès interdit
- `404` - Ressource non trouvée
- `409` - Conflit (ex: email déjà utilisé)
- `500` - Erreur serveur

---

## 📝 Notes

- Tous les mots de passe doivent contenir au moins 6 caractères
- Les tokens JWT expirent après 7 jours par défaut
- Les dates de naissance doivent être au format `jj/mm/aaaa`
- Les emails sont normalisés en minuscules

---

## 🏗️ Structure du code

Le code backend est organisé en modules :

```
server/
├── index.js              # Point d'entrée et configuration Express
├── middleware/
│   └── auth.js           # Middleware d'authentification JWT
├── controllers/
│   ├── authController.js # Contrôleur authentification
│   └── userController.js # Contrôleur utilisateurs
├── routes/
│   ├── authRoutes.js     # Routes authentification
│   └── userRoutes.js     # Routes utilisateurs
└── utils/
    ├── validation.js     # Fonctions de validation
    └── helpers.js         # Fonctions utilitaires
```

