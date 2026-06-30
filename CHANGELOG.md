# Changelog

Toutes les modifications notables du projet sont documentées par semaine.

---

## Semaine du 16 au 19 juin 2026 (mar. - ven.)

### Corrigé (wizard événement — créneaux DJ multiples, régression)
- **2ᵉ DJ n’écrase plus le 1ᵉʳ** : priorité au `slotIndex` vers un créneau vide (`resolveDjSlotTargetIndex`) ; fusion slots/formData conserve les créneaux vides ajoutés ; sync formulaire à l’ajout d’un créneau ; nettoyage des `routeParams` après sélection.
- **Correctif définitif multi-DJ** : `assignDjToSlotAtIndex` (mode `fill` / `replace`) ; brouillon AsyncStorage **ne réécrase plus** la grille au retour selectDj ; `djSlotsLayout` préservé ; token `pickToken` anti double-traitement.
- **UX étape 3 refaite** : sélection DJ via **modal in-app** (`BookerEventDjPickerModal`) — plus de navigation selectDj/profil ; `assignDjToWizardSlot` dans le contexte ; sync `djSlots` → `formData` par effet dédié.
- **Multi-DJ garanti (v2)** : création API et récap lisent **`djSlots`** via `djSlotsToFormDjFields` (plus `formData.djIds` seul) ; brouillon chargé **une seule fois** au montage ; clé AsyncStorage **v2** ; badge « modal intégré (v2) » étape 3 pour confirmer la mise à jour OTA.
- **Brouillon + retour lieu** : réhydratation AsyncStorage au retour selectVenue (fusion sans écraser date/lieu live) ; `flushDraftNow` avant navigation lieu ; créneaux horaires DJ visibles dès qu’un `djId` est posé ; recalc auto des heures si manquantes.
- **Régression multi-DJ** : grille **`djSlotsLayout`** persistée dans le contexte événement ; réhydratation depuis le brouillon AsyncStorage au retour selectDj/profil DJ ; handler routeParams attend la fin du chargement brouillon (`draftGate`).
- **Grille créneaux dans le provider** : **`djSlots`** vit désormais dans **`EventFormContext`** (plus de state local perdu au démontage) ; le brouillon ne réécrase plus une grille contexte plus récente que le debounce 700 ms (`pickDjSlotsBase`).

### Ajouté / Refonte (design system NOX — Figma, phase 0)
- **Palette globale** : accent **bleu `#4DA3FF`** (Figma) remplace le rouge cyberpunk ; fond `#000` ; helper `primaryAlpha()` ; remplacement des `rgba(255,23,68,…)` codés en dur dans les styles.
- **Typographie Satoshi** : polices Fontshare dans `assets/fonts/` ; chargement via `expo-font` + `useNoxFonts` au boot ; presets Figma dans `constants/typography.js`.
- **Tokens layout** : `constants/theme.js` (Spacing, Radius, Layout).
- **Composants de base** : `components/nox/` — `NoxText`, `NoxButton`, `NoxInput`, `NoxCard`, `NoxScreenHeader` (pour la refonte écran par écran).
- **Typo Satoshi** appliquée sur Login, EmptyState, ErrorBoundary (premiers écrans partagés).

### Corrigé / Ajouté (wizard création événement — date et sélecteurs)
- **« Invalid Date » étape 1** : `eventDateTime` n’était pas exposé par le hook `useBookerEventWizard` (donc `undefined` → `new Date(undefined)`). Ajouté au retour ; affichage de la date avec repli défensif sur `formData.date`.
- **Sélecteur DJ (modale)** : bouton **« 👁 Profil »** par DJ (ouvre le profil, le brouillon est sauvegardé avant navigation) ; scroll fiabilisé (liste `flexShrink` + zone tap dédiée).
- **Sélecteur lieu uniformisé** : nouvelle **modale in-app** `BookerEventVenuePickerModal` (recherche, profil, sélection) à l’étape 2, à la place de la navigation vers une page séparée — même UX que le sélecteur DJ.

