# Écarts Figma ↔ application NOX

Document de référence : **ce qui manque** par rapport aux maquettes versionnées et **ce que l’app expose sans maquette Figma**.

**Sources** : `docs/mobile/design-figma/` (14 planches PNG — voir [DESIGN_FIGMA_REFERENCE.md](./DESIGN_FIGMA_REFERENCE.md)), wireframe `05-wireframe-overview`, inventaire routes `App.js` (août 2026).

**Légende implémentation**

| Symbole | Signification |
|---------|----------------|
| ✅ | Aligné Figma (UI + parcours principal) |
| 🟡 | Écran présent, écart visuel ou fonctionnel notable |
| ❌ | Prévu Figma / wireframe, non implémenté |
| ➖ | Pas de maquette HD dans le pack actuel |
| 🚫 | Volontairement absent (décision produit) |

---

## 1. Synthèse rapide

### Ce que le pack Figma couvre bien

- **Design system** (composants, couleurs, typo, nav basse, NX radial)
- **Auth globale** : splash, onboarding slides, sign up, OTP, choix rôle 2×2
- **Communauté** : onboarding 8 étapes, home/discover, détail event, notifs + opt-in push
- **Lieux** : dashboard, profil, médias, feed (visuel), dispos, events, staff, scanner, demandes, détail event validé, chat booking, réglages, notifs

### Gros trous côté design (pas de planche HD)

| Zone | Impact |
|------|--------|
| **Home / dashboard DJ (Artiste)** | `proHome` + `djDashboard` = legacy skinné NOX |
| **Home / dashboard Organisateur** | `proHome` + `bookerDashboard` + wizard `bookerEventDashboard` |
| **Prestataire** | Hors maquettes Figma actuelles |
| **Profils publics** DJ / Lieu / Booker / Collectif | Shell NOX sans planche HD dédiée |
| **Hub compte communauté** | `ProfilePage` calqué sur réglages Lieux |
| **Checkout billet** | `eventDetail?checkoutOnly` — pas d’écran NOX dédié |
| **Tickets wallet hi-fi + QR plein écran** | Wireframe seulement |
| **Mur / repost profil** | Wireframe 05 — feature absente |
| **Apple / Google Wallet** | Non branché |

### Écrans Figma présents mais implémentation incomplète

| Écran Figma | Écart principal |
|-------------|-----------------|
| `11_Feed` (Lieux) | UI OK, **pas d’API posts lieu** (dérivé bookings) |
| `10_Media` (Lieux) | Lecture OK, **pas d’upload** depuis l’écran |
| `09_Profil` Lieux — surface / sound | Affiché **« — »** (pas de champs API) |
| `13_Detail_Demande` | Pills footer partiellement alignées Figma 11 |
| `08_Create_Event` Lieu | 🚫 **Retiré** — seuls les orgas créent les events |
| `08_Notification` Lieux | UI typée, contenu surtout **dérivé bookings** |
| Profil communauté — onglet **Wall** | Redirige vers Home Publications, **pas de mur dédié** |
| Profil — **Will attend** | Onglet vide (placeholder) |
| Wireframe — **bookmarks / stories** | Non implémentés (P3 ou retirés) |
| Inscriptions `registerDj/Booker/Venue/…` | Thème partiel vs Sign Up Figma |

---

## 2. Inventaire par zone

### 2.1 Design system & navigation

| Figma | Route app | Statut | Écart |
|-------|-----------|--------|-------|
| Composants, tokens | `components/nox/*` | 🟡 | Couleur primaire code `#2852E8` (Figma doc cite encore `#4DA3FF` / `#2F54EB`) |
| Bottom nav Lieux | `NoxLieuxBottomNav` | ✅ | — |
| Nav radiale NX | `NoxRadialNav` | ✅ | Logo NOX centre (livré juil.) |
| Drawer MENU secours | `DrawerContent` | ➖ | Hors maquettes, conservé produit |

---

### 2.2 Auth & boot (tous profils)

