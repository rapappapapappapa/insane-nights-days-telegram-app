# Changelog

Toutes les modifications notables du projet sont documentées par semaine.

---

## Semaine du 19 au 22 mai 2026 (mar. – ven.)

### Ajouté (serveur + mobile — profil Prestataire, MVP)
- **Modèle Prisma `UserPrestataire`** (nom commercial, type de prestation, téléphone pro, champs optionnels ville / pays / bio / visuels) ; **un seul profil prestataire par utilisateur** (`@@unique([userId])`).
- **API** : **`POST /api/profile/prestataire`** (création), **`PUT /api/prestataire/profile`** (mise à jour) ; **`GET /api/user/profiles`** et **`POST /api/user/switch-profile`** prennent en charge le type **`PRESTATAIRE`**.
- **Signalement** : valeur d’énumération **`PRESTATAIRE_PROFILE`** pour les cibles de signalement.
- **Mobile** : écran d’inscription **`RegisterPrestatairePage`**, entrée **Prestataire** sur **choix du type de compte**, **`PrestataireDashboardPage`** (placeholder « à venir »), section **Profil** + menu latéral (libellé + accès tableau de bord), méthodes **`api.createPrestataireProfile`** / **`api.updatePrestataireProfile`**.

---

## Semaine du 13 au 15 mai 2026 (mer. – ven.)

### Modifié (mobile — dashboard DJ, médias)
- **Onglet Médias** : suppression de la section **AUDIO (MP3)** (upload / lecteur intégré) ; message invitant à renseigner **Spotify / SoundCloud** dans **Profil artiste** — pas de fichiers audio hébergés sur la plateforme (droits d’auteur).

### Ajouté / modifié (mobile — Spotify / SoundCloud, lecteur intégré)
- **`BuiltInStreamPlayerModal`** + **`react-native-webview`** : lecture **dans l’app** via embed Spotify officiel et widget SoundCloud, à partir des URLs stockées en profil ; ouverture dans **Spotify / SoundCloud / navigateur** reste **optionnelle** (bouton secondaire sur la fiche DJ publique).
- **Sans module audio natif supplémentaire** : déployable en **OTA** ; utilitaires **`utils/streamingEmbedUrl.js`** (`spotifyOpenUrlToEmbedUrl`, `soundcloudUrlToWidgetUrl`, **`resolveStreamingEmbed`**).
- **Fiche DJ publique** (écran **`DjProfilePage`**) : libellé principal **« Écouter dans l’app (lecteur intégré) »** ; court texte d’intro sous la section **Musique** ; si l’URL ne peut pas être convertie en embed → **alerte** avec choix (plus de **redirection silencieuse** vers le navigateur).
- **URLs Spotify** reconnues pour l’embed : pistes, albums, playlists, **artistes**, **shows / podcasts**, URI `spotify:…`, certains liens **www.spotify.com**.
- **Modal** : hauteur augmentée (~54 % de l’écran, max 560 px) ; **WebView** : **`originWhitelist`**, **`mixedContentMode`** (Android).
- **Dashboard DJ → Profil artiste** : rappel sur la lecture intégrée + boutons **« Tester la lecture intégrée (SoundCloud / Spotify) »** sous les champs correspondants (prévisualisation du même lecteur que sur la fiche publique).

### Ajouté (mobile — agenda système)
- **`expo-calendar`** : permission + plugin EAS ; **`buildNumber` iOS 7** ; export **Android** (lecture/écriture calendrier).
- **Fiche événement** & **Mes tickets** : bouton **« Ajouter à mon agenda »** — crée un événement dans le calendrier par défaut (synchro Google / iCloud selon le compte du téléphone). Fin d’événement via **`durationHours`** (sinon défaut **4 h**).

### Ajouté (API — événements / tickets)
- **`GET /api/events/:id`** : champ **`durationHours`** pour le client agenda.
- **`GET /api/user/me/tickets`** et **`GET /api/user/:userId/tickets`** : **`eventDurationHours`**.

### Ajouté (auth — connexion Apple)
- **Prisma / User** : **`appleId`** optionnel unique + migration **`20260513140000_user_apple_oauth`** (à déployer : `prisma migrate deploy`).
- **Serveur** : **`POST /api/auth/apple`** (corps **`identityToken`**) ; vérification JWKS **`appleid.apple.com`** ; **`jwks-rsa`** ; audience **`APPLE_IOS_BUNDLE_ID`** (sinon défaut **`com.insanenightsdays.mobile`**).
- **Mobile (iOS)** : **`expo-apple-authentication`** ; **`AppleSignInSection`** sur l’écran connexion/inscription ; **`ios.usesAppleSignIn`**, **`buildNumber` 6** ; pas de bouton Apple sur Android (comportement natif Expo).

### Modifié (auth)
- Message erreur connexion mot de passe : compte **Google / Apple** sans MDP.

### Ajouté (auth — connexion Google)
- **Serveur** : **`POST /api/auth/google`** (corps **`idToken`**) ; vérification du jeton avec **`google-auth-library`** ; champs **`User.googleId`**, **`User.password`** optionnel (migration **`20260507140000_user_google_oauth`**) ; compte email existant : **liaison** `googleId` si absent ; inscription Google : même règles **âge / CGU** que **`/register`** ; connexion mot de passe refusée si **`password`** absent (pointer vers Google).
- **Mobile** : **`expo-auth-session`** / **`GoogleSignInSection`** ; boutons **Continuer avec Google** / **S'inscrire avec Google** si les **`EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`** sont définis ; schéma d’URL **`com.insanenightsdays.mobile`** dans **`app.json`**.

