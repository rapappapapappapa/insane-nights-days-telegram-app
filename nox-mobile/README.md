# NOX - Application Mobile

Application mobile React Native avec Expo pour la plateforme NOX.

## 🚀 Structure du Projet

```
nox-mobile/
├── App.js                      # Navigation principale
├── api/
│   ├── endpointsConfig.js     # URL API (`EXPO_PUBLIC_API_BASE`, …)
│   └── config.js              # Agrégation méthodes API
├── screens/                    # Écrans (booker, staff, feed, …)
└── package.json
```

## 📱 Pages Disponibles

- **HomePage** : Connexion wallet TON (mock pour l'instant)
- **MenuPage** : Navigation vers les autres sections
- **EventsPage** : Liste des événements avec recherche et filtres
- **EventDetailPage** : Détails d'un événement
- **ProfilePage** : Profil et statistiques utilisateur
- **TicketsPage** : Gestion des tickets

## 🔌 Connexion Backend

### Configuration API

Le fichier **`api/endpointsConfig.js`** définit l’URL du backend. En build **EAS**, définir par exemple :

| Variable | Usage |
|----------|--------|
| **`EXPO_PUBLIC_API_BASE`** | URL de l’API (sans slash final), ex. `https://…up.railway.app`. |
| **`EXPO_PUBLIC_EVENT_MIN_LEAD_DAYS`** | Délai minimum (jours) affiché côté wizard événement booker ; `0` = aligné sur serveur sans contrainte locale. |
| **`EXPO_PUBLIC_SCAN_TICKET_TEST_SECRET`** | (Optionnel, ≥ 8 car.) Même valeur que **`SCAN_TICKET_TEST_SECRET`** sur le serveur → active l’interrupteur *scan hors jour* sur **`ScanTicketPage`** (sinon le bandeau reste visible mais le switch peut rester inactif). |
| **`EXPO_PUBLIC_HIDE_SCAN_TEST_UI`** | `true` / `1` → masque tout le bandeau de test sur l’écran scan (prod finale). |

Variables serveur associées : **`server/env.example.txt`** (`SCAN_TICKET_TEST_SECRET`, `SCAN_TICKET_ALLOW_ANY_DAY`, etc.).

```javascript
// Ancienne note locale — préférer EXPO_PUBLIC_API_BASE en CI / EAS
API_CONFIG.BASE_URL = 'http://172.20.10.7:5000'
```

### Activer la connexion backend

Dans `EventsPage.js`, décommentez les lignes pour activer la récupération des événements depuis le backend :

```javascript
useEffect(() => {
  fetchEvents();
}, []);

const fetchEvents = async () => {
  setLoading(true);
  try {
    const data = await api.getEvents();
    if (data.success) {
      setEvents(data.events);
    }
  } catch (error) {
    console.error('Erreur récupération événements:', error);
  } finally {
    setLoading(false);
  }
};
```

### Fonctions API disponibles

- `api.connectWallet(walletAddress, username)` - Connexion wallet
- `api.getUserProfile(userId)` - Profil utilisateur
- `api.getEvents()` - Liste des événements
- `api.buyTicket(userId, eventId, quantity)` - Acheter un ticket
- `api.getUserTickets(userId)` - Tickets utilisateur
- `api.getTicketQR(ticketId)` - QR code ticket
- `api.getStats()` - Statistiques globales

## 🎨 Design

- Thème NOX : Fond noir (#0b0b0e) et orange (#ff7a1a)
- Navigation native avec React Navigation
- Mock data pour tester sans backend

## 🛠️ Installation

```bash
npm install
npx expo start
```

## 📝 Pistes / dette doc

- Voir **`CHANGELOG.md`** (racine du dépôt) pour l’historique récent (booker, scan QR, PDF, Railway).
- Le client web **`client/`** contient encore des listes TODO génériques ; le flux principal exposé ici est l’app **Expo** sous ce dossier.