| Figma | Route app | Statut | Écart |
|-------|-----------|--------|-------|
| `01_SPLASH` | `splash` | ✅ | — |
| Slides `02–04` onboarding | `onboarding` | ✅ | — |
| `AUTH / Sign Up` | `register*` (×5 rôles) | 🟡 | 5 formulaires séparés vs un seul écran Figma ; skin NOX partiel sur DJ/Booker/Venue/Prestataire |
| `AUTH / Verif` OTP | `authVerifyEmail` | ✅ | + « Continuer sans valider » (hors Figma, produit) |
| `ONB / Role Selection` | `accountType` | ✅ | + tuile **Prestataire** (hors Figma) |
| Login | `login` | 🟡 | Écran existant, pas de planche dédiée dans le pack |
| — | `switchProfile` | ➖ | Multi-profils, pas de maquette |

---

### 2.3 Communauté (`COMMUNITY`)

| Figma / wireframe | Route app | Statut | Écart |
|-------------------|-----------|--------|-------|
| Onboarding 8 étapes | `communityOnboarding` | ✅ | Suggestions artistes/lieux via API (plus mock Figma) |
| Home Events feed | `communityHome` (onglet Events) | ✅ | — |
| Following feed | `communityHome` + `CommunityFeedStream` | ✅ | — |
| Publications / posts | `communityHome` (onglet Posts) | 🟡 | Fil pro + posts ; pas de **stories bar** wireframe |
| Discover Events / DJs | `communityDiscover` | ✅ | — |
| Event detail | `communityEventDetail` | ✅ | Achat → `eventDetail` checkout (pas maquette checkout) |
| `02_Notifications` | `notifications` | 🟡 | Skin Figma ; deep links typés partiels |
| Opt-in push | `communityPushOptIn` | ✅ | — |
| Wireframe **04_Tickets** | `tickets` | 🟡 | Wallet **inspiré** wireframe, pas hi-fi ; pas QR plein écran dédié |
| Wireframe **05_Profile** Overview / Events / Friends | `communityMyProfile`, `communityProfile`, `CommunityProfileShell` | 🟡 | Overview + Events + Friends OK |
| Wireframe **05_Profile — Wall** | onglet `wall` | ❌ | Placeholder + lien Home ; **pas de mur / repost** |
| Wireframe **05_Profile — Will attend** | sous-onglet Events | ❌ | Liste vide, message « bientôt » |
| Hub compte / réglages | `profile` | ➖ | Calqué `08_Reglage` Lieux, pas maquette compte |
| Amis | `communityFriends` | 🟡 | Accessible drawer ; pas entrée NX dédiée Figma |
| Édition profil | `communityProfileEdit` | ➖ | Pas de planche HD |
| Checkout / achat | `eventDetail` (`checkoutOnly`) | ➖ | Legacy fonctionnel, UI mixte NOX |
| Succès achat | `purchaseSuccess` | ➖ | Pas de maquette |
| Historique achats | `purchases` | ➖ | Wireframe tickets seulement |
| Noter event | `rateEvent` | ➖ | — |
| Staff / scan (communauté) | `staffEvents`, `scanTicket`, `eventStaff` | 🟡 | Wireframe staff ; UI legacy partielle |
| Classement DJs | `ranking` | ➖ | Legacy, hors pack |
| Listes DJ / lieux | `djList`, `venueList` | ➖ | — |

**Features wireframe non livrées (communauté)**  
- ❌ Bookmarks événements  
- ❌ Stories bar home  
- ❌ Repost / partage profil  
- ❌ Add to **Apple / Google Wallet**  
- ❌ Écran checkout NOX unifié (`eventCheckout`)

---

### 2.4 Lieux (`VENUE`)