### Modifié (outillage dépôt)
- **`.gitignore`** : **`scripts/local-time.js`** — script perso **`node scripts/local-time.js`** pour afficher l’heure système ; modèle versionné **`scripts/local-time.example.js`** (`cp scripts/local-time.example.js scripts/local-time.js`).

### Documentation
- **`docs/AMELIORATIONS.md`** — **Phase 1 = rebuild en premier** (cycles store les plus longs ; regroupement dans un même binaire), puis phases **OTA** ; backlog inchangé (billetterie, wizard, prestataire *à trancher*, etc.).

---

## Semaine du 5 au 7 mai 2026 (mar. – jeu., après férié du 1er mai)

### Corrigé (serveur — contrats, même compte organisateur + lieu)
- **Accept / contre-proposition** (**`/api/contracts/event-venues/...`** et **EventDj** en miroir) : le rôle n’est plus **`isBooker ? BOOKER : …`** (qui forçait toujours BOOKER si les deux profils partagent le même `userId`). On déduit la partie qui doit répondre depuis **`contractSentBy`** (celui qui n’a pas envoyé la dernière version) — l’acceptation **lieu** après envoi **organisateur** fonctionne à nouveau.
- **Symptôme corrigé** : en dashboard **lieu**, après avoir coché la case, **Accepter** déclenchait une erreur (toast **« Erreur contrat »** / HTTP 400 côté API car le serveur pensait que le booker « acceptait » sa propre proposition).

### Corrigé (serveur — diagnostic « tout vide » sans log métier)
- **Contexte** : feed et messages qui ne se chargent plus alors que les logs Railway ne montraient pas d’erreur SQL évidente — pistes **429** (rate limit) et **réseau** côté app.
- **`GET /api/health`** : réponse enrichie avec **`db: true|false`** (ping Prisma) ; si **`db: false`**, PostgreSQL / `DATABASE_URL` est en cause.
- **Rate limiting** : défaut **2000** req / 15 min / IP (au lieu de 500) pour réduire les **429** qui vident le feed / les messages sans erreur SQL ; log **`[rateLimit] 429`** ; variable **`RATE_LIMIT_MAX`** documentée dans **`env.example.txt`**.

### Modifié (client mobile — requêtes API)
- Échec réseau **`Network request failed`** : log **`logger.error`** avec **`endpoint`** et **`url`** (plus visible que le simple warn).

### Modifié (outillage EAS)
- **`eas.json`** : contrainte **`cli.version`** portée à **`>=18.11.0`** (alignement avec la CLI recommandée par Expo).
- **`package.json`** : **`eas-cli`** en **`^18.11.0`** (devDependency) — **`npx eas-cli build`** utilise la même génération que le message « upgrade available » ; le bandeau « Proceeding with outdated version » disparaît après `npm install` dans **`insane-nights-days-mobile`**.

### Ajouté (client + serveur — notifications push chat, MVP)
- **Serveur** : modèle Prisma **`PushDevice`** (token Expo par utilisateur) ; migration **`20260506120000_add_push_device`** ; utilitaires **`server/utils/expoPush.js`** / **`server/utils/chatPush.js`** ; routes **`POST /api/push/register`**, **`POST /api/push/unregister`** ; envoi push après **`POST`** message **DJ/booker**, **lieu**, **groupe** (`registerChatRoutes`).
- **Mobile** : **`expo-notifications`** + **`expo-device`** ; plugin dans **`app.json`** ; hook **`useExpoPushRegistration`** (permission, canal Android, enregistrement token) ; **`App.js`** : ouverture du bon dashboard + chat au **tap** sur la notification (y compris cold start via **`getLastNotificationResponseAsync`**) ; **`AuthContext`** : **`unregister`** à la déconnexion ; API **`registerExpoPushToken`** / **`unregisterExpoPushToken`**.

**Déploiement** : appliquer la migration DB (`prisma migrate deploy` sur Railway) ; **rebuild natif** (EAS) — les push ne passent pas par un simple **OTA** seul à cause du module natif.

### Modifié (client mobile — chat, quasi temps réel)
- **Booker / DJ / Lieu** : pendant que le **modal de chat** est ouvert, **rafraîchissement silencieux** des messages (~2,8 s, `useChatPoll`) — le **destinataire** voit les nouveaux messages **sans fermer la conversation** ; pas de spinner ni toast en boucle ; **scroll** vers le bas seulement si la liste a changé (évite de tirer l’utilisateur quand il remonte l’historique sans nouveau message).

### Modifié (client mobile — scan & staff, retour visuel)
- **`ScanTicketPage`** : après lecture d’un QR, **plein écran assombri** + **carte résultat** plus lisible (icône plus grande, texte multiligne) avec **animation spring** ; **viseur** en **quatre coins** façon lecteur pro (plus de rectangle plein).
- **`StaffEventsPage`** : **état vide** enrichi (icône QR, titre, texte d’aide) au lieu d’une seule ligne.

---

## Semaine du 28 au 30 avril 2026 (mar. – jeu.)

