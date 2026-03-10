# Changelog

Toutes les modifications notables du projet sont documentées par semaine.

---

## Semaine du 10-13 mars 2026 (mar. - ven.)

### Ajouté
- **Contrat + chat Organisateur ↔ Lieu** : Même système que DJ ↔ Organisateur (EventVenue, négociation contrat, chat privé, notifications)
  - Backend : routes chat/contrat EventVenue, unread-count et mark-all-read incluant les messages lieu
  - Mobile : BookerDashboard (bouton chat lieu sur chaque événement), VenueDashboard (onglet Réservations + modal chat/contrat)
  - Notifications : navigation vers le chat lieu depuis les notifications push (openChatEventVenueId)

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
