# Insane Nights & Days - Application Mobile

Application mobile React Native avec Expo pour la plateforme Insane Nights & Days.

## 🚀 Structure du Projet

```
insane-nights-days-mobile/
├── App.js                 # Navigation principale
├── api/
│   └── config.js         # Configuration API et fonctions backend
├── screens/
│   ├── HomePage.js       # Page d'accueil avec connexion wallet
│   ├── MenuPage.js       # Menu principal
│   ├── EventsPage.js     # Liste des événements
│   ├── EventDetailPage.js # Détails d'un événement
│   ├── ProfilePage.js    # Profil utilisateur
│   └── TicketsPage.js    # Tickets de l'utilisateur
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

Le fichier `api/config.js` contient toute la configuration pour se connecter au backend :

```javascript
// URL de base (modifiable via variable d'environnement)
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

- Thème Insane : Fond noir (#0b0b0e) et orange (#ff7a1a)
- Navigation native avec React Navigation
- Mock data pour tester sans backend

## 🛠️ Installation

```bash
npm install
npx expo start
```

## 📝 TODO

- [ ] Activer la connexion backend dans EventsPage
- [ ] Implémenter la vraie connexion wallet dans HomePage
- [ ] Ajouter la gestion des tickets
- [ ] Ajouter le scan QR code pour les tickets
- [ ] Intégrer Telegram Web App SDK