### Corrigé (mobile — crashs « Oups une erreur est survenue » des dashboards, post-refactor)
- **Dashboard organisateur** : `BookerChatModal` recevait les setters mais pas les valeurs `selectedChatEventDjId/VenueId/PrestataireId` (`ReferenceError`) ; `cancellationPolicyLabel` non importé. Valeurs passées + import ajouté.
- **Dashboard lieu** : `useVenueDashboard` retournait `handleDeleteMessage` jamais défini (crash à l’ouverture) — fonction implémentée ; `VenueChatModal` : `Colors`/`cleanText` non importés, `selectedChatEventVenueId`/`contractBooking` manquants, et helpers (`dealTypeLabel`, `PAYMENT_TERMS_OPTIONS`…) déstructurés des props masquaient les imports ; `VenueBookingsTab` : `Colors` non importé.
- **Dashboard DJ** : `DjProfilSection` n’exposait pas `openDjStreamPreview` (aperçu SoundCloud/Spotify).
- **Création d’événement** : `BookerEventStep4Details` n’avait pas `setCoverImageUri` (retrait image de couverture) — exposé par le hook wizard.
- **Détail événement** : `unitPriceForPurchase` non retourné par le hook d’achat (crash bouton « Acheter ») ; appel orphelin `setInvitingGroupId` retiré.
- **Outil anti-régression** : `scripts/find-unbound-refs.js` détecte tout identifiant référencé mais non lié (import/prop/déclaration manquants), y compris dans les composants.

### Corrigé (mobile — crash au démarrage, build 9 / cause racine)
- **`ReferenceError` à l’évaluation des styles** : le découpage automatique des écrans en `*.styles.js` avait laissé des références **`Platform`** (`BookerDashboardPage.styles.js`) et **`width`** (`VenueDashboardPage.styles.js`, `DjProfilePage.styles.js`) **non importées/non définies** au niveau module. Comme `App.js` importe tous ces écrans, le bundle plantait dès l’évaluation → **fermeture instantanée sur iOS et Android** (Metro ne détecte pas ces erreurs). Imports/`Dimensions` ajoutés.
- **Garde-fou** : `scripts/find-module-scope-refs.js` détecte les identifiants référencés au niveau module mais non liés (anti-régression de ce type de crash).

### Corrigé (mobile — crash boucle OTA TestFlight)
- **Démarrage** : plus de `reloadAsync()` automatique au lancement (`App.js`) — téléchargement OTA en arrière-plan seulement ; application via menu **Mises à jour (OTA) → Vérifier** (évite boucle crash si OTA incompatible).
- **Rollback OTA production iOS** : retour au bundle embarqué du build TestFlight si une OTA provoquait un crash au redémarrage.

### Corrigé (contrats — visibilité paiement Stripe booker)
- **Paiement in-app uniquement** (organisateur) : bandeau + scroll auto dans le chat booker ; chip **« 💳 Payer (chat) »** sur la liste événements si `PENDING_PAYMENT` ; message explicite côté DJ (pas de lien email pour payer).

### Ajouté (publication stores — checklist & infra)
- **Checklist publication** : `docs/mobile/PUBLICATION_STORES.md` (App Store + Play Store, OTA post-lancement, commandes).
- **Référentiel légal (quoi / où)** : `docs/mobile/INFORMATIONS_LEGALES_A_COMPLETER.md` — formulaire éditeur + tableau des emplacements (code, HTML, stores).
- **EAS Submit** : section `submit.production` dans `eas.json` ; scripts npm `build:store:*`, `submit:store:*`, `store:check`.
- **Pages légales publiques** : `server/public/legal/` (privacy, CGU, CGV, mentions) servies sur **`GET /legal/*`** — URLs requises par les stores.
- **Mobile** : `constants/legalConfig.js` (email support, placeholders éditeur) ; `store-metadata/` (descriptions FR brouillon).