| Figma | Route app | Statut | Écart |
|-------|-----------|--------|-------|
| `08_Dashboard` | `lieuxDashboard` | ✅ | Stats dashboard alignées Figma juil. |
| `09_Profil` | `lieuxProfil` | 🟡 | Surface + sound system en **« — »** (API manquante) |
| `10_Media` | `lieuxMedia` | 🟡 | **Pas d’upload** ; chevron retour ajouté |
| `11_Feed` | `lieuxFeed` | 🟡 | Cartes dérivées **bookings**, pas feed posts VENUE |
| `14_Availability` | `lieuxAvailability` | ✅ | Calendrier + bloquer dates |
| `12_Events` | `lieuxEvents` | ✅ | Brouillons = events orga (pas création lieu) |
| `13_Detail_Event validé` | `lieuxEventDetail` | ✅ | — |
| `13_Detail_Demande` | `lieuxRequestDetail` | 🟡 | Pills Confirmé / Négocier / Refusé à polisher vs Figma 11 |
| `08_DEMANDES` | `lieuxDemandes` | ✅ | — |
| `15_Staff` | `lieuxStaff` | ✅ | — |
| `10_Scanner` | `lieuxScanner` | ✅ | — |
| `08_Notification` | `lieuxNotifications` | 🟡 | Types UI ; données surtout bookings |
| `08_Reglage` | `lieuxSettings` | ✅ | Hub + sous-écrans |
| `14_Booking_Messagerie` | `lieuxBookingChat` | ✅ | — |
| `08_Create_Event` | — | 🚫 | **Supprimé** : bookers créent les events |
| Édition profil lieu | `venueProfileEdit` | 🟡 | Sous-écran réglages, legacy |
| Profil public lieu | `venueProfile` | ➖ | Shell NOX sans HD |
| Avis lieu | `venueRatings` | ➖ | — |
| Legacy | `venueDashboard` | 🚫 | Redirige → stack `lieux*` |

---

### 2.5 Pro — DJ / Booker / Prestataire

**Aucune planche HD ARTIST / ORGANIZER dans `design-figma/`.**

| Besoin produit | Route app | Statut | Écart |
|----------------|-----------|--------|-------|
| Home pro (fil) | `proHome` | 🟡 | Inspiré wireframe communauté + raccourcis dashboard |
| Dashboard DJ | `djDashboard` | 🟡 | Legacy complet + `NoxProDashboardHeader` |
| Dashboard orga | `bookerDashboard` | 🟡 | Idem |
| Wizard création event | `bookerEventDashboard` | ➖ | Legacy, pas de skin NOX pixel-perfect |
| Dashboard prestataire | `prestataireDashboard` | ➖ | MVP hors Figma |
| Profil public DJ | `djProfile` | ➖ | Shell NOX |
| Profil public orga | `bookerProfile` | ➖ | Shell NOX |
| Discover pro | `events` | 🟡 | NOX skin ; COMMUNITY/VENUE redirigent ailleurs |
| Fil + création post | `createFeedPost` | 🟡 | Accessible proHome ; pas maquette |
| Sélection DJ / lieu / prestataire | `selectDj`, `selectVenue`, `selectPrestataire` | ➖ | Wizards booker |
| Amis booker | `bookerFriends` | ➖ | — |
| Avis DJ | `djRatings` | ➖ | — |
| Inscription DJ / Booker / Venue | `registerDj`, etc. | 🟡 | Thème NOX progressif incomplet |

**À demander côté Figma (priorité produit)**  
1. Home **Artiste** (feed + stats + CTA bookings)  
2. Home **Organisateur** (events + messages)  
3. Wizard **Create Event** orga (hi-fi)  
4. Dashboard secondaire DJ (sections tarifs / rider / paiements) si distinct du home  

---

### 2.6 Transversal & legacy (app sans Figma)

| Route app | Rôle | Note |
|-----------|------|------|
| `legal` | CGU, CGV, mentions, privacy | Obligatoire store |
| `admin` | Modération | Admin only |
| `tutorial` | Tutoriel | Legacy |
| `home`, `feed`, `welcome`, `venueDashboard` | Alias Phase D | Résolution NOX via `legacyScreenRedirects.js` — **fichiers supprimés** (août 2026) |
| `HomePage.js`, `FeedPage.js`, `VenueDashboardPage.js` | **Supprimés** | Styles `FeedPage.styles.js` et composants `venueDashboard/*` conservés pour réutilisation |

---

## 3. Matrice « maquette → code » (pack `design-figma/`)