### Modifié (client mobile — Android, aperçu PDF contrat)
- **PDF.js hors ligne** : plus de chargement depuis jsDelivr dans **`ContractPdfPreviewModal`** — bundles **`pdfjs-dist`** embarqués dans **`assets/pdfjs/`** (extensions **`.pdfjs`**), **`metro.config.js`** (`assetExts`), script **`scripts/copy-pdfjs-assets.js`** exécuté en **`postinstall`** ; copie unique vers le cache Expo puis **`file://`** pour le worker et le rendu canvas (texte d’aide **`pdfOfflineHint`** aligné sur l’embarqué).

### Modifié (client mobile — wizard « Créer un événement » booker)
- **`BookerEventDashboardPage`** : brouillon AsyncStorage **rechargé sans alerte** (plus de dialogue *Brouillon / Reprendre / Effacer / Plus tard*) ; lien **« Nouvel événement — effacer le brouillon »** sous l’aide d’étapes → reset du formulaire, suppression de la clé locale, toast de confirmation (FR/EN) ; après **`createEvent`** réussi, le brouillon est **systématiquement** effacé du stockage (comportement explicite dans le code).
- **Sélection DJ / lieu dans le wizard** : correction d’une **course critique** au retour depuis le profil — **`applyEventDraft`** ne s’exécute plus si **`routeParams`** indiquent un retour sélection (**`isReturnFromVenueOrDjPicker`**) ; l’init des **créneaux** à l’étape 3 ignore ce retour pour ne pas écraser le **`useLayoutEffect`** ; **`hasInitializedSlots`** est posé après application DJ depuis les **`routeParams`** (évite la perte du DJ choisi).

### Corrigé (serveur — billets / Stripe)
- **`registerTicketsAndPayments`** : injection de **`stripePublishableKey`** depuis **`index.js`** dans **`deps`** (variable utilisée pour **`POST /api/payments/create-ticket-intent`** mais absente du module → **`ReferenceError`** et **500** « Erreur serveur » à l’achat).

### Ajouté (scan billets — mode test « any day »)
- **Serveur** : **`POST /api/events/:eventId/scan-ticket`** — si **`SCAN_TICKET_TEST_SECRET`** (≥ 8 car.) est défini et le body contient **`scanTestSecret`** identique, la contrainte **jour de l’événement** est contournée (en complément de **`SCAN_TICKET_ALLOW_ANY_DAY`** / **`ONGOING`** / même jour UTC). Documenté dans **`server/env.example.txt`**.
- **Serveur (Railway)** : si **`SCAN_TICKET_ALLOW_ANY_DAY`** est **absent**, le scan hors jour est **autorisé** lorsque l’API tourne sur Railway (détection **`RAILWAY_PUBLIC_DOMAIN`** / **`RAILWAY_ENVIRONMENT`** / **`RAILWAY_SERVICE_NAME`**) ; en **local** sans ces variables, comportement **strict** (sauf secret test / **`ONGOING`** / même jour UTC). **`SCAN_TICKET_ALLOW_ANY_DAY=false`** dans les variables Railway restaure la contrainte jour.
- **Mobile** : **`ScanTicketPage`** — interrupteur *« Test : scan hors jour événement »* (bandeau visible sauf **`EXPO_PUBLIC_HIDE_SCAN_TEST_UI`** ; switch actif si **`EXPO_PUBLIC_SCAN_TICKET_TEST_SECRET`** ≥ 8 car. aligné serveur) ; envoi du secret via **`api.scanTicket`** ; persistance AsyncStorage ; correction constante **`BOOKER_EVENTS_REFRESH_FLAG`** pour le refresh dashboard. **`docs/FEATURE_STAFF_QR.md`** mis à jour.

### Corrigé (client mobile — scan billets)
- **`ScanTicketPage`** : ouverture de l’écran → **ErrorBoundary** (*« Oups »*) causée par des identifiants manquants (**`shouldShowScanTestToggle`**, **`SCAN_TEST_SECRET`**, **`SCAN_ANY_DAY_TEST_STORAGE`**, **`BOOKER_EVENTS_REFRESH_FLAG`**) — déclarations rétablies en tête de fichier.
- **Bandeau « test scan hors jour »** : invisible sur **build prod / OTA** car **`__DEV__`** était faux et aucune variable Expo n’était posée — le bandeau est **affiché par défaut** sur l’écran scan (interrupteur actif seulement si secret Expo + serveur alignés) ; masquage opt-in via **`EXPO_PUBLIC_HIDE_SCAN_TEST_UI=true`**.

### Corrigé (serveur — prévisualisation PDF contrats / chat)
- **`server/utils/contractPreview.js`** : **`normalizeContractPayload`** (JSON sain, pas de tableau racine ni structure exotique) ; résolution du profil DJ par **`userId: ed.djId`** avec repli sur **`UserDj.id`** si besoin ; e-mail DJ via **`djProfile.userId`** ; objets **`eventDjPreview`** / **`eventVenuePreview`** limités aux champs utiles au PDF (suppression du spread du row Prisma complet qui pouvait provoquer *« Erreur génération PDF »*).
- **`server/routes/registerBookerOrganizerRoutes.js`** : **`require('../utils/contractPreview')`** et **`require('../utils/contractEmail')`** (chemins corrects depuis **`routes/`** ; **`./utils/...`** provoquait **`MODULE_NOT_FOUND`**, **500** sur **`POST …/preview-pdf`** et e-mails contrat signé). Logs **`preview-pdf`** (DJ & lieu) avec **`message`** et **stack** pour diagnostic Railway.

