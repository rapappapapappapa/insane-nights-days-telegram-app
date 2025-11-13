# 🧠 Exercices de Pratique - Insane Nights & Days

Ces exercices vous permettent de rejouer les étapes clés du projet et de comprendre comment les différentes pièces fonctionnent.

## Organisation

```
exercises/
├── backend/
│   └── index.js            # Squelette du backend à compléter
├── mobile/
│   └── App.js              # Squelette de l'app mobile à compléter
└── README.md               # Ce guide
```

## Comment travailler

1. Copiez le fichier d'exercice dans la vraie source (ex. `backend/index.js` → `server/index.js`).
2. Remplissez les sections `TODO`.
3. Lancez le projet (`npm run dev` + `npx expo start`) et vérifiez.
4. Comparez avec la solution actuelle si besoin.

## Exercices

### 1. Backend Express : routes et logique
- Initialiser les données en mémoire (`users`, `events`, `tickets`).
- Exposer les routes `/api/events`, `/api/user/:id`, `/api/tickets/buy`, etc.
- Gérer les erreurs et les réponses JSON.

### 2. Connexion Wallet
- Créer une route POST `/api/wallet/connect`.
- Générer un utilisateur et un token.
- Renvoyer les données dans le bon format.

### 3. App mobile Expo : récupérer les événements
- Utiliser `useEffect` pour appeler l'API.
- Stocker les événements dans `useState`.
- Implémenter un fallback mock en cas d'erreur réseau.

### 4. Interface mobile : filtres et recherche
- Filtrer par genre.
- Rechercher par titre ou localisation.
- Afficher les cartes d'événements.

### 5. Édition du profil mobile
- Gérer les états `isEditing`, `editForm`, `user`.
- Implémenter `handleSave`.
- Afficher les statistiques utilisateur.

## Astuce

Gardez la version fonctionnelle du projet à côté pour vérifier vos réponses. Bonne pratique ! 🎉



