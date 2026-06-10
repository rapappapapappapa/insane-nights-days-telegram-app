# Améliorations à prévoir — NOX

**Ordre de travail conseillé :** commence par **tout ce qui impose un nouveau build App Store / Play (`[Rebuild EAS]`)**. Les cycles sont en général **les plus longs** (bundle EAS, empreintes Android, revue Apple / Google, diffusion aux utilisateurs). En **regroupant plusieurs chantiers rebuild dans le même binaire**, tu évites de **subir plusieurs fois cette même durée**.

Ensuite seulement les chantiers **`[souvent OTA]`** (livraisons plus rapides via JS + API tant que le **runtime** reste compatible — vérifier **fingerprint** Expo Updates si besoin).

---

## Phase 1 — Rebuild (**à faire en premier** · `[Rebuild EAS]`)

À **regrouper dans un même build** quand c’est possible.

- [x] **Sign in avec Apple** (**Google** déjà : env mobile + variables serveur). *Capacité Xcode / App Store + `APPLE_IOS_BUNDLE_ID` si ≠ défaut.*

- [x] **Synchro agenda pro** (Google / Apple Calendar) — permissions + **expo-calendar** (ou équivalent) ; **idéalement le même milestone** que **Sign in Apple**.

- [x] **Lien Spotify / SoundCloud → lecteur dans l’app (embed + WebView)** sur le **profil DJ** — **pas de SDK natif**, donc **pas de rebuild** supplémentaire (souvent **OTA**).

- [ ] *(option, **rebuild** seulement si natif)* **Lecteurs / SDK média natifs** — **uniquement si** tu abandonnes l’embed pour un **SDK** (contrôle OS, fond d’écran, etc.) ; **YouTube** idem (**WebView** = OTA).

- [x] **Profil « prestataire » (MVP)** — modèle **`UserPrestataire`**, API, switch **`PRESTATAIRE`**, inscription + dashboard, **wizard booker / chat / contrat** en place ; périmètre métier élargi **à trancher** (devis détaillés, etc.).

- [ ] **`[à trancher]`** **Profil « prestataire » — périmètre métier complet** (rôles, devis, chat dédié, etc.) ; la base données + routes permettent d’itérer en **OTA** sans rebuild.

---

## Étiquettes (rappel)

| Repère | Lecture |
|--------|--------|
| **`[Rebuild EAS]`** | Nouveau **binaire** ⇒ **démarrer en premier**. |
| **`[souvent OTA]`** | Surtout **JS + API** ; **Expo Updates** si runtime inchangé. |
| **`[à trancher]`** | POC : faut-il du **natif** ou non. |

**Nuance** — un **nouveau type de profil** sans nouveau module natif reste très souvent **OTA**, pas forcément Phase 1.

---

## Phase 2 — Priorité produit forte (`[souvent OTA]`)

- [x] Billetterie **multi-tarifs (MVP)** — paliers à la création événement, achat avec **`tierId`**, feed / détail « dès X € », **`tierLabel`** sur Mes tickets. *Reste : édition des tarifs après création.*

- [x] Billetterie **phases** de vente (early bird → regular → last minute) — **`saleStart` / `saleEnd`** par palier, refus achat hors fenêtre (**`TIER_NOT_ON_SALE`**), wizard + détail événement.

- [x] **TTC / commission Nox** (indicatif) — prix saisis TTC, récap wizard **HT / TVA 20 % / commission 10 %** déduite du reversement (**`ticketPricingUtils.js`**).

- [ ] Places **hors Nox** sans décompte stock interne.

- [x] **Capacité** événement **plafonnée** par **`UserVenue.maxCapacity`** lorsque le lieu la renseigne (API **`POST /api/booker/events`**, wizard organisateur).

- [x] **Plusieurs DJs** à la création + **fix** réhydratation **`djSlots`** au retour du sélecteur DJ. *Reste : modèle **n-n** / tests de bout en bout si besoin.*

- [ ] **Lieu secret** — révélation adresse **à partir d’une date**.

- [x] **`EventsPage`** : affichage **« dès X € »** aligné sur le feed (multi-tarifs) + filtre **À venir / Passés / Tous** (mobile).

- [x] **`EventDetailPage`** — hooks achat + groupes, styles extraits (~770 lignes page).