### Modifié (config build)
- **`insane-nights-days-mobile/app.json`** : **`ios.buildNumber`** porté à **4**.

---

## Semaine du 21 au 24 avril 2026 (mar. - ven.)

### Corrigé (client mobile — stabilité & feed)
- **Crash au lancement** (« Oups ! Une erreur est survenue » / ErrorBoundary) : **`WelcomePage`** et **`FeedPage`** utilisaient encore **`useFocusEffect`** sans import valide et sans **`NavigationContainer`** (navigation custom). Bloc retiré ; **cache-bust** des avatars sur **pull-to-refresh** (`fetchFeed(true)`) ; **`HomePage`** alignée.
- **Changement de profil** : **`api/methods/coreAuth.js`** — ajout des imports **`logger`** et **`apiCache`** utilisés dans **`switchProfile`** (invalidation cache après succès), supprimant l’erreur du type *property 'logger' doesn't exist*.
- **Création de post avec image** : **`CreateFeedPostPage`** — import **`Toast`** en **export default** (plus de **`{ Toast }`**) ; correction de l’erreur *Element type is invalid… undefined* à l’affichage du toast.
- **Upload image feed** : **`api/methods/feed.js`** — import **`logger`** pour **`uploadFeedPostImage`** (logs / catch cohérents avec le reste de la couche API).
- **Toasts invisibles** : **`DrawerContent`** (OTA, erreurs menu) et **`RatingModal`** — montage du composant **`Toast`** + **`hideToast`** ; fragment JSX corrigé dans **`RatingModal`**.

### Modifié (client mobile — affichage des images de posts)
- **`api/normalizeMediaUrl.js`** : pour les URLs **`/uploads/`**, réécriture vers l’origine de **`API_CONFIG.BASE_URL`** lorsque l’hôte est **`localhost` / `127.0.0.1`** ou différent de l’API (fichiers servis par le backend, inaccessibles depuis le téléphone avec une ancienne base d’URL). **`trim`** des chaînes ; logique tunnel **`trycloudflare.com`** conservée.
- **`HomePage`**, **`WelcomePage`**, **`FeedPage`** : image de post **`normalizeMediaUrl(item.imageUrl || item.image)`** pour tolérer un éventuel champ **`image`**.

### Note (hors code)
- **Build iOS / EAS** : erreur Apple **403 — PLA Update available** : acceptation du **Program License Agreement** (et accords App Store Connect en attente) sur le compte **Apple Developer** / **Account Holder** ; pas de correctif dans le dépôt.

### Modifié (refactor — dette technique)
- **Client mobile — couche API** : le monolithe `api/config.js` est découpé en **`endpointsConfig.js`**, **`http.js`** (requêtes, cache, retry), **`normalizeMediaUrl.js`**, **`apiMethods.js`** (assembleur) et le dossier **`api/methods/`** (`coreAuth`, `emailPassword`, `profiles`, `bookerEvents`, `bookerStaff`, `chat`, `feed`, `admin`). Les imports applicatifs restent **`from '.../api/config'`** ; comportement des appels inchangé.
- **`getBookerProfile`** : utilise directement **`apiRequest(USER_PROFILES)`** au lieu de **`api.getUserProfiles`** (suppression de la dépendance circulaire lors du chargement du module).
- **Méthodes booker** : suppression d’un doublon **`publishEventToFeed`** dans l’objet API (deux entrées identiques ; seule la version avec **`API_CONFIG.ENDPOINTS.BOOKER_EVENTS`** est conservée).

### Modifié (refactor — serveur)
- **Validation créneaux DJ** : **`parseHmClock`** et **`djSlotFitsEventWindow`** sont déplacés dans **`server/utils/djSlotWindow.js`** ; **`server/index.js`** les importe (comportement identique).
- **`server/lib/prisma.js`** : instance unique **`PrismaClient`** partagée par **`index.js`** et les modules de routes (plus de second **`new PrismaClient()`** dans l’entrée serveur).
- **Routes extraites de `index.js`** : **`routes/registerAdminAndReports.js`** (bootstrap, seed démo, **`/api/admin/*`**, **`POST /api/reports`**, modération signalements / événements / feed) et **`routes/registerChatRoutes.js`** (tous les **`/api/chat/*`**, constante **`MAX_CHAT_MESSAGE_LENGTH`** locale au module). Enregistrement juste après le healthcheck ; chemins HTTP inchangés.
- **Suite refactor serveur** : **`routes/registerTicketsAndPayments.js`** (achat billets classique, webhook Stripe, intents / confirmation, **`/api/payments/me`**, tickets utilisateur), **`routes/registerFeedRoutes.js`** (feed, follow, notifs feed, upload image post — chemins fichiers via **`SERVER_ROOT`**), **`routes/registerBookerOrganizerRoutes.js`** (disponibilités booker, événements organisateur, contrats DJ/lieu, staff, scan, amis, etc.). Enregistrement après **`eurosToCents`** / multer selon les dépendances ; **`index.js`** nettement raccourci, comportement API inchangé.

---

## Semaine du 14 au 17 avril 2026 (lun. - ven.)