### Modifié (contrats — paiement Stripe avant signature Yousign)
- **Nouveau flux** : les deux parties acceptent → statut **`PENDING_PAYMENT`** → le **booker paie via Stripe** → envoi **Yousign** (`PENDING_SIGNATURE`) → webhook → **`SIGNED`**. Plus d’envoi Yousign tant que le paiement n’est pas reçu.
- **Facture par email** : dès le paiement Stripe enregistré, envoi d’une **facture / reçu PDF** (`contractInvoicePdf.js` + `contractInvoiceEmail.js`) à l’organisateur et au prestataire (DJ / lieu / prestataire) — distinct de l’email **contrat signé** (après Yousign).
- **Serveur** : statut Prisma **`PENDING_PAYMENT`**, champ **`stripePaymentIntentId`** (3 modèles, migration `20260612160000`), util **`contractPayment.js`**, orchestration dans **`contractSignature.js`** (`afterBothPartiesAccepted`, `fulfillContractPaymentAndStartSignature`, retry signature si refus après paiement).
- **API Stripe** : `POST /api/payments/create-contract-intent`, `POST /api/payments/confirm-contract-payment`, webhook Stripe `metadata.type=contract`, routes **`retry-signature`** (booker). Fallback sans Yousign : paiement → **`SIGNED`** direct.
- **Mobile** : bouton **« Payer avec Stripe »** dans le chat booker (`PENDING_PAYMENT`), relance signature si paiement déjà reçu ; libellés **« En attente paiement »** côté DJ / lieu / prestataire.
- **Tests serveur** : 6 nouveaux tests (`contractPayment`, `contractInvoice`) — **32 au total**.

---

## Semaine du 9 au 12 juin 2026 (mar. – ven.)

### Corrigé (wizard événement booker — créneaux DJ multiples)
- **Ajouter plusieurs DJs ne supprime plus le précédent** : la fusion des créneaux (`mergeDjSlotsWithForm`) est désormais une **union** state local + formulaire — un DJ présent dans le formulaire ne peut plus disparaître quand l'écran est remonté pendant la navigation vers la sélection (slot vide ajouté, ordre décalé…).
- **Sélection par identité** plutôt que par index : `replaceDjId` (DJ actuel du créneau visé) est propagé `Step3 → SelectDjPage → DjProfilePage → wizard` ; au retour, le remplacement cible ce DJ et l'ajout va dans un créneau vide — un index décalé n'écrase plus un autre DJ. Retrait d'un créneau aussi par identité ; re-sélection d'un DJ déjà choisi ne crée plus de doublon.

### Ajouté (contrats — signature électronique Yousign)
- **Signature électronique** des contrats (DJ / lieu / prestataire) via **Yousign** : statut intermédiaire **`PENDING_SIGNATURE`**, emails de signature, webhook **`signature_request.done`** → **`SIGNED`** (+ notif chat, email PDF) ; refus / expiration → retour négociable. **Sans `YOUSIGN_API_KEY`, fallback** acceptation directe. *(Le flux complet acceptation → paiement → signature est détaillé en semaine 16–19.)*
- **Serveur** : client API v3 **`utils/yousign.js`** (sandbox par défaut, multipart natif, HMAC webhook), orchestration **`utils/contractSignature.js`**, webhook **`POST /api/webhooks/yousign`** (body brut + vérif `x-yousign-signature-256`), **smart anchors** `{{s1/s2|signature}}` (texte blanc) dans les PDF pdfkit (option `signatureAnchors`, preview / email inchangés).
- **Prisma** : statut **`PENDING_SIGNATURE`** + champ **`yousignSignatureRequestId`** (+ index) sur `EventDj` / `EventVenue` / `EventPrestataire` (migration `20260610170000`).
- **Mobile** : statut « Signature en cours » + hint explicatif dans les 4 modales chat ; toast « signature électronique envoyée par email » à l'acceptation.
- **Config** : `YOUSIGN_API_KEY`, `YOUSIGN_API_BASE_URL`, `YOUSIGN_WEBHOOK_SECRET` documentées dans `env.example.txt`. **5 nouveaux tests** (27 au total).

### Refactorisé (mobile — dashboard DJ, fin du découpage)
- **`DjDashboardPage.js`** (~2 380 → **~545** lignes) : logique → hooks **`useDjProfile`**, **`useDjBookings`**, **`useDjMessaging`** ; modales → **`DjChatModal`**, **`DjContractModals`**, **`DjMediaModals`** ; **`PAYMENT_TERMS_OPTIONS`** dans **`utils/djDashboardUtils.js`**.
- **Scripts** de maintenance : **`extract-dj-hooks.js`**, **`extract-dj-modals.js`**, **`build-dj-dashboard-thin.js`**.

### Refactorisé (mobile — dashboard prestataire)
- **`PrestataireDashboardPage.js`** (~860 → **~170** lignes) : hooks **`usePrestataireProfile`**, **`usePrestataireBookings`**, **`usePrestataireMessaging`** ; sections + modales sous **`components/prestataireDashboard/`** ; styles **`PrestataireDashboardPage.styles.js`**.