- [x] **`FeedPage`** — hooks liste / engagement / signalement, cartes feed, styles extraits (~280 lignes page).

---

## Phase 3 — Priorité moyenne (`[souvent OTA]`)

- [ ] **Type d’événement** (club, festival, privé, bar, concert…).

- [ ] **Lieu externe** (nom + adresse).

- [ ] **Fiches lieu — deals possibles.**

- [ ] **Lecteurs média** *(WebView / URLs — pas de SDK natif)*.

- [ ] **Prestataires** dans le wizard (photo, vidéaste, VDJ…) ; type profil « prestataire » — voir **Phase 1** si ajout **natif**.

- [ ] **Récap final** + **modalités** chronologiques / prestations / prix.

- [ ] **Location matériel** — avancé (cases, stock) ; **MVP wizard + snapshot événement** déjà livré (voir CHANGELOG).

- [ ] **Agenda matériel** (dispo / créneaux).

- [ ] **Visuels événement — format carré.**

- [ ] **Carrousel / slides** événement.

- [ ] **Sortie anticipée** + **revente** + **liste d’attente**.

---

## Phase 4 — Plus tard / chantiers lourds

- [ ] **Dossier médias post-événement** *(souvent lourd **back + stockage**)*.

---

## Dette technique

- [x] **Serveur modularisé** — routes booker / feed / chat / media découpées ; **`index.js`** allégé ; **`prisma migrate deploy`** au démarrage Railway (plus de **`db push --accept-data-loss`**).

- [x] **Dashboard DJ** — sections + hooks (`useDjProfile`, `useDjBookings`, `useDjMessaging`) + modales (`DjChatModal`, `DjContractModals`, `DjMediaModals`) ; page **~545** lignes ; fix bundle EAS.

- [x] **Dashboard booker** — **`BookerDashboardPage.js`** (~500 lignes) : hooks + **`components/bookerDashboard/`** + styles dédiés.

- [x] **Wizard événement** — **`BookerEventDashboardPage.js`** (~210 lignes) : **`useBookerEventWizard`** (+ **`useBookerEventWizardDraft`**, **`useBookerEventWizardRental`**) + 5 étapes **`bookerEventWizard/sections/`**.

- [x] **Dashboard prestataire** — **`PrestataireDashboardPage.js`** (~170 lignes) : hooks + **`components/prestataireDashboard/`**.

- [x] **Dashboard lieu** — **`VenueDashboardPage.js`** (~185 lignes) : onglets **`venueDashboard/sections/`** + **`useVenueDashboard`**.

- [x] **Feed mobile** — **`FeedPage.js`** (~280 lignes) : **`useFeedList`**, **`useFeedPostEngagement`**, **`useFeedReport`** + **`components/feed/`**.

- [x] **Assainissement post-audit** — **`HomePage.js`** (~715 lignes, hooks feed partagés) ; styles extraits (`DjProfilePage`, `WelcomePage`, `ProfilePage`, `LoginPage`) ; **`userController.js`** découpé en 5 domaines (`controllers/user/`) ; `console.log` de debug supprimés ; `Alert` informatifs → Toast ; mocks / `formatDate` dédupliqués.

- [x] **Tests serveur (base)** — **`npm test`** : validation, **`ticketTiers`**, **`contractHelpers`**, **`ratingCalculations`** (17 tests) ; **CI GitHub Actions** sur push/PR.

- [x] Billetterie — tests **phases** (fenêtres de vente, 22 tests serveur). *Reste : édition **`ticketTiers`** après création ; reversement réel avec commission (quand payout organisateur).* 

- [ ] Multi-DJs — tests E2E + migrations **n-n** si le produit l’exige.

- [ ] **Scroll safe area** — généraliser **`useSafeAreaInsets`** sur les longs **`ScrollView`** (dashboards, wizards) comme **Mes profils**.

---

## UX / accessibilité

- [ ] Wizard : clarté infos vs tarifs, **TTC / commission**, message explicite **capacité > lieu** ✓ *(refus API + aide sous le champ ; à compléter avec billetterie)*.

- [ ] Lieu secret : visibilité de l’adresse ; états accessibles.

---

## Notes libres

*(captures, tickets, URLs)*

-

---

*Dernière mise à jour : 5 juin 2026 — modularisation serveur + dashboards (DJ, booker, wizard, lieu), multi-tarifs MVP, CI tests.*