### Ajouté
- **Organisateur — participants (billets)** : composant **`BookerTicketHoldersSection`** (`components/BookerTicketHoldersSection.js`) — filtre par nom (champ affiché dès **plus de 3** porteurs), compteur si le filtre réduit la liste, message si aucun résultat.
- **Android — quitter l’app** : double appui sur **Retour** depuis **Accueil** ou **Bienvenue** (~2,5 s) pour **`exitApp`**, avec toast « Appuyez encore pour quitter » / équivalent EN (`App.js`).
- **Aperçu PDF contrat (Android)** : texte d’aide **`pdfOfflineHint`** — rappel que l’aperçu peut dépendre du réseau (PDF.js) ; en cas d’écran vide, utiliser ouvrir / partager (`ContractPdfPreviewModal`).

### Modifié
- **`BookerEventDashboardPage`** : le composant **`Toast`** est monté (comme sur les autres écrans) — les erreurs de validation et de création d’événement s’affichent au lieu de sembler « sans effet » ; contrôle explicite du **token** avant envoi.
- **`BookerDashboardPage`** : bloc liste des porteurs de billets délégué à **`BookerTicketHoldersSection`** (mêmes styles `ticketHoldersBlock` / lignes) ; **tirer pour actualiser** la liste **« Mes événements »** (`RefreshControl` + `getBookerEvents`, indicateur de chargement en **`Colors.primary`**).
- **Accessibilité** : **`WelcomePage`** / **`HomePage`** / **`FeedPage`** — modales **signalement** et **suppression de post** ; cartes **post** (profil, j’aime, commentaires, partage indisponible, signalement / suppression) ; **champ commentaire** et **envoi** ; cartes **événement** ; **`EventDetailPage`** (retour, signalement, liens lieu / DJ / organisateur, groupe d’amis, CGV, achat, notation, modal d’invitation) ; **`TicketsPage`**, **`PurchasesPage`**, **`ScanTicketPage`**, **`StaffEventsPage`** — `accessibilityRole` / `accessibilityLabel` (et `accessibilityState` / `accessibilityHint` le cas échéant) sur retour et actions principales.
- **`FeedPage`** : le bouton **signaler** n’est affiché que si le post **n’est pas** le vôtre (aligné avec l’écran d’accueil).
- **`WelcomePage`** : suppression du **code mort** de l’ancien **menu bas** (déjà remplacé par le drawer latéral) — plus de `{false && …}`, d’animation `translateY` ni de styles associés.

### Scan billets → présence (participants)
- **Backend** (`POST /api/events/:eventId/scan-ticket`) : fenêtre de scan élargie — **même jour (UTC)** **ou** événement **ONGOING** **ou** override **`SCAN_TICKET_ALLOW_ANY_DAY=true`** ; réponse enrichie avec **`ticket.holderDisplayName`** et **`entered: true`**.
- **Mobile** : après scan réussi, flag **AsyncStorage** pour rafraîchir la liste événements / porteurs au retour sur **`BookerDashboardPage`** ; **`ScanTicketPage`** affiche le nom du participant validé.

### Création d’événement — délai minimal (7 jours)
- **Backend** (`POST /api/booker/events`) : la date de l’événement doit être **au moins 7 jours après aujourd’hui** (calendrier, même logique que le contrôle « date passée »). Variable **`EVENT_MIN_LEAD_DAYS`** (`0` = désactiver, défaut `7`). Documenté dans **`server/env.example.txt`**.
- **Mobile** (`BookerEventDashboardPage`) : **date minimum** sur les sélecteurs, validation avant envoi, texte d’étape 1. **`EXPO_PUBLIC_EVENT_MIN_LEAD_DAYS=0`** dans l’environnement de build pour désactiver côté UI (aligné avec le serveur pour tests type « événement aujourd’hui »).
- **Suppression événement (booker)** : variable **`BOOKER_ALLOW_DELETE_WITH_TICKETS=true`** sur le serveur pour lever le blocage « ticket(s) déjà vendu(s) » (cleanup de test uniquement) ; suppression des **DjRating / VenueRating** liés à l’événement avant effacement. Documenté dans **`server/env.example.txt`**.
- **`BookerEventDashboardPage`** : correction bouton **Suivant** / **Confirmer et créer** — le prix **0 €** (ou `price` numérique `0` depuis un brouillon) ne doit pas désactiver le bouton (`!price` est vrai pour `0` en JavaScript).
- **`BookerEventDashboardPage`** / **`EventFormContext`** : retour depuis la sélection **lieu** ou **DJ** — l’étape du formulaire ne repart plus à l’**étape 1** alors que la sélection est conservée (étape initiale depuis `routeParams`, **étape du wizard persistée** dans le contexte si les params ne sont pas fiables au 1er rendu, brouillon « Reprendre » qui ne réécrase plus l’étape ni le lieu en cas de retour avec sélection, action **`replaceVenue`** prise en charge comme **`select`**).

---

## Semaine du 7 au 10 avril 2026 (lun. - ven.)

### Ajouté
- **EAS Update (OTA)** : vérification au **lancement** de l’app en build production (`EASUpdateOnLaunch` dans `App.js`) — si une mise à jour est disponible : `fetchUpdateAsync` puis `reloadAsync` (même logique que le bouton « Vérifier » du tiroir). Inactif en mode développement (`__DEV__`).
- **Liste des participants (billets) pour l’organisateur** : `GET /api/booker/events` enrichi avec **`ticketHolders`** (nom affichable depuis le profil Communauté / username, statut, indicateur d’entrée). Sur **`BookerDashboardPage`**, bloc **« Participants (billets) »** sous Staff / Scanner pour faciliter le contrôle à l’entrée.

