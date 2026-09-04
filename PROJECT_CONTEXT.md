# Contexte projet — NOX / NOX

Document de référence **pour humains et assistants IA** si l’historique de discussion est perdu. À mettre à jour quand l’architecture ou les règles métier changent notablement.

---

## 1. Qu’est-ce que c’est ?

Plateforme **événementielle** qui met en relation **organisateurs (bookers)**, **DJs**, **lieux** et le public (**profils Community**). Le branding produit côté mobile inclut **NOX** (logo, tutoriel, contrats). Les utilisateurs ont un compte `User` et peuvent posséder plusieurs **types de profil** (Community, DJ, Booker, Lieu) selon les parcours d’inscription.

Objectifs typiques : création d’événements, invitations DJ/lieu, **chat privé** par booking, **contrats** (organisateur ↔ DJ et organisateur ↔ lieu) avec **PDF** et emails, **billetterie** (Stripe), **feed** social, **notations** post-événement, **staff / scan** de billets.

---

## 2. Structure du dépôt

| Dossier | Rôle |
|---------|------|
| **`server/`** | API principale **Node.js + Express**, **Prisma** (PostgreSQL), JWT, uploads (local ou R2), **PDF** (`pdfkit`), emails (**nodemailer** / **Resend**), **Stripe**. Point d’entrée : `server/index.js` (fichier très volumineux, ~9k+ lignes — beaucoup de routes inline). |
| **`server/prisma/`** | Schéma `schema.prisma`, migrations SQL. |
| **`nox-mobile/`** | App **Expo / React Native** (~SDK 54), navigation custom via `NavigationContext`, appels API dans `api/config.js`. **EAS** : `eas.json` (profiles `development`, `preview` APK, `production` AAB). |
| **`client/`** | Ancienne ou complémentaire **SPA React** (voir `package.json` racine : scripts `client:dev` / `build`). |
| **`package.json` (racine)** | Scripts de convenance (`dev` concurrent server+client, `start` → `node server/index.js`). Dépendances racine peuvent inclure **Telegraf** (héritage « Telegram » — à vérifier si encore utilisé). |
| **`docs/`** | Documentation / modèles éventuels (ex. maquettes PDF contrats). |
| **`CHANGELOG.md`** | Journal des changements récents (par semaine). |

---

## 3. Stack technique

- **Backend** : Express, `cors`, `helmet`, `express-rate-limit`, `bcryptjs`, `jsonwebtoken`, Multer, Prisma, `stripe`, `@aws-sdk/client-s3` (médias), `pdfkit`, `nodemailer`, `resend`, `qrcode`.
- **Base** : **PostgreSQL** (`DATABASE_URL`).
- **Mobile** : Expo 54, React 19 / RN 0.81, `@react-navigation/*`, **Stripe React Native**, axios, expo modules (image picker, document picker, camera, secure store, updates, etc.).

---

## 4. Modèle de données (aperçu Prisma)

- **`User`** : auth (email, password, username, `role`, vérification email, reset mot de passe, `activeProfileType`, statut ban/suspend).
- **Profils** : `UserCommunity`, `UserDj`, `UserBooker`, `UserVenue` — champs **légaux** (raison sociale, adresse, SIRET, représentant, etc.) pour les **contrats / PDF**; règles métier d’édition (ex. champs légaux parfois verrouillés après complétion — voir implémentation API).
- **`Event`** : titre, `date`, `time`, **`durationHours`** (durée soirée, pour créneaux fin de contrat), `location`, prix / capacité, genre, image, statut, `publishedOnFeed`, liaisons `venueId`, `bookerId`.
- **`EventDj`** : invitation DJ (`PENDING|ACCEPTED|…`), paiement booking (`paymentStatus`, montant, facture), **contrat** (`contractStatus` DRAFT/SENT/SIGNED, `contractPayload` JSON, hash, timestamps d’acceptation booker/DJ, `contractSentBy`).
- **`EventVenue`** : même idée pour le **lieu** (invitation, contrat, paiement).
- **`Message`** : chat **privé** lié à `eventDjId` ou `eventVenueId`, ou **groupe** `eventId` + `type`.
- **Billetterie** : `Ticket`, `Payment`, webhooks Stripe.
- **Social / feed** : `FeedPost`, likes, commentaires, notifications feed.
- **Autres** : `EventGroup` / membres, `EventStaff` (scan), `DjRating`, `VenueRating`, `Report`, logs admin, suivis `FollowDj` / `FollowBooker`, amitiés booker↔community, etc.