### Refactorisé (mobile — wizard événement booker)
- **`useBookerEventWizard.js`** (~1 060 → **~780** lignes) : brouillon AsyncStorage → **`useBookerEventWizardDraft`** ; matériel / paliers extra → **`useBookerEventWizardRental`**.

### Refactorisé (mobile — chat / contrats booker)
- **`useBookerMessaging.js`** (~740 → **~310** lignes) : éditeur iOS → **`useBookerContractEditor`** ; flux contrats DJ / lieu / prestataire → **`useBookerContractFlows`**.

### Refactorisé (mobile — page détail événement)
- **`EventDetailPage.js`** (~1 570 → **~770** lignes) : styles → **`EventDetailPage.styles.js`** ; achat billet / paliers → **`useEventDetailPurchase`** ; groupes amis → **`useEventDetailGroups`** ; mocks → **`utils/eventDetailPageUtils.js`**.

### Refactorisé (mobile — feed d’actualité)
- **`FeedPage.js`** (~1 400 → **~280** lignes) : styles → **`FeedPage.styles.js`** ; reducer / dates → **`utils/feedPageUtils.js`** ; chargement onglets → **`useFeedList`** ; likes / commentaires → **`useFeedPostEngagement`** ; signalement → **`useFeedReport`** ; cartes → **`FeedPostCard`**, **`FeedEventCard`**, **`FeedReportModal`**.

### Complété (billetterie multi-tarifs — liste événements)
- **`GET /api/events`** : **`hasMultipleTicketPrices`** + prix minimum des paliers (aligné feed / détail).
- **`EventCard`**, **`EventsPage`** (mobile + web) : badge **« dès X € »** via **`utils/eventPriceUtils.js`** ; filtre date **À venir / Passés / Tous** sur la liste mobile.

