# Écrans app sans maquette Figma

Inventaire des **écrans présents dans l’application** qui **n’ont pas encore de design Figma** (pas de planche HD dans le pack `docs/mobile/design-figma/`).

Ce document est **côté design à produire**, pas un backlog de code.

**Référence maquettes existantes** : [DESIGN_FIGMA_REFERENCE.md](./DESIGN_FIGMA_REFERENCE.md) (14 planches PNG).

---

## Légende

| Symbole | Signification |
|---------|----------------|
| **❌** | Aucune maquette Figma — écran codé, UI improvisée (legacy ou tokens NOX) |
| **📐** | Cité dans le **wireframe** global (`05-wireframe-overview`) seulement — pas de planche HD dédiée |
| **🟡** | Couvert **partiellement** par une planche voisine (même flow, autre rôle ou variante) |
| **✅** | Maquette HD dans le pack — *hors scope de ce fichier* |

Les routes **redirect** (`home`, `welcome`, `feed`, `venueDashboard`) ne sont pas listées : elles n’affichent pas d’UI propre.

---

## Synthèse

| Catégorie | Nb écrans sans HD | Commentaire |
|-----------|-------------------|-------------|
| Pro DJ / Booker / Prestataire | **8** | Plus gros trou — tout le parcours pro |
| Communauté (compléments) | **6** | Tickets, compte, checkout, etc. |
| Profils publics & listes | **7** | Shell app sans planche profil HD |
| Auth (compléments) | **6** | Login + inscriptions par rôle |
| Lieux (compléments) | **1** | Édition profil legacy |
| Wizards & sélection booker | **4** | Création event, pick DJ/lieu/prestataire |
| Staff / scan (communauté) | **3** | Wireframe staff seulement |
| Transversal / admin | **5** | Légal, admin, tutoriel… |
| **Total** | **~40 écrans** | À maquetter ou expliciter « hors scope design » |

---

## 1. Pro — DJ, Organisateur, Prestataire

**Aucune planche ARTIST / ORGANIZER / PRESTATAIRE dans le pack Figma actuel.**

| Route app | Fichier | Maquette Figma | Notes pour le designer |
|-----------|---------|----------------|------------------------|
| `proHome` | `screens/pro/ProHomePage.js` | ❌ | Home pro (fil events + raccourcis) — calqué wireframe communauté |
| `events` | `screens/events/EventsPage.js` | 🟡 | Discover pro ; COMMUNITY/VENUE redirigent vers écrans Figma |
| `djDashboard` | `screens/dashboard/DjDashboardPage.js` | ❌ | Dashboard complet (profil, tarifs, bookings, contrats, médias…) |
| `bookerDashboard` | `screens/dashboard/BookerDashboardPage.js` | ❌ | Dashboard orga (profil, mes events, messages) |
| `bookerEventDashboard` | `screens/dashboard/BookerEventDashboardPage.js` | ❌ | Wizard création / édition event |
| `prestataireDashboard` | `screens/dashboard/PrestataireDashboardPage.js` | ❌ | MVP prestataire — hors périmètre maquettes actuelles |
| `createFeedPost` | `screens/feed/CreateFeedPostPage.js` | ❌ | Composer un post (DJ/Booker depuis proHome) |
| `bookerFriends` | `screens/profiles/BookerFriendsPage.js` | ❌ | Amis côté booker (staff events) |

---

## 2. Communauté — écrans app sans planche HD

Maquettes **07**, **08**, **06** couvrent home, discover, détail event, onboarding, notifs — mais pas tout le parcours.

| Route app | Fichier | Maquette Figma | Notes pour le designer |
|-----------|---------|----------------|------------------------|
| `tickets` | `screens/events/TicketsPage.js` | 📐 | Wireframe 05 « Mes billets » + QR — **pas de hi-fi** |
| `purchases` | `screens/purchases/PurchasesPage.js` | 📐 | Wireframe « Historique d’achat » — pas de hi-fi |
| `eventDetail` | `screens/events/EventDetailPage.js` | ❌ | Checkout billet (`checkoutOnly`) — pas d’écran achat Figma |
| `purchaseSuccess` | `screens/purchases/PurchaseSuccessPage.js` | ❌ | Confirmation après paiement Stripe |
| `profile` | `screens/profiles/ProfilePage.js` | ❌ | Hub **Compte** (billets, notifs, switch, légal) — calqué réglages Lieux |
| `communityMyProfile` | `screens/community/CommunityMyProfilePage.js` | 📐 | Wireframe 05 Profile — shell OK, **onglet Mur** sans design dédié |
| `communityProfile` | `screens/profiles/CommunityProfilePage.js` | 📐 | Profil public / ami — idem |
| `communityProfileEdit` | `screens/profiles/CommunityProfileEditPage.js` | ❌ | Édition profil communauté |
| `communityFriends` | `screens/profiles/CommunityFriendsPage.js` | 📐 | Wireframe Friends — pas planche HD |
| `rateEvent` | `screens/events/RateEventPage.js` | ❌ | Notation post-event |

