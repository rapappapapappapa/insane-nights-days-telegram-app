# Écrans app sans maquette HD

Inventaire des **écrans présents dans l’application** (`nox-mobile/screens/`) qui **n’ont pas encore de planche HD** dans le pack local `docs/mobile/design-figma/` (21 fichiers PNG/JPG).

Ce document est **côté design à produire**, pas un backlog de code.

**Référence maquettes** : [DESIGN_FIGMA_REFERENCE.md](./DESIGN_FIGMA_REFERENCE.md) · écarts code : [ECARTS_FIGMA_VS_APP.md](./ECARTS_FIGMA_VS_APP.md).

---

## Légende

| Symbole | Signification |
|---------|----------------|
| **❌** | Aucune maquette HD — UI improvisée (tokens NOX) |
| **📐** | Cité dans le wireframe `05` seulement |
| **🟡** | Couvert partiellement par une planche voisine |
| **✅** | Maquette HD dans le pack — *hors scope de ce fichier* |

Les routes **redirect** (`home`, `welcome`, `feed`, `venueDashboard`, `events` selon rôle) ne sont pas listées.

---

## Synthèse (24 nov. 2026)

| Catégorie | Nb sans HD | Commentaire |
|-----------|------------|-------------|
| Pro DJ / Booker / Prestataire | **~8** | Plus gros trou design |
| Communauté (compléments) | **~4** | Compte, checkout, succès achat, édition profil |
| Profils publics & listes | **~7** | Shell sans planche profil HD |
| Auth (compléments) | **~5** | Login + inscriptions par rôle |
| Wizards booker | **~3** | Pick DJ / lieu / prestataire |
| Staff scan communauté | **~3** | Wireframe ; lieux a le HD |
| Transversal | **~3** | Légal, admin, tutoriel |
| **Billets / agenda / fil (15–21)** | **0** | ✅ couverts par le pack JPG |

---

## 1. Pro — DJ, Organisateur, Prestataire

**Aucune planche ARTIST / ORGANIZER / PRESTATAIRE dans `design-figma/`.**

| Route | Fichier | Maquette | Notes |
|-------|---------|----------|-------|
| `proHome` | `screens/pro/ProHomePage.js` | ❌ | Accueil pro (souvent redirigé DJ → dashboard) |
| `djDashboard` | `screens/dashboard/DjDashboardPage.js` | ❌ | Hub grille |
| `bookerDashboard` | `screens/dashboard/BookerDashboardPage.js` | ❌ | |
| `bookerEventDashboard` | `screens/dashboard/BookerEventDashboardPage.js` | ❌ | Wizard event |
| `prestataireDashboard` | `screens/dashboard/PrestataireDashboardPage.js` | ❌ | MVP |
| `createFeedPost` | `screens/feed/CreateFeedPostPage.js` | ❌ | |
| `bookerFriends` | `screens/profiles/BookerFriendsPage.js` | ❌ | |

---

## 2. Communauté — sans planche HD dédiée

**Déjà couverts (ne pas redemander)** : home/fil **15**, agenda **16**, billets **17**, scroll **18**, notifs **19**, historique **20**, détail billet **21**, onboarding **06**, home/discover classiques **07**, notifs classiques **08**.

| Route | Fichier | Maquette | Notes |
|-------|---------|----------|-------|
| `eventDetail` (checkout) | `screens/events/EventDetailPage.js` | ❌ | Flow `checkoutOnly` — pas de planche achat |
| `purchaseSuccess` | `screens/purchases/PurchaseSuccessPage.js` | ❌ | |
| `profile` | `screens/profiles/ProfilePage.js` | ❌ | Hub compte |
| `communityProfileEdit` | `screens/profiles/CommunityProfileEditPage.js` | ❌ | |
| `rateEvent` | `screens/events/RateEventPage.js` | ❌ | |
| `purchases` | `screens/purchases/PurchasesPage.js` | 🟡 | Historique aussi dans **20** via `tickets` |

**✅ Avec maquette** : `tickets`, `ticketDetail`, agenda, mur / Prévus (shell profil), `notifications`, `communityHome`, etc.

---

## 3. Profils publics & annuaires

| Route | Fichier | Maquette |
|-------|---------|----------|
| `djProfile` | `screens/profiles/DjProfilePage.js` | ❌ |
| `bookerProfile` | `screens/profiles/BookerProfilePage.js` | ❌ |
| `venueProfile` | `screens/profiles/VenueProfilePage.js` | ❌ |
| `djList` / `venueList` | listes | ❌ |
| `djRatings` / `venueRatings` | avis | ❌ |
| `ranking` | `screens/ranking/RankingPage.js` | ❌ |

---

## 4. Auth — sans planche dédiée

| Route | Maquette |
|-------|----------|
| `login` | ❌ |
| `registerDj` / `registerBooker` / `registerVenue` / `registerPrestataire` | ❌ / 🟡 proche Sign Up 03–04 |
| `registerCommunity` | 🟡 |
| `switchProfile` | ❌ |

**✅** : `splash`, `onboarding`, `authVerifyEmail`, `accountType`.

---

## 5. Lieux — compléments

Stack **`lieux*`** largement couverte (09–14). Exception :

| Route | Maquette |
|-------|----------|
| `venueProfileEdit` | 🟡 sous-écran réglages |

**🚫 Ne pas maquetter** : création d’event par le lieu.

---

## 6. Wizards booker & staff communauté

| Route | Maquette |
|-------|----------|
| `selectDj` / `selectVenue` / `selectPrestataire` | ❌ |
| `staffEvents` / `scanTicket` / `eventStaff` | 📐 |

---

## 7. Transversal

| Route | Notes |
|-------|-------|
| `legal` | Store — pas d’attente HD |
| `admin` | Admin only |
| `tutorial` | Guide NOX |

---

## 8. Brief design — priorités

### P0
1. Home / dashboard **Artiste (DJ)**  
2. Home / dashboard **Organisateur** + wizard event  

### P1
3. **Checkout billet** NOX  
4. Hub **compte** communauté  
5. Confirmation **achat**  

### P2
6. Profils publics HD (DJ, Venue, Booker, Collectif)  
7. Inscriptions par rôle alignées Sign Up  

### P3
8. Login, switch profil, prestataire, staff communauté, ranking…

---

## 9. Déjà couverts par le pack (rappel)

`splash` · `onboarding` · `authVerifyEmail` · `accountType` · `communityOnboarding` · `communityHome` · agenda · `communityDiscover` · `communityEventDetail` · `communityPushOptIn` · `notifications` · `tickets` · `ticketDetail` · `lieuxDashboard` · `lieuxProfil` · `lieuxMedia` · `lieuxFeed` · `lieuxAvailability` · `lieuxEvents` · `lieuxEventDetail` · `lieuxRequestDetail` · `lieuxDemandes` · `lieuxStaff` · `lieuxScanner` · `lieuxNotifications` · `lieuxSettings` · `lieuxBookingChat`

---

*Dernière mise à jour : 24 novembre 2026 — pack 15–21 et livraisons oct.–nov. prises en compte ; source code = `nox-mobile/screens/`.*