### Refactorisé (assainissement post-audit — mobile + serveur)
- **`HomePage.js`** (~1 600 → **~715** lignes) : duplication feed supprimée — branche les hooks partagés **`useFeedList`** (+ état d'erreur / annulation au démontage), **`useFeedPostEngagement`**, **`useFeedReport`** et les composants **`FeedPostCard`** (+ prop `onDeletePost` auteur), **`FeedEventCard`**, **`FeedReportModal`** ; garde-fou chargement > 20 s conservé.
- **`EventsPage.js`** (mobile) : ~150 lignes de styles morts supprimées (rendu déjà dans `EventCard`), `getAvailabilityColor` dupliqué retiré, mocks dédupliqués via **`EVENT_DETAIL_MOCK_EVENTS`**.
- **Extraction styles** : **`DjProfilePage`** (~1 605 → ~860), **`WelcomePage`** (~1 485 → ~995), **`ProfilePage`** (~1 345 → ~840), **`LoginPage`** (~835 → ~575) → fichiers `*.styles.js` (script **`extract-screen-styles.js`**).
- **`userController.js`** (serveur, ~1 700 lignes) → agrégateur + 5 contrôleurs par domaine sous **`controllers/user/`** (account, djProfile, community, venue, eventGroup) ; API `require` inchangée.
- **Nettoyage** : 29 `console.log` de debug supprimés (script **`strip-console-logs.js`**) ; `Alert.alert` informatifs → **Toast** dans `usePrestataireProfile` / dashboard prestataire ; `formatDate` dupliqué de `WelcomePage` → **`formatFeedRelativeDate`**.

### Ajouté (billetterie — phases de vente + TTC / commission)
- **Phases de vente** par palier : champs optionnels **`saleStart` / `saleEnd`** sur **`ticketTiers`** (early bird → standard → last minute) ; serveur (**`isTierOnSale`**, code **`TIER_NOT_ON_SALE`** à l'achat Stripe / démo, **`onSale`** exposé sur le détail, « dès X € » basé sur les paliers **en vente**) ; wizard booker (dates **JJ/MM/AAAA** par tarif, validation) ; **`EventDetailPage`** (paliers hors fenêtre désactivés + hint « dès le… / jusqu'au… / vente terminée »).
- **TTC / commission Nox** : prix saisis **TTC** ; récap wizard avec détail **HT / TVA 20 %**, **commission Nox 10 %** déduite du reversement organisateur et **reversement estimé** par billet (**`utils/ticketPricingUtils.js`**) — indicatif, le prix acheteur ne change pas.
- **Tests serveur** : 5 nouveaux tests phases (`normalizeTicketTiersInput`, `isTierOnSale`, `resolvePurchaseTier`, `minTierPriceEUR onlyOnSale`) — 22 au total.

---

## Semaine du 2 au 5 juin 2026 (lun. – jeu.)

### Refactorisé (serveur — routes et `index.js` allégés)
- **`server/index.js`** : point d’entrée réduit ; enregistrement des routes via modules dédiés (**`registerEventPublicRoutes`**, **`registerDjPublicRoutes`**, **`registerProfileRoutes`**, **`registerRatingRoutes`**, **`registerMiscRoutes`**, etc.).
- **Booker** découpé sous **`server/routes/booker/`** : contrats, CRUD événements, paiements, ressources (DJs / lieux / prestataires), staff / scan.
- **Feed** sous **`server/routes/feed/`** : liste, posts, engagement (likes / commentaires), follow.
- **Chat** sous **`server/routes/chat/`** : conversations, privé, groupes, non-lus.
- **Médias / bookings** sous **`server/routes/media/`** : upload, public, invitations, listes bookings.
- **Utilitaires** extraits : **`contractHelpers.js`**, **`ratingCalculations.js`** ; **`server/lib/prisma.js`** (singleton Prisma partagé).
- **Scripts** d’extraction / découpage (`split-index-routes.js`, `split-booker-routes.js`, etc.) pour maintenance du découpage.

### Refactorisé (mobile — dashboard DJ)
- **`DjDashboardPage`** : logique éclatée en **7 sections** (`components/djDashboard/sections/` : profil, tarifs, médias, matériel, bookings, paiements, avis) + **`DjDashboardPage.styles.js`** + **`utils/djDashboardUtils.js`**.

### Refactorisé (mobile — dashboards organisateur, wizard événement & lieu)
- **`BookerDashboardPage.js`** (~4 500 → **~500** lignes) : styles → **`BookerDashboardPage.styles.js`** ; UI → **`components/bookerDashboard/`** ; logique → hooks **`useBookerProfile`**, **`useBookerEvents`**, **`useBookerMessaging`**, **`useBookerDjVenueRoute`** + **`utils/bookerDashboardUtils.js`**.
- **`BookerEventDashboardPage.js`** (~3 000 → **~210** lignes) : wizard → **`useBookerEventWizard`**, **5 étapes** sous **`components/bookerEventWizard/sections/`**.
- **`VenueDashboardPage.js`** (~2 260 → **~185** lignes) : onglets **`components/venueDashboard/sections/`** ; **`useVenueDashboard`** + **`utils/venueDashboardUtils.js`**.

### Corrigé (mobile — bundle dashboards booker & lieu / EAS)
- **`VenueChatModal`**, **`BookerEditEventModal`** : commentaires JSX orphelins avant **`<Modal>`** (échec export Metro).
- **`useBookerProfile`** : **`useEffect`** dupliqué / **`try`** incomplet après extraction du hook.
- **`BookerChatModal`**, **`BookerContractModals`**, **`BookerEditEventModal`** : chemins d’import corrigés depuis **`components/bookerDashboard/`**.

### Déployé (mobile — EAS Update OTA)
- **`npm run update:both`** : canaux **preview** (Android) et **production** (iOS) — *Refactor dashboards booker, wizard et lieu* ; runtime **1.0.0**.

### Ajouté (serveur — tests unitaires)
- **`npm test`** (`node --test`) : **`tests/validation.test.js`**, **`ticketTiers.test.js`**, **`contractHelpers.test.js`**, **`ratingCalculations.test.js`**.

### Ajouté (qualité — CI GitHub Actions)
- **`.github/workflows/ci.yml`** : sur push/PR **`railway-phase1`** / **`main`** — **`npm ci`** + **`npm test`** + **`node --check index.js`** dans **`server/`**.

### Documentation
- **`docs/AMELIORATIONS.md`** : backlog aligné sur l’état réel (multi-tarifs MVP, multi-DJ, modularisation serveur + DJ) ; **CI** tests serveur.

### Corrigé (mobile — classement DJs)
- **Menu** : entrée classement pointe vers l’écran **`ranking`** (page dédiée) au lieu d’un mauvais routage.
- **`RankingPage`** : données branchées sur **`GET /api/djs/ranking`** avec mapping API cohérent.
- **`DjRatingsPage`** : plus de chargement infini lorsqu’aucun **`djId`** n’est fourni.

### Corrigé (mobile — build dashboard DJ / EAS)
- Suppression de **JSX orphelin** après extraction des sections DJ (bundle Metro / export EAS).
- Retrait d’un **`require`** vidéo locale absente (**`gogg-tracer.mp4`**) qui cassait le bundling.

### Corrigé (mobile — création événement booker, multi-DJs)
- **`BookerEventDashboardPage`** : au retour du sélecteur DJ, **réhydratation de `djSlots`** depuis **`formData`** pour ne plus perdre les DJs / créneaux déjà choisis (remontage d’écran).

### Modifié (déploiement Railway)
- **`server/railway.json`** : démarrage avec **`npx prisma migrate deploy`** (au lieu de **`db push --accept-data-loss`**) avant **`npm start`**.

---

## Semaine du 26 au 29 mai 2026 (mar. – ven.)

*Suite de la billetterie multi‑tarifs (création, achat, feed — voir semaine **19–22**) ; entrées ci‑dessous = livraisons **de cette semaine** uniquement.*

### Ajouté (billetterie — palier lisible sur Mes tickets)
- **Serveur** : **`server/utils/ticketTierDisplay.js`** — **`tierLabelForTicket`** (résolution **`tierId` → libellé** via **`parseTicketTiersFromDb`** sur **`Event.ticketTiers`**).
- **API** : **`GET /api/user/me/tickets`** et **`GET /api/user/:userId/tickets`** enrichissent chaque billet avec **`tierId`** et **`tierLabel`** (null si billet legacy ou palier inconnu).
- **Mobile** : **`TicketsPage`** — ligne **« Tarif : … »** / **« Tier: … »** sous le prix lorsque **`tierLabel`** est présent ; style **`ticketTierHint`**.

### Corrigé (mobile — Mes profils, scroll Android)
- **`ProfilePage`** et **`SwitchProfilePage`** : **`paddingBottom`** du scroll basé sur **`useSafeAreaInsets`** (barre de navigation Android / edge-to-edge) pour atteindre le dernier profil (**Prestataire**, etc.) sans contenu masqué en bas.

### Documentation
- **`docs/STACK.md`** — référentiel stack (Expo/RN, Express, Prisma/PostgreSQL, Stripe, R2, Railway, variables d’env.,  client web CRA).
- **`docs/guides/WORKSHOP_PALIER_SUR_MES_TICKETS.md`** (+ corrigé **`*_SOLUTION`**) — parcours pas à pas pour la feature Mes tickets (fichiers de travail, hors CHANGELOG détaillé).

### Ops (base PostgreSQL Railway)
- **`prisma migrate deploy`** : application des migrations **`20260520103000_user_venue_max_capacity`** et **`20260520120000_event_ticket_tiers`**.
- **Dérive corrigée** : migration **`20260519200000_event_equipment_rental`** déjà appliquée en base (colonne **`equipmentRental`** existante) — marquée **`migrate resolve --applied`** puis enchaînement des migrations suivantes ; **`prisma generate`** côté serveur.

---

## Semaine du 19 au 22 mai 2026 (mar. – ven.)

### Ajouté (billetterie — multi‑tarifs, produit visible)
- **Serveur** (déjà en place dans cette phase) : `Event.ticketTiers`, achat Stripe / démo avec **`tierId`**, quotas par palier **`maxSold`** (voir **`server/utils/ticketTiers.js`**, **`registerTicketsAndPayments`**, **`GET /api/events/:id`** avec **`ticketTiers`** enrichi et **`hasMultipleTicketPrices`**).
- **Mobile organisateur** : wizard **`BookerEventDashboardPage`** — étape 4 : autres paliers (`label`, prix, quota optionnel), envoi **`ticketTiers`** à **`POST /api/booker/events`**, bloc récap étape 5.
- **Mobile public** : **`EventDetailPage`** — pastille prix « **dès X €** » si plusieurs tarifs, choix du palier, **`buyTicket`** / **`createTicketPaymentIntent`** avec le bon **`tierId`** ; **`FeedPage`** — préfixe **dès / from** sur les cartes événement quand **`hasMultipleTicketPrices`**.

### Ajouté (Phase 2 produit — capacité événement plafonnée par le lieu)
- **Prisma** : **`UserVenue.maxCapacity`** (`Int?`, optionnel) — capacité d’accueil max déclarée par le propriétaire du lieu ; **migration** **`20260520103000_user_venue_max_capacity`** (`prisma migrate deploy` / `prisma generate`).
- **Serveur** : **`POST /api/profile/venue`** et **`GET` / **`PUT`** `/api/user/venue/profile`** exposent **`maxCapacity`** ; export RGPD utilisateur enrichi ; **`GET /api/booker/venues`** renvoie **`maxCapacity`** ; **`POST /api/booker/events`** refuse la création si la capacité de l’événement (**`capacity`**, défaut 100 si absent) **`>`** au **`maxCapacity`** du lieu (HTTP **400**, code **`EVENT_CAPACITY_EXCEEDS_VENUE`**).
- **Mobile** : inscription **`RegisterVenuePage`**, édition **`VenueProfileEditPage`** (`maxCapacity`), API **`createVenueProfile`** / **`updateVenueProfile`** ; wizard organisateur (**`BookerEventDashboardPage`**) — texte d’aide sous le champ capacité, préremplissage si le champ est vide et que le lieu a un plafond, validation avant envoi alignée avec l’API.

### Modifié (mobile — profil Prestataire, texte disponibilités)
- **Disponibilités** (`PrestataireGenreAndAvailabilityFields`) : aide sans référence « comme un DJ », formulation centrée prestataire / réservations.

### Corrigé (mobile — bascule de profil : Lieu à nouveau proposé)
- **`SwitchProfilePage`** : la liste des types incluait **Prestataire** mais plus **Lieu (VENUE)** — impossible de repasser sur le profil lieu depuis cet écran. **Lieu** est réintégré **en plus** de Prestataire (ordre : … Organisateur → Lieu → Prestataire).

### Corrigé (serveur — démarrage `userController`)
- **`getUserProfiles`** : accolade / parenthèses manquantes après le champ **`rentalEquipmentInventory`** du profil booker — le fichier ne se chargeait plus (**`SyntaxError: Unexpected token ';'`**), bloquant tout chargement de **`userRoutes`**.

### Ajouté (serveur + mobile — profil Prestataire, MVP)
- **Modèle Prisma `UserPrestataire`** (nom commercial, téléphone pro, champs optionnels ville / pays / bio / visuels, **genres multiples**, **disponibilités**) ; **un seul profil prestataire par utilisateur** (`@@unique([userId])`).
- **API** : **`POST /api/profile/prestataire`** (création), **`PUT /api/prestataire/profile`** (mise à jour) ; **`GET /api/user/profiles`** et **`POST /api/user/switch-profile`** prennent en charge le type **`PRESTATAIRE`**.
- **Signalement** : valeur d’énumération **`PRESTATAIRE_PROFILE`** pour les cibles de signalement.
- **Mobile** : écran d’inscription **`RegisterPrestatairePage`**, entrée **Prestataire** sur **choix du type de compte**, section **Profil** + menu latéral (libellé + accès tableau de bord), méthodes **`api.createPrestataireProfile`** / **`api.updatePrestataireProfile`** ; voir aussi le flux **booking + chat + contrat** dans la sous-section ci-dessous.

### Ajouté (serveur + mobile — événement : location de matériel, catalogue NOX + inventaire booker)
- **Objectif** : à la création d’événement booker, proposer une **liste indicative** de matériel en location — **catalogue NOX par défaut (presets)** + **matériel personnel réutilisable** (inventaire booker persisté), avec sélection pour **cet événement** (presets, lignes organisateur, notes). **Aucune facturation / paiement en ligne** associé à ce bloc dans l’app (modalités hors plateforme, contrats, lieu, prestataires).
- **Prisma** :
  - **`Event.equipmentRental`** (`Json` optionnel) : snapshot après normalisation côté serveur, du type **`{ enabled, presetIds, organizerLines, notes?, snapshotAt }`** (structure exacte alignée sur **`normalizeEquipmentRentalForStorage`**).
  - **`UserBooker.rentalEquipmentInventory`** (`Json` optionnel) : liste d’articles **`{ id?, label, qty }`** pour le catalogue perso du booker.
  - **Migration** : **`20260519200000_event_equipment_rental`** — à appliquer avec **`prisma migrate deploy`** puis **`prisma generate`** selon la politique du projet.
- **Serveur** :
  - Utilitaire **`server/utils/rentalEquipment.js`** : presets serveur (**`PRESET_ITEMS`**), exposition API par langue, **`normalizeEquipmentRentalForStorage`**, **`normalizeBookerRentalInventory`**.
  - Dans **`server/routes/registerBookerOrganizerRoutes.js`** : **`GET /api/booker/rental-equipment-presets`** (query **`lang`** `fr` | `en`) ; **`PUT /api/booker/profile/rental-inventory`** (corps **`{ items }`**) ; **`POST /api/booker/events`** : accepte **`equipmentRental`**, normalise et persiste si non vide ; **`PUT /api/booker/events/:eventId`** : si la clé **`equipmentRental`** est présente dans le body, mise à jour ou **`null`** pour effacer ; **`GET /api/booker/events`** : chaque événement enrichi inclut **`equipmentRental`**.
  - **`GET /api/user/profiles`** ( **`server/controllers/userController.js`** ) : le profil booker expose **`rentalEquipmentInventory`** pour préremplir l’app.
- **Mobile booker** :
  - **`insane-nights-days-mobile/api/endpointsConfig.js`** : constantes **`BOOKER_RENTAL_PRESETS`**, **`BOOKER_RENTAL_INVENTORY`**.
  - **`insane-nights-days-mobile/api/methods/bookerEvents.js`** : **`getRentalEquipmentPresets`**, **`saveBookerRentalInventory`**.
  - **`insane-nights-days-mobile/contexts/EventFormContext.js`** : champs **`equipmentRentalEnabled`**, **`equipmentRentalPresetIds`**, **`equipmentRentalOrganizerLines`**, **`equipmentRentalNotes`** (+ reset avec le formulaire).
  - **`insane-nights-days-mobile/screens/dashboard/BookerEventDashboardPage.js`** : chargement presets + inventaire après levée du brouillon (**`draftGate`**) ; **étape détails** — toggle activation, puces presets NOX, édition du catalogue perso + bouton enregistrer le profil, chips pour inclure le matériel sur l’événement, lignes ponctuelles « cet événement seulement », notes ; **`handleCreateEvent`** envoie **`equipmentRental`** lorsque activé ; **étape récap** : section « Location de matériel » texte via **`summarizeEquipmentRentalBlurb`** + rappel non contractuel ; styles dédiés (toggle, puces, catalogue).

### Ajouté (serveur + mobile — événement : prestataire optionnel, chat, contrat)
- **Prisma** : lien **`EventPrestataire`** (comme lieu / DJ) ; messages et contrats dédiés ; migration **`20260519140000_event_prestataire_chat_contract`** (à appliquer avec **`prisma migrate deploy`** / politique du projet).
- **API** : sélection **`GET /api/booker/available-prestataires`**, rattachement à l’événement, **chat** `event-prestataire`, **contrat** (brouillon, envoi, contre-proposition, acceptation, PDF / e-mail) et côté prestataire **bookings** + **invitations**.
- **Mobile booker** : flux type DJ (**`SelectPrestatairePage`** optionnel, ligne sur la carte événement, chat + contrat dans **`BookerDashboardPage`**).
- **Mobile prestataire** : **`PrestataireDashboardPage`** — liste des bookings, modal **chat & contrat**, contre-proposition avec les mêmes champs **`ContractDraftEditorFields`** (mode DJ) + modales modalités de paiement / annulation / fin de prestation.

### Modifié (profil Prestataire — genres multiples & disponibilités type DJ)
- **Schéma** : **`prestationGenres`** (`String[]`, au moins une valeur côté API), **`availableDays`** (JSON comme DJ), **`availableStatus`** ; suppression du champ texte unique **`serviceType`** après migration **`20260519180000_prestataire_genres_availability`**.
- **API** : **`GET /api/booker/available-prestataires`** filtre **`availableStatus === true`** ; invitation **`POST …/prestataires`** refusée si le prestataire est **indisponible** ; rétrocompat corps **`serviceType`** (une chaîne) acceptée comme **un seul** genre.
- **Mobile** : composant **`PrestataireGenreAndAvailabilityFields`** ; inscription + édition depuis **`PrestataireDashboardPage`** ; PDF contrat : ligne **« Genres / prestations »**.

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
