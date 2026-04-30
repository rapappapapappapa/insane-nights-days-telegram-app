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
- `POST /api/events/:eventId/scan-ticket` - body: { qrCode: "TICKET_XXX" ou JSON parsé }
- Autorisation : booker de l'événement OU staff avec rôle STAFF_SCAN
- Fenêtre de scan : **même jour calendaire (UTC)** que `event.date`, **ou** événement au statut **ONGOING**, **ou** **`SCAN_TICKET_ALLOW_ANY_DAY=true`** sur le serveur, **ou** si cette variable est **absente** sur un déploiement **Railway** (présence de `RAILWAY_PUBLIC_DOMAIN` / `RAILWAY_ENVIRONMENT` / `RAILWAY_SERVICE_NAME`) : équivalent **autorisé tous les jours** ; en **local** sans Railway : contrainte jour **stricte** sauf secret test (voir ci‑dessous). Pour la prod stricte sur Railway : **`SCAN_TICKET_ALLOW_ANY_DAY=false`**.
- **Phase de test (app)** : le bandeau *Test : scan hors jour événement* est **affiché par défaut** sur **ScanTicketPage** (seuls orga/staff y accèdent). L’interrupteur n’est **activable** que si **`EXPO_PUBLIC_SCAN_TICKET_TEST_SECRET`** (≥ 8 car.) est défini **au build** et **`SCAN_TICKET_TEST_SECRET`** côté API vaut la même chaîne. Pour **masquer** tout le bandeau en prod finale : **`EXPO_PUBLIC_HIDE_SCAN_TEST_UI=true`**.
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
