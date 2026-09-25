# Fonctionnalité : Amis Organisateur + Staff événement + Scan QR

## Vue d'ensemble

Permettre aux organisateurs (bookers) d'ajouter des profils Communauté comme "amis", de les assigner comme staff sur des événements (rôle scan QR), et de scanner les QR codes des billets pour valider l'entrée.

## Modèles

### BookerCommunityFriend
- `bookerId` → UserBooker
- `communityId` → UserCommunity
- `status` : PENDING, ACCEPTED (le booker envoie, la communauté accepte)
- Un booker peut avoir des amis Communauté
- Seuls les amis ACCEPTED peuvent être assignés comme staff

### EventStaff
- `eventId` → Event
- `communityId` → UserCommunity (le staff)
- `role` : STAFF_SCAN (peut scanner les QR codes)
- `addedByBookerId` → UserBooker (qui l'a ajouté)
- Un community ne peut être staff qu'une fois par événement

### Ticket
- `status` : 'valid' | 'used' (passé à 'used' au premier scan réussi)
- Optionnel : `scannedAt` DateTime pour traçabilité

## API

### Amis Organisateur
- `GET /api/booker/friends` - Liste des amis (Community) du booker
- `POST /api/booker/friends` - Envoyer demande (body: { communityId })
- `GET /api/booker/friend-requests` - Demandes reçues (Community reçoit, accepte depuis son profil)
- `PUT /api/booker/friends/:id/accept` - Accepter (côté Community)
- `PUT /api/booker/friends/:id/decline` - Refuser

### Staff événement
- `GET /api/events/:eventId/staff` - Liste du staff (booker ou staff)
- `POST /api/events/:eventId/staff` - Ajouter staff (body: { communityId, role }) — booker uniquement, community doit être ami
- `DELETE /api/events/:eventId/staff/:communityId` - Retirer un staff

### Scan ticket
- `POST /api/events/:eventId/scan-ticket` - body: `{ qrCode: "TICKET_…" | chaîne / JSON scanné }`, optionnel : **`scanTestSecret`** (string, ≥ 8 car.) si **`SCAN_TICKET_TEST_SECRET`** est défini côté serveur avec la même valeur — contourne la contrainte « jour de l’événement » comme **`SCAN_TICKET_ALLOW_ANY_DAY=true`**.
- Autorisation : booker de l'événement OU staff avec rôle STAFF_SCAN
- Fenêtre de scan : **même jour calendaire (UTC)** que `event.date`, **ou** événement au statut **ONGOING**, **ou** **`SCAN_TICKET_ALLOW_ANY_DAY=true`** (explicite). **Défaut strict** si la variable est absente (y compris sur Railway). Contournement test : secret aligné app/serveur (voir ci‑dessous).
- **Phase de test (app)** : bandeau *Test : scan hors jour* **masqué par défaut**. Opt-in staging : **`EXPO_PUBLIC_SHOW_SCAN_TEST_UI=true`** + **`EXPO_PUBLIC_SCAN_TICKET_TEST_SECRET`** (≥ 8 car.) aligné sur **`SCAN_TICKET_TEST_SECRET`** API. Ne pas embarquer le secret dans un build store.
- Réponse si valid : ticket `used` + `scannedAt` ; JSON inclut `ticket.holderDisplayName`, `ticket.entered: true` pour l’UI.
- La liste **Participants (billets)** sur le dashboard organisateur (`GET /api/booker/events` → `ticketHolders`) reflète `entered` dès rechargement (pull-to-refresh ou retour depuis l’écran scan ; l’app pose un flag AsyncStorage après un scan réussi).

## Mobile

### Écrans
1. **BookerFriendsPage** - Liste amis + ajout (recherche par pseudo Community)
2. **EventStaffPage** - Pour un événement : liste staff, ajouter (parmi les amis)
3. **ScanTicketPage** - Caméra QR, scan, feedback valid/invalid

### Navigation
- BookerDashboard → "Mes amis" → BookerFriendsPage
- BookerDashboard (carte event) → "Staff" → EventStaffPage
- EventStaffPage / BookerDashboard → "Scanner billets" → ScanTicketPage