### Modifié
- **Emails contrat** (`server/utils/contractEmail.js`) : libellés **« contrat accepté »** (objet, titre HTML, corps, pied de page) à la place de « contrat signé », alignés sur l’acceptation dans l’app NOX ; versions FR / EN.
- **Build iOS** : synchronisation du **`expo.ios.buildNumber`** dans `app.json` avec EAS (`autoIncrement` après builds / soumissions).
- **Création d’événement (organisateur)** : (`BookerEventDashboardPage`, `EventFormContext`, `BookerDashboardPage`)
  - Libellés **étape 5** : plus de « Paiement » — **récapitulatif** avec précision *aucun Stripe à cette étape* ; fil d’étapes « Récap ».
  - **Avertissement** sur le bloc « coûts » : montants **indicatifs** (lieu estimé, DJ via contrats).
  - **Brouillon** AsyncStorage (`@nox_booker_event_creation_draft_v1`) : reprise / effacement / « plus tard » au premier chargement ; sauvegarde différée tant que le formulaire n’est pas vide.
  - **Image de couverture** (optionnelle, étape Détails) : choix galerie → **upload après** `POST /api/booker/events` (`uploadEventImage`).
  - **Modal succès** : rappel des prochaines étapes (chats, contrats) ; CTA **Voir mes événements** avec `highlightEventId` sur le dashboard ; correction **`setShowMyEvents`** inexistant → **`setActiveSection('events')`**.
  - **Rappel des champs requis** sous l’indicateur d’étapes (par étape).

### Corrigé
- **Aperçu PDF contrat (Android)** : écran gris dans le WebView — l’iframe `data:application/pdf` n’est pas rendue par Chrome WebView. **`ContractPdfPreviewModal`** : sur Android, rendu des pages en **canvas via PDF.js** (scripts jsdelivr + worker) à la place de l’iframe.

### Modifié (UI/UX — lot 1)
- **Jetons de couleur** : `constants/colors` utilisé davantage (**`App`**, tiroir, **`BookerDashboardPage`**, **`EmptyState`**, **`ContractPdfPreviewModal`**).
- **Android — bouton Retour** : `NavigationContext` : historique initial vide + **`tryHardwareBack`** ; dans **`App`**, `BackHandler` appelle **`tryHardwareBack`** (sinon comportement système, ex. quitter l’app). **`Drawer`** : Retour ferme le menu en priorité.
- **Menu latéral** : libellés **FR/EN** selon la langue, **icônes Ionicons** à la place des emojis pour les entrées, liens légaux et boutons OTA / déconnexion ; **`accessibilityRole` / `accessibilityLabel`** sur les entrées principales ; bouton flottant menu et fermeture avec libellés accessibles bilingues.
- **Aperçu PDF** : bouton **« Ouvrir / partager le PDF (autre appli) »** via **`expo-sharing`** (repli si WebView / réseau défaillants).
- **Dépendance** : **`expo-sharing`**.

### Modifié (UI/UX — lot 2)
- **Palette** : Migration **`#FF1744` / `#0b0b0e`** → **`Colors.*`** sur l’essentiel de l’app mobile (écrans profils, événements, auth inscription, welcome, composants `EventCard`, `Logo`, `ErrorBoundary`, lecteurs média, etc.) ; seule **`constants/colors.js`** conserve les hex sources.
- **Accessibilité** : **`HomePage`** / **`FeedPage`** (actualiser, notifications, poster, réessayer, onglets « Pour tous / Abonnements ») ; **`LoginPage`** (modes connexion / inscription, mot de passe oublié, afficher le mot de passe, boutons principaux) ; **`AccountTypePage`** (retour, cartes type de compte).

---

## Semaine du 31 mars au 4 avril 2026 (mar. - ven.)

### Corrigé
- **Modale édition / contre-proposition contrat (iOS)** : Touches inactives sur les champs, listes (modalités, type d’accord, etc.) et boutons — dû notamment à **plusieurs `Modal` empilés** (éditeur + PDF ou éditeur + pickers) et à un **`ScrollView` sans hauteur bornée** dans un overlay centré.
  - **Éditeur** : sur iOS, contenu dans des `View` (sans `KeyboardAvoidingView` sur l’overlay), carte à **hauteur fixe** (~88 % de l’écran), `ScrollView` en `flex: 1`, `nestedScrollEnabled` / `removeClippedSubviews={false}` selon les cas.
  - **Aperçu PDF** : fermeture de l’éditeur avant d’ouvrir le PDF ; **réouverture de l’éditeur** si l’utilisateur annule l’aperçu (délai sur iOS).
  - **Listes (paiement, deal, annulation, fin d’événement)** : sur iOS, **masquage temporaire de l’éditeur** le temps du sous-modal, puis réaffichage à la fermeture — évite deux modales plein écran simultanées.
  - Fichiers : `BookerDashboardPage.js`, `DjDashboardPage.js`, `VenueDashboardPage.js`.