**Sous-écrans / onglets codés sans frame Figma dédiée**

| Zone dans l’app | Maquette Figma | Notes |
|-----------------|----------------|-------|
| Profil → onglet **Mur** (`CommunityProfileShell`) | ❌ | Placeholder ; wireframe mentionne WALL sans planche |
| Profil → **Will attend** | ❌ | Sous-onglet Events — non designé |
| Home → onglet **Publications** | 🟡 | Proche feed wireframe, pas d’écran Posts isolé |
| **QR billet plein écran** (modal dans `tickets`) | 📐 | Wireframe staff/ticket QR — pas hi-fi wallet |

---

## 3. Profils publics & annuaires

Labels Figma **03_Artist / Venue / Collective Profile** cités dans la doc — **pas de planche HD** dans le pack.

| Route app | Fichier | Maquette Figma | Notes pour le designer |
|-----------|---------|----------------|------------------------|
| `djProfile` | `screens/profiles/DjProfilePage.js` | ❌ | Profil public DJ (follow, médias, events) |
| `bookerProfile` | `screens/profiles/BookerProfilePage.js` | ❌ | Profil public organisateur |
| `venueProfile` | `screens/profiles/VenueProfilePage.js` | ❌ | Profil public lieu (+ sélection booker) |
| `djList` | `screens/profiles/DjListPage.js` | ❌ | Annuaire DJs |
| `venueList` | `screens/profiles/VenueListPage.js` | ❌ | Annuaire lieux |
| `djRatings` | `screens/profiles/DjRatingsPage.js` | ❌ | Avis DJ |
| `venueRatings` | `screens/profiles/VenueRatingsPage.js` | ❌ | Avis lieu |
| `ranking` | `screens/ranking/RankingPage.js` | ❌ | Classement DJs |

---

## 4. Auth — écrans sans maquette dédiée

Planches **03** et **04** couvrent splash, slides, sign up générique, OTP, choix rôle — pas les écrans ci-dessous.

| Route app | Fichier | Maquette Figma | Notes pour le designer |
|-----------|---------|----------------|------------------------|
| `login` | `screens/auth/LoginPage.js` | ❌ | Connexion email / pseudo — pas de planche |
| `registerCommunity` | `screens/auth/RegisterCommunityPage.js` | 🟡 | Proche Sign Up 03/04, formulaire allongé |
| `registerDj` | `screens/auth/RegisterDjPage.js` | ❌ | Inscription DJ |
| `registerBooker` | `screens/auth/RegisterBookerPage.js` | ❌ | Inscription organisateur |
| `registerVenue` | `screens/auth/RegisterVenuePage.js` | ❌ | Inscription lieu |
| `registerPrestataire` | `screens/auth/RegisterPrestatairePage.js` | ❌ | Inscription prestataire (hors grille rôle Figma) |
| `switchProfile` | `screens/profile-management/SwitchProfilePage.js` | ❌ | Bascule multi-profils |

**✅ Déjà designés (ne pas redemander)** : `splash`, `onboarding`, `authVerifyEmail`, `accountType`.

---

## 5. Lieux — écrans sans maquette (compléments)

La stack **`lieux*`** est largement couverte (planches **09–14**). Exception :

| Route app | Fichier | Maquette Figma | Notes pour le designer |
|-----------|---------|----------------|------------------------|
| `venueProfileEdit` | `screens/profiles/VenueProfileEditPage.js` | 🟡 | Sous-écran depuis `lieuxSettings` — pas de frame isolée |

