# Changelog

Toutes les modifications notables du projet sont documentées par semaine.

---

## Semaine du 10-13 mars 2026 (mar. - ven.)

### Ajouté
- **Refus / annulation avec raisons** : Menu déroulant de raisons (indisponible, tarif non adapté, déjà engagé, lieu non adapté, genre non adapté, autre) pour DJ et Lieu lors d’un refus ou d’une annulation
- **Annulation après acceptation** : DJ et Lieu peuvent annuler un booking déjà accepté (statut CANCELLED), avec sélection de raison
- **Remplacement après annulation** : L’organisateur peut remplacer un DJ ou un lieu annulé/refusé — bouton « Remplacer le lieu » quand le lieu a annulé, bouton « + Ajouter / Remplacer un DJ » pour les slots libérés
  - Backend : endpoint `POST /api/booker/events/:eventId/venues`, `getBookerEvents` retourne `venueNeedsReplacement` et `djIds` (actifs uniquement)
- **Ajout de DJ à tout moment** : Le bouton « + Ajouter / Remplacer un DJ » est visible pour tous les événements (même sans DJ), permettant d’ajouter des DJ après la création de l’événement
- **Noms cliquables sur la page détail événement** : Clic sur le nom du DJ → profil DJ ; organisateur → profil organisateur ; lieu → profil lieu
  - Backend : `GET /api/events/:eventId` retourne `djs` (tableau `{ userId, djId, artistName }`), `booker: { id, name }`, `venue: { id, venueName }`
- **Publication sur le feed** : Choix explicite de publier un événement sur le feed — possible uniquement après validation de tous les contrats (DJ et lieu)
  - Backend : champ `publishedOnFeed` sur Event, endpoint `POST /api/booker/events/:eventId/publish-to-feed`, feed filtré sur `publishedOnFeed=true`
  - Mobile : bouton « Publier sur le feed » dans BookerDashboard (affiché quand tous contrats signés), badge « Publié sur le feed »
- **Contrat + chat Organisateur ↔ Lieu** : Même système que DJ ↔ Organisateur (EventVenue, négociation contrat, chat privé, notifications)
  - Backend : routes chat/contrat EventVenue, unread-count et mark-all-read incluant les messages lieu
  - Mobile : BookerDashboard (bouton chat lieu sur chaque événement), VenueDashboard (onglet Réservations + modal chat/contrat)
  - Notifications : navigation vers le chat lieu depuis les notifications push (openChatEventVenueId)

### Modifié
- **Rate limiting** : Passage de 100 à 500 requêtes / 15 min par IP pour éviter le blocage du Feed

### Corrigé
- **Modalités paiement (DJ)** : Contre-proposition — sélection des modalités en section déroulante inline (évite les modals imbriqués qui bloquaient les touches)
- **Sélection lieu (création event)** : Retour correct vers le formulaire de création (bookerEventDashboard) au lieu du dashboard principal ; reste sur l’étape Lieu pour afficher la sélection

---

## Semaine du 3-6 mars 2026 (mar. - ven.)

### Ajouté
- **Version web** : Client React avec WelcomePage, auth, feed, événements, profil, tickets
- **Blocage mineurs** : Date de naissance + case "Je certifie avoir 18 ans" à l'inscription
- **Préparation sortie** : Pages légales (CGU, CGV, mentions, confidentialité), case CGU obligatoire à l'inscription
- **RGPD** : Export des données et suppression de compte dans ProfilePage
- **Sécurité backend** : Helmet, CORS, rate limiting

### Modifié
- **Booker → Organisateur** : Remplacement de "Booker" par "Organisateur" dans toute l'interface (labels, titres, descriptions)
- **Drawer** : Un seul bouton "Connexion" (inscription via onglet sur la page login)
- **LoginPage** : Suppression du bouton "Créer un compte" (amenait à AccountType avant compte, redondant avec onglet Inscription)
- **Notifications contrat** : Message dans le chat quand une offre est proposée, une contre-proposition envoyée ou un contrat accepté/signé (déclenche la notification push existante)

### Modifié
- **Contrats** : Le statut de paiement passe à « Paiement en attente » (PENDING) après validation du prix (contrat signé)
- **Accompte** : Passage en pourcentage (%) au lieu d'un montant fixe en €
- **Modalités de paiement** : Menu déroulant avec les options — jour booking, j-1 prestation, j+1 prestation, j+15, j+30
- **Page négociation (iPhone)** : Contenu scrollable pour éviter que le clavier masque les champs (KeyboardAvoidingView + ScrollView)

### Corrigé
- **validation.js** : Suppression du bloc d'export dupliqué (SyntaxError)

---

## Semaine du 24-27 février 2026 (mar. - ven.)

### Ajouté
- **Système d'amis (Communauté)** : API + page "Mes amis" avec recherche par pseudo, onglets Amis/Demandes
- **Mes Profils** : Hub central pour gérer tous les profils (Communauté, DJ, Organisateur, Lieu)
- **Profil Communauté** : Édition avec photo, bannière, pseudo et genres (chips)
- **Profil Lieu (Venue)** : profileImage, bannerImage, API, page VenueProfileEditPage
- **Groupes d'événements** : Créer groupe, inviter amis, accepter/refuser invitations
- **Mailer** : Support Resend (3000/mois gratuit) + SMTP
- **Vérification email** : Envoi code, confirmation, mot de passe oublié
- **Bouton Feed** : Accès rapide au feed depuis le menu drawer

### Modifié
- **Drawer** : "Mon Profil" → "Mes Profils", ajout "Mes amis" (profil Communauté)
- **ProfilePage** : Hub avec boutons "Modifier" par type de profil
- **getUserProfiles** : Ajout profileImage pour DJ et Venue

### Corrigé
- **CommunityProfileEditPage** : Layout (avatar écrasé, overlap bannière)
- **Inscription Gmail** : Logs, sanitization email, affichage erreurs
- **Login/inscription** : Colonne username manquante, script ensure-user-username
- **Feed Prisma** : select+include incompatibles sur relation dj
- **Photos profil DJ** : Sync UserDj + fallback DjMedia
- **Anti-spam vérif email** : Bypass si code expiré, délai 30s
- **Feed loading loop** : Correction boucle infinie
- **Recherche amis** : Debounce, feedback, section "Ajouter un ami"
- **Toast** : Remplace Alert à l'inscription

---

## Semaine du 18-21 février 2026 (mar. - ven.)

### Ajouté
- **Abonnements** : Suivre / ne plus suivre un profil DJ ou Organisateur
- **Feed Abonnements** : Onglets "Pour tous" | "Abonnements" (style X)
- **Profils Organisateur publics** : Page publique avec bouton Suivre

### Modifié
- **Toast** : Remplace Alert.alert pour les messages simples

### Corrigé
- **Navigation** : Lien vers profil DJ/Organisateur depuis le feed
- **Feed following** : Parenthèse en trop dans la requête

---

## Comment maintenir ce fichier

À chaque fin de semaine (ou quand tu fais un push important), ajoute une entrée sous **Semaine du [mardi] - [vendredi]** (mar. - ven.) :

- **Ajouté** : Nouvelles fonctionnalités
- **Modifié** : Changements dans des fonctionnalités existantes
- **Corrigé** : Corrections de bugs

Si aucune section pour la semaine en cours n'existe, crée-la en haut du fichier.