- **`ContractPdfPreviewModal`** : alignement avec Expo SDK 54 (`expo-file-system/legacy`), états de chargement cohérents ; **Android** : affichage PDF via document HTML + iframe `data:application/pdf;base64` lorsque l’affichage direct fichier/WebView échoue.
- **Dashboard DJ** : crash / erreur React (« hooks ») — les `useMemo` (`contractEventEndOptions`, `contractEventWindowHint`) étaient après un `if (loading) return`, donc **pas appelés** au premier rendu puis appelés ensuite. Déplacés **au-dessus** du retour « chargement » ; les `useState` (`processingInvitation`, modales de refus) déjà regroupés **avant** tout `useEffect`.
- **Chat — carte contrat (iOS)** : un **`Pressable` englobait toute la carte** (résumé + boutons « Voir le PDF », « Envoyer », etc.), ce qui pouvait faire **jouer l’animation de pression sans exécuter** le `onPress` des boutons. Désormais : **`TouchableOpacity` uniquement sur le bloc résumé** (titre, détails, mentions) pour ouvrir l’éditeur ; les **actions sont en dehors**, au même niveau dans la carte (`BookerDashboardPage`, `DjDashboardPage`, `VenueDashboardPage`).
- **Aperçu PDF depuis le chat (iOS)** : **deux `Modal` plein écran** (conversation + aperçu PDF) provoquaient des **touches inactives** et, après **Accepter** ou **Envoyer**, retour sur le dashboard avec sensation de **fenêtre invisible** — le flag **`reopenChatAfterContractRef`** n’était pas consommé. Sur iOS : **fermer le modal chat** avant d’ouvrir le PDF ; à la **fermeture** ou la **confirmation** du PDF, **rouvrir le chat** si besoin (sans réouvrir l’éditeur le cas échéant). Le bouton **Accepter** envoie aussi un **`previewPayload`** cohérent (Booker, DJ, Lieu).

### Modifié
- **EAS / soumission iOS (TestFlight)** : `eas.json` — profil **production** avec `distribution: "store"` ; `cli.appVersionSource: "local"` (prérequis CLI à venir) ; `ios.autoIncrement: true` sur le profil production pour limiter les erreurs *duplicate build* ; `app.json` — `expo.ios.buildNumber` porté à **2** après rejet App Store Connect (*build 1* déjà utilisé pour la version **1.0.0**).
- **Flux contrat (mobile)** : bouton **« Voir le contrat (PDF) »** avant la **case à cocher** (lecture confirmée) ; mode **`previewOnly`** dans `ContractPdfPreviewModal` (fermeture après lecture) ; brouillon organisateur avec libellé dédié et **Envoyer** désactivé tant que la case n’est pas cochée ; libellés d’acceptation alignés sur la lecture du PDF (`contractPayload.js`).
- **UI — Organisateur / Lieu** : en-têtes (titres sans coupures absurdes, `minWidth` / taille), **ligne DJ** sur les cartes événement (nom + chat sur une ligne, **badges** sur une deuxième ligne avec `flexWrap`), **onglets** du dashboard lieu en **`ScrollView` horizontal** (plus de `flex: 1` sur chaque onglet), cartes **réservations** (titre sur plusieurs lignes si besoin, distinction **Chat** plein / **Annuler** en contour).

---

## Semaine du 24 au 27 mars 2026 (mar. - ven.)

### Ajouté
- **Infos légales (contrats)** : Champs légaux sur les profils Organisateur (`UserBooker`), Lieu (`UserVenue`) et DJ (`UserDj`) — raison sociale, adresse, SIRET, représentant légal / nom civil selon le type, etc.
  - Backend : migration Prisma, création et mise à jour des profils ; **édition autorisée une seule fois** tant que les champs légaux sont vides, puis lecture seule
  - API : `getUserProfiles` expose ces champs ; `phonePro` inclus pour le mapping booker
- **Inscription** : Section optionnelle « Infos légales (pour les contrats) » sur les formulaires Organisateur, Lieu et DJ
- **Édition de profil** : Section « Infos légales » sur BookerDashboard, VenueProfileEditPage et DjDashboardPage ; **bannière** lorsque les champs sont encore vides pour inciter à les compléter

### Corrigé
- **VenueProfileEditPage** : La sauvegarde du profil lieu n’envoyait pas les champs légaux au backend — corrigé dans `handleSave` ; rechargement du profil après enregistrement

### Modifié
- **PDF des contrats** : Contenu et articles alignés sur les modèles `docs/contract-templates/` (prestation DJ et lieu/organisateur) — commission NOX 10 % sur cachet DJ, articles 1–11 / 1–12, typologie `dealType` pour le contrat lieu (`fixed_rent` par défaut si non renseigné) ; emails des parties injectés dans le PDF ; champs optionnels via `contractPayload` (`eventEnd`, `equipment`, `dealType`, parts, `noxFee`, etc.)
- **UI contrats (mobile)** : `constants/contractPayload.js` + `ContractDraftEditorFields` / `DealTypePickerModal` — brouillon et contre-propositions enrichis (type d’accord lieu, fin de prestation, matériel, clause financière, partages %, minimum garanti, accord personnalisé, commission NOX optionnelle) ; Booker, Lieu et DJ envoient le JSON complet au backend pour alimenter le PDF
- **`.gitignore`** (racine) : exclusion de fichiers locaux non nécessaires au runtime (`RESEND_CONFIGURATION_PATRON.txt`, `Untitled-1`, `client/build/`, `docs/contract-templates/`)