Enums importants : `InvitationStatus`, `BookingContractStatus`, `BookingPaymentStatus`, `EventStatus`, rôles `UserRole` (dont ADMIN).

---

## 5. API backend (zones fonctionnelles)

Toutes sous **`/api/...`** sauf mention contraire. Auth : header **`Authorization: Bearer <JWT>`** (`authenticateToken`).

**Auth / profils**  
- Login/register, création / mise à jour profils Community, DJ, Booker, Venue.  
- `GET` agrégation profils (`/api/user/profiles` ou équivalent — chercher dans `index.js`).  
- Booker : `PUT /api/booker/profile`, événements CRUD, amis, staff.

**Événements & discovery**  
- Liste / détail événements publics ou filtrés, groupes d’événement, création côté booker (`POST /api/booker/events` avec `durationHours` persisté), `PUT` partiel, publish feed, upload image.

**Bookings & invitations**  
- DJ : liste bookings, accept / reject / cancel invitation.  
- Lieu : idem sur `eventVenueId`.  
- Annulation booking après acceptation (DJ / lieu).

**Chat**  
- Messages privés DJ (`/api/chat/:eventDjId/messages`) et lieu (`/api/chat/event-venue/:eventVenueId/messages`), groupe par `eventId`, marquer lu, unread count, conversations.

**Contrats (MVP riche)**  
- **DJ** : `GET/PUT` brouillon, send, counter, accept — sous `/api/contracts/event-djs/:eventDjId/...`.  
- **Lieu** : `/api/contracts/event-venues/:eventVenueId/...`.  
- Réponses incluent **`booking`** (titre, dates, `eventTime`, **`durationHours`**, lieu…) et pour le contrat DJ **`venueContractGate`** : le contrat DJ ne peut passer **SIGNED** que si le **lieu** de l’événement a **invitation acceptée** et **contrat lieu SIGNED** (voir `getVenueContractGateForIjEvent` / `assertVenueContractBeforeDjSign` dans `server/index.js`).

**PDF & email**  
- `server/utils/contractPdf.js` : génération PDF prestation DJ et organisateur/lieu (aligné modèles NOX). **Commission NOX** : **10 %** du montant principal / cachet **calculée automatiquement** (plus de saisie `noxFee` côté app).  
- `server/utils/contractEmail.js` : envoi avec pièces jointes (contrats signés).

**Paiements & billets**  
- Stripe : intents, confirmation achat, webhooks, tickets, QR, scan staff.

**Feed & admin**  
- Posts feed, modération admin, signalements, bootstrap / seed démo (routes admin protégées `requireAdmin`).

Une exploration rapide des routes : `grep "^app\\.\\(get\\|post\\|put\\|delete\\)(" server/index.js`.

---

## 6. Application mobile (Expo)

- **Navigation** : `NavigationContext` + table `SCREENS` dans `App.js` (pattern « page courante » + Drawer + radial NX).
- **Contextes** : `AuthContext`, `LanguageContext` (FR/EN), `EventFormContext`, `ConfirmContext`.
- **Parcours NOX par profil** :
  - **COMMUNITY** : `communityHome`, `communityDiscover`, `communityEventDetail`
  - **VENUE** : `lieuxDashboard`, `lieuxEvents`, `lieuxBookingChat` (+ contrat intégré)
  - **DJ / BOOKER / PRESTATAIRE** : `proHome` + dashboards métier (`djDashboard`, `bookerDashboard`, …)