| Fichier PNG | Contenu Figma | Écran(s) app | Statut global |
|-------------|---------------|--------------|---------------|
| `01-design-system-composants.png` | DS + nav | `nox/*`, `NoxRadialNav` | 🟡 tokens couleur |
| `02-design-system-couleurs-typo.png` | Palette + typo | `constants/colors.js` | 🟡 primaire `#2852E8` |
| `03-onboarding-auth-splash.png` | Splash + slides + signup | `splash`, `onboarding`, `register*` | 🟡 |
| `04-auth-verif-choix-role.png` | OTP + rôles | `authVerifyEmail`, `accountType` | ✅ |
| `05-wireframe-overview.png` | Architecture globale | — | Voir §2.3 features ❌ |
| `06-communaute-onboarding.png` | ONB communauté | `communityOnboarding` | ✅ |
| `07-communaute-home-discover.png` | Home + discover + détail | `communityHome`, `communityDiscover`, `communityEventDetail` | ✅ |
| `08-communaute-notifications.png` | Notifs + push | `notifications`, `communityPushOptIn` | 🟡 |
| `09-lieux-dashboard-profil-media.png` | Dashboard, profil, media, feed | `lieuxDashboard`, `lieuxProfil`, `lieuxMedia`, `lieuxFeed` | 🟡 |
| `10-lieux-dashboard-profil-media-v2.png` | Variante Lieux | Idem | 🟡 |
| `11-lieux-events-staff-scanner.png` | Dispo, events, staff, scanner, demande | `lieuxAvailability`, `lieuxEvents`, `lieuxStaff`, `lieuxScanner`, `lieuxRequestDetail` | 🟡 |
| `12-lieux-detail-event-valide.png` | Détail event confirmé | `lieuxEventDetail` | ✅ |
| `13-lieux-notifications-settings-events.png` | Notifs, réglages, create, demandes | `lieuxNotifications`, `lieuxSettings`, `lieuxDemandes` | 🟡 (create 🚫) |
| `14-lieux-booking-messagerie.png` | Chat booking | `lieuxBookingChat` | ✅ |

---

## 4. Backlog design recommandé (ordre)

### P0 — Bloquant perception « app finie »

1. Maquettes **Home + Dashboard DJ** et **Home + Dashboard Organisateur**  
2. Écran **checkout billet** NOX (ou skin hi-fi `eventDetail` checkout)  
3. **Tickets** hi-fi + modal QR plein écran (wireframe 05)

### P1 — Parité Figma Lieux / Communauté

4. API + UI **feed posts lieu** (`11_Feed`)  
5. **Upload médias** lieu (`10_Media`)  
6. Champs API **surface / sound system** (`09_Profil`)  
7. **Mur profil** + repost (wireframe 05 WALL)  
8. Hub **compte communauté** (settings HD dédiés)

### P2 — Polish & store

9. Profils publics **HD** (DJ, Venue, Booker, Collective)  
10. **Apple / Google Wallet**  
11. Inscriptions par rôle — fusion / alignement Sign Up Figma  
12. Notifs lieu **typées API** complètes  

### Hors scope actuel (décision produit)

- `lieuxCreateEvent` ( création event par le lieu )  
- Bookmarks, stories bar  
- Landing publique `HomePage`  

---

## 5. Taux de couverture (estimation août 2026)

| Périmètre | Maquettes pack | Implémentation vs maquette |
|-----------|----------------|----------------------------|
| Design system + nav | 2 planches | ~90 % |
| Auth globale | 2 planches | ~85 % |
| Communauté (écrans pack) | 3 planches | ~75 % (mur, will attend, wallet) |
| Lieux (écrans pack) | 6 planches | ~80 % (feed API, media upload, create 🚫) |
| Pro DJ / Booker | **0 planche** | ~40 % (tokens NOX seulement) |
| **Global pack versionné** | **14 planches** | **~75–80 %** des écrans figés |
| **App complète (toutes routes)** | partiel | **~55 %** avec maquette HD ou wireframe explicite |

---

## 6. Maintenance

- Mettre à jour ce fichier à chaque livraison Figma ou bascule majeure (voir [CHANGELOG.md](../../CHANGELOG.md)).  
- Croiser avec [PLAN_MIGRATION_NOX_LEGACY.md](./PLAN_MIGRATION_NOX_LEGACY.md) pour le statut legacy.  
- Images : [DESIGN_FIGMA_REFERENCE.md](./DESIGN_FIGMA_REFERENCE.md).

*Dernière mise à jour : 11 août 2026 — Phase D terminée (`proHome`, redirects, checkout séparé, écrans legacy supprimés).*
