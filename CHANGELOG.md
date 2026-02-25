# Changelog

Toutes les modifications notables du projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [Non publié]

### Ajouté
- **Système d'amis (Communauté)** : API (liste amis, demandes reçues, envoi, accept/refuse, retrait) + page "Mes amis" avec recherche par pseudo, onglets Amis/Demandes
- **Mes Profils** : Hub central pour gérer tous les profils (Communauté, DJ, Booker, Lieu) depuis une seule page
- **Profil Communauté** : Page d'édition avec photo, bannière, pseudo et genres (chips)
- **API profil Communauté** : Endpoints `GET/PUT /api/user/community/profile` et upload photo/bannière
- **Bouton Feed** : Accès rapide au feed depuis le menu drawer
- **Avatar dynamique** : La page "Mes Profils" affiche la photo du profil actif (ou l'initiale si pas de photo)
- **Profil Lieu (Venue)** : `profileImage` et `bannerImage`, API get/update/upload, page VenueProfileEditPage

### Modifié
- **Drawer** : "Mon Profil" renommé en "Mes Profils" ; suppression de "Mon profil Booker" et "Changer de profil" ; ajout "Mes amis" (visible en profil Communauté)
- **ProfilePage** : Transformée en hub avec boutons "Modifier" pour chaque type de profil
- **CommunityProfileEditPage** : Correction du layout (avatar écrasé, overlap bannière)
- **getUserProfiles** : Ajout de `profileImage` pour les profils DJ et Venue dans la réponse API
- **ProfilePage** : Bouton "Modifier" DJ → djDashboard avec `openSection: 'profil'` ; Lieu → venueProfileEdit
- **CommunityProfileEditPage** : Bouton "Mes amis" vers CommunityFriendsPage

### Corrigé
- **Mailer** : Support Resend (gratuit 3000/mois) en plus de SMTP ; vérification email et mot de passe oublié fonctionnent ; `/api/health` indique si l'email est configuré

### Technique
- **Mailer** : `RESEND_API_KEY` + `RESEND_FROM` (prioritaire) ou SMTP_* ; logging des erreurs ; `emailConfigured` et `emailProvider` dans `/api/health`
- **API amis** : `GET/POST/PUT/DELETE /api/user/community/friends*`, `GET /api/user/community/search?q=`
- **Pseudo Communauté unique** : Contrainte unique sur `UserCommunity.pseudo` (recherche d'amis) ; distinct du `artistName` DJ
- **Schema Prisma** : Modèle `UserCommunity` avec `pseudo`, `profileImage`, `bannerImage`, `genres` ; modèle `CommunityFriend` (PENDING, ACCEPTED, BLOCKED) ; `UserVenue` avec `profileImage`, `bannerImage`
- **Styles ProfilePage** : `noProfilesBox`, `createProfileBtn`, `createProfileBtnText`

---

## Comment maintenir ce fichier

À chaque modification significative, ajouter une entrée sous la section appropriée :
- **Ajouté** : Nouvelles fonctionnalités
- **Modifié** : Changements dans des fonctionnalités existantes
- **Corrigé** : Corrections de bugs
- **Technique** : Détails techniques (migrations, config, etc.)

Pour une nouvelle version publiée, créer une section `## [X.Y.Z] - YYYY-MM-DD` et déplacer le contenu de `[Non publié]` vers cette section.