- **Phase D (août 2026)** : écrans legacy supprimés (`HomePage`, `FeedPage`, `WelcomePage`, `VenueDashboardPage`) ; alias de route résolus dans `utils/legacyScreenRedirects.js`.
- **Dashboards métier** :
  - **`BookerDashboardPage`** : profil / événements / chats (DJ + lieu) / contrats
  - **`BookerEventDashboardPage`** : wizard création événement
  - **`DjDashboardPage`** : profil, médias, bookings, chat + contrat
  - **Lieu** : plus de `VenueDashboardPage` — UI dans `screens/lieux/*`, logique partagée via `useVenueDashboard`, `useVenueBookingContract`, composants `venueDashboard/*`
- **Contrats** : composants `ContractDraftEditorFields`, `DealTypePickerModal`, `CancellationPolicyPickerModal`, `EventEndTimePickerModal`; constantes partagées **`constants/contractPayload.js`** (types d’accord lieu, **grille d’annulation** prédéfinie, helpers fin de prestation basés sur **`eventTime` + `durationHours`**).
- **API client** : `nox-mobile/api/config.js` — base URL via env Expo, méthodes `getBookingContract`, `getVenueContract`, etc.

---

## 7. Règles métier contrats (résumé)

- **Statut affiché** côté mobile : **« Accepté »** plutôt que « signé » pour l’utilisateur ; case à cocher d’engagement avant acceptation.  
- **Annulation** : valeurs prédéfinies (`CANCELLATION_POLICY_OPTIONS`), pas de texte libre par défaut.  
- **Fin de prestation** : si l’événement a **heure début + `durationHours`**, liste de créneaux **toutes les 30 min** jusqu’à fin de soirée ; sinon **saisie libre** `HH:MM`.  
- **Priorité lieu → DJ** : finalisation contrat DJ bloquée tant que le volet lieu n’est pas au bon statut (voir gate API).

---

## 8. Déploiement & environnement

- **Serveur** : Node, variables d’environnement (`DATABASE_URL`, JWT secret, Stripe, SMTP ou Resend, `PUBLIC_URL`, stockage `MEDIA_STORAGE` local vs R2, etc.).  
- **Prisma** : `npx prisma migrate deploy` en prod après nouvelles migrations ; `prisma generate` après changement de schéma.  
- **Mobile** : `eas build` (profils dans `eas.json`), canal **expo-updates** possible pour les OTA.  
- Branche de travail : **`railway-phase1`**. Dépôt GitHub : `rapappapapappapa/insane-nights-days-telegram-app`.

---

## 9. Fichiers « pivots » pour comprendre vite

| Sujet | Fichiers |
|--------|----------|
| Schéma DB | `server/prisma/schema.prisma` |
| Routes & logique métier | `server/index.js` |
| PDF contrats | `server/utils/contractPdf.js` |
| Emails contrats | `server/utils/contractEmail.js` |
| Payload contrat mobile | `nox-mobile/constants/contractPayload.js` |
| Liste écrans mobile | `nox-mobile/App.js` |
| Appels HTTP mobile | `nox-mobile/api/config.js` |

---

## 10. Évolutions / dettes à connaître

- `server/index.js` est **monolithique** — refactoring possible en modules (`routes/`, `controllers/`).  
- Racine `package.json` et `server/package.json` peuvent diverger (scripts « telegram », dépendances).  
- **`client/`** peut être legacy par rapport au focus **Expo** ; vérifier ce qui est encore déployé.  
- Dossiers non versionnés typiques : `client/build/`, fichiers locaux de config email, gros PDF dans `docs/contract-templates/` selon `.gitignore`.

---

*Dernière mise à jour : 11 août 2026 — Phase D mobile terminée, Phase E (polish pro) en cours.*