**✅ Déjà designés** : `lieuxDashboard`, `lieuxProfil`, `lieuxMedia`, `lieuxFeed`, `lieuxAvailability`, `lieuxEvents`, `lieuxEventDetail`, `lieuxRequestDetail`, `lieuxDemandes`, `lieuxStaff`, `lieuxScanner`, `lieuxNotifications`, `lieuxSettings`, `lieuxBookingChat`.

**🚫 Retiré de l’app (ne pas maquetter)** : création event par le lieu (`08_Create_Event` — décision produit).

---

## 6. Booker — wizards & sélection

| Route app | Fichier | Maquette Figma | Notes pour le designer |
|-----------|---------|----------------|------------------------|
| `selectDj` | `screens/selection/SelectDjPage.js` | ❌ | Choix DJ dans flow event |
| `selectVenue` | `screens/selection/SelectVenuePage.js` | ❌ | Choix lieu |
| `selectPrestataire` | `screens/selection/SelectPrestatairePage.js` | ❌ | Choix prestataire |

---

## 7. Staff & scan (profil communauté)

Wireframe **05** montre scanner + QR — pas de planches HD séparées.

| Route app | Fichier | Maquette Figma | Notes pour le designer |
|-----------|---------|----------------|------------------------|
| `staffEvents` | `screens/events/StaffEventsPage.js` | 📐 | Liste events où l’user est staff |
| `scanTicket` | `screens/events/ScanTicketPage.js` | 📐 | Scanner QR (communauté / legacy) |
| `eventStaff` | `screens/events/EventStaffPage.js` | 📐 | Gestion staff d’un event |

*(Profil **VENUE** : `lieuxScanner` / `lieuxStaff` — **✅ designés** planche 11.)*

---

## 8. Transversal — hors parcours NOX Figma

Écrans produit / store **sans attente maquette** (à valider avec l’équipe design).

| Route app | Fichier | Maquette Figma | Notes |
|-----------|---------|----------------|-------|
| `legal` | `screens/legal/LegalPage.js` | ❌ | CGU, CGV, mentions, privacy |
| `admin` | `screens/dashboard/AdminPage.js` | ❌ | Back-office admin |
| `tutorial` | `screens/tutorial/TutorialPage.js` | ❌ | Tutoriel legacy |

---

## 9. Brief design — priorités suggérées

Ordre recommandé pour **Figma** (écrans app existants, pas encore designés) :

### P0 — Débloquer la perception « app pro »

1. **`proHome`** — Home Artiste / Organisateur (2 variantes ou 1 adaptive)  
2. **`djDashboard`** — Dashboard DJ (navigation sections + états)  
3. **`bookerDashboard`** + **`bookerEventDashboard`** — Dashboard orga + wizard event  

### P1 — Parcours communauté monétisable

4. **`tickets`** + **QR plein écran** — hi-fi wallet (au-delà wireframe 05)  
5. **`eventDetail` checkout** — écran achat billet NOX  
6. **`profile`** — Hub compte communauté (settings dédiés, pas copie Lieux)  
7. **`purchaseSuccess`** — Confirmation achat  

### P2 — Social & profils

8. **`communityProfile`** / **Mur** — onglet wall + repost  
9. **`djProfile`**, **`bookerProfile`**, **`venueProfile`** — planches HD profils publics  
10. **`registerDj` / `registerBooker` / `registerVenue`** — alignement Sign Up Figma  

### P3 — Reste

11. `login`, `switchProfile`, `createFeedPost`, staff/scan communauté, listes, ranking, prestataire…

---

## 10. Écrans app **avec** maquette Figma (rappel)

Pour éviter les doublons côté design — **déjà couverts** par le pack :

`splash` · `onboarding` · `authVerifyEmail` · `accountType` · `communityOnboarding` · `communityHome` · `communityDiscover` · `communityEventDetail` · `communityPushOptIn` · `notifications` · `lieuxDashboard` · `lieuxProfil` · `lieuxMedia` · `lieuxFeed` · `lieuxAvailability` · `lieuxEvents` · `lieuxEventDetail` · `lieuxRequestDetail` · `lieuxDemandes` · `lieuxStaff` · `lieuxScanner` · `lieuxNotifications` · `lieuxSettings` · `lieuxBookingChat`

---

*Dernière mise à jour : 4 août 2026 — routes `App.js` post Phase D/E (`proHome`).*