### Ajouté (24 mars 2026)
- **Création d’événement — créneaux DJ** : Pour chaque DJ, plage horaire (début / fin en `HH:mm`) dans la fenêtre « heure de début + durée » de l’événement. Répartition automatique du temps quand plusieurs DJs, modifiable via pickers ; récap affiche nom + créneau.
  - **Prisma** : `EventDj.slotStart`, `EventDj.slotEnd` (optionnels) ; migration `20260324130000_event_dj_slot_times`
  - **API** : `POST /api/booker/events` accepte `djSlotAssignments` (même ordre que `djIds`) ; validation serveur des créneaux par rapport à `time` + `durationHours`
  - **Mobile** : `BookerEventDashboardPage`, `EventFormContext` (`djSlotAssignments`, synchro avec `addDj` / `removeDj`)
- **Navigation sélection DJ (création événement)** : Même logique que pour le lieu — passage de `returnTo: 'bookerEventDashboard'` jusqu’à `DjProfilePage` (`navigate(returnTo || 'bookerDashboard', …)`) pour revenir au formulaire sur l’étape DJs après choix du profil (`SelectDjPage`, `DjProfilePage`).

### Corrigé (24 mars 2026)
- **Validation créneaux DJ** : `slotFitsEventWindow` renvoyait un objet `{ ok }` alors que l’app testait `if (!slotFitsEventWindow(…))` — toujours truthy, donc aucune validation. Retour **booléen** ; validation immédiate au choix d’heure dans le picker.
- **Aperçu PDF avant envoi du contrat** : Expo SDK 54 — `expo-file-system` sans `/legacy` fait **échouer** `writeAsStringAsync` → « PDF indisponible ». Import **`expo-file-system/legacy`** ; normalisation du base64 ; repli **data URL** si pas de `cacheDirectory` ; état **préparation** du fichier.
- **Crash des dashboards (ErrorBoundary « Oups ! Une erreur est survenue »)** : `ContractPdfPreviewModal` utilisait **`showSpinner`** non défini (merge incomplet). Ajout de **`filePreparing`**, **`showSpinner = loading || filePreparing`** et **`canConfirm`** cohérent.

---

## Semaine du 17-19 mars 2026 (mar. - jeu.)

### Ajouté
- **Staff & scan de billets** : Les organisateurs peuvent ajouter des profils Communauté comme amis, les assigner comme staff sur des événements (rôle scan QR) et scanner les billets à l'entrée
  - Backend : modèles `BookerCommunityFriend`, `EventStaff`, champ `Ticket.scannedAt` ; endpoints `GET/POST /api/booker/friends`, `GET /api/community/booker-friend-requests`, `PUT /api/booker/friends/:id/respond`, `GET/POST/DELETE /api/events/:eventId/staff`, `POST /api/events/:eventId/scan-ticket`, `GET /api/community/staff-events`
  - Scan autorisé uniquement le jour de l'événement (vérification date)
  - Mobile : BookerFriendsPage (amis organisateur), CommunityFriendsPage onglet « Orga » (demandes reçues), EventStaffPage (liste staff + ajout parmi les amis), ScanTicketPage (caméra QR), StaffEventsPage (événements où je suis staff)
  - Navigation : boutons « Staff » et « Scanner billets » sur chaque carte d'événement (BookerDashboard) ; entrée menu « Scanner billets » pour profil Communauté (événements staff)
- **Envoi des contrats signés par email** : Quand un contrat (Organisateur ↔ DJ ou Organisateur ↔ Lieu) est signé par les deux parties, un email récapitulatif est envoyé automatiquement à chacun (événement, montant, acompte, modalités de paiement)
  - Backend : `server/utils/contractEmail.js`, appelé depuis les endpoints accept contrat
- **Contrats en PDF** : Lorsqu'un contrat est signé par les deux parties, un PDF formaté est généré et joint à l'email envoyé à l'organisateur et au DJ/lieu
  - Contrat DJ : sections Organisateur (nom, raison sociale, adresse, SIRET), DJ (nom d'artiste, nom civil, adresse, SIRET, TVA), objet (événement, date, lieu), conditions financières, annulation, notes, signatures
  - Contrat Lieu : sections Organisateur, Lieu (raison sociale, représentant légal, adresse, SIRET), objet, conditions financières, annulation, notes, signatures
  - Backend : `server/utils/contractPdf.js` (pdfkit), `server/utils/mailer.js` (support pièces jointes)

### Modifié
- **Sécurité** :
  - JWT_SECRET requis en production (pas de fallback) — `utils/jwtConfig.js`
  - Quantité tickets : validation entière + plafond 50 par achat — `parseTicketQuantity`
  - Rate limit admin bootstrap/seed : 5 req/heure par IP
  - Messages chat : limite 5000 caractères (anti-abus)
- **Rebrand Insane → Nox dans les emails** : Sujets des emails (contrats, vérification, mot de passe oublié) et `RESEND_FROM` utilisent désormais « Nox »
- **Affichage DJ** : Correction du bug « [object Object] » sur la ligne DJ (EventCard, EventDetailPage, EventsPage client) — support du format `djs` en objets `{ artistName }`

### Corrigé
- **Sécurité** : JWT_SECRET obligatoire en prod, validation quantité tickets, rate limit admin, limite longueur messages chat (voir Modifié)
- **Config Resend** : `env.example` et `.env` mis à jour pour `noreply@nox.world` (domaine vérifié)

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
