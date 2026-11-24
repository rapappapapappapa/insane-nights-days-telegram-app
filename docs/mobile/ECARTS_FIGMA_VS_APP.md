# Écarts maquettes ↔ application NOX

Document de référence : **ce qui manque** par rapport aux maquettes versionnées dans le dépôt et **ce que l’app expose sans maquette**.

**Sources images (pas seulement Figma cloud)** : dossier local  
`docs/mobile/design-figma/` — **21 planches** (PNG 01–14 + JPG communauté 15–21).  
Catalogue : [DESIGN_FIGMA_REFERENCE.md](./DESIGN_FIGMA_REFERENCE.md).  
Inventaire écrans app sans HD : [MANQUES_APP.md](./MANQUES_APP.md).  
Code écrans : `nox-mobile/screens/` (+ composants `components/`).

**Légende implémentation**

| Symbole | Signification |
|---------|----------------|
| ✅ | Aligné maquette (UI + parcours principal) |
| 🟡 | Écran présent, écart visuel ou fonctionnel notable |
| ❌ | Prévu maquette / wireframe, non implémenté |
| ➖ | Pas de planche HD dans le pack |
| 🚫 | Volontairement absent (décision produit) |

---

## 1. Synthèse rapide (24 nov. 2026)

### Pack bien couvert

- **Design system** + nav radiale NX  
- **Auth** : splash, slides, OTP, choix rôle  
- **Communauté** : onboarding, home/discover, détail event, notifs + push  
- **Communauté pack 15–21** (oct. 2026) : fil plein cadre, agenda / Intéressé, billets + historique, mode scroll, notifs filtrées, **détail billet + QR plein écran** — **livré**  
- **Lieux** : stack `lieux*` (sauf création d’event côté lieu, retirée)

### Gros trous côté design (pas de planche HD)

| Zone | Impact |
|------|--------|
| **Home / dashboard DJ** | `djDashboard` (hub grille) sans pack ARTIST |
| **Home / dashboard Organisateur** | `bookerDashboard` + wizard `bookerEventDashboard` |
| **Prestataire** | Hors pack |
| **Profils publics HD** | DJ / Lieu / Booker / Collectif — shell NOX |
| **Hub compte communauté** | `ProfilePage` calqué réglages Lieux |
| **Checkout billet hi-fi** | `eventDetail?checkoutOnly` — skin NOX, **pas** de planche dédiée |

### Features wireframe / produit — état réel

| Item | Statut |
|------|--------|
| Mur profil + repost | ✅ `ProfileWallStream` / feed immersif |
| Onglet **Prévus** (Will attend) | ✅ soirées « Intéressé » |
| Tickets + QR plein écran | ✅ maquettes 17 / 20 / 21 |
| Feed posts lieu | ✅ vraies publications (nov.) |
| Upload médias lieu | ✅ `LieuxMediaPage` |
| Transfert / revente billet | ✅ |
| Apple / Google Wallet | 🟡 **code prêt**, inactif sans certificats Railway |
| Checkout NOX unifié (écran Figma) | ➖ pas de planche ; flow checkoutOnly OK |
| Bookmarks / stories bar | ❌ hors scope / P3 |
| HelloAsso payant | 🟡 gratuites OK ; payant derrière clés API |

---

## 2. Inventaire par zone

### 2.1 Design system & navigation

| Maquette | Route / code | Statut | Écart |
|----------|--------------|--------|-------|
| Composants, tokens | `components/nox/*` | 🟡 | Primaire code `#2852E8` (doc image cite aussi `#4DA3FF`) |
| Nav radiale NX | `NoxRadialNav` | ✅ | — |
| Bottom nav Lieux | `NoxLieuxBottomNav` | ✅ | — |

### 2.2 Auth & boot

| Maquette | Route | Statut |
|----------|-------|--------|
| Splash / slides | `splash`, `onboarding` | ✅ |
| OTP + choix rôle | `authVerifyEmail`, `accountType` | ✅ |
| Sign Up | `register*` | 🟡 formulaires séparés par rôle |
| Login / switch profil | `login`, `switchProfile` | ➖ pas de planche dédiée |

### 2.3 Communauté

| Maquette / wireframe | Route / composant | Statut | Notes |
|----------------------|-------------------|--------|-------|
| Onboarding 8 étapes | `communityOnboarding` | ✅ | — |
| Home / Fil (07 + **15**) | `communityHome`, `CommunityFeedStream` | ✅ | cartes plein cadre |
| Mode scroll (**18**) | `FeedScrollMode` | ✅ | — |
| Discover | `communityDiscover` | ✅ | — |
| Event detail | `communityEventDetail` | ✅ | achat → checkout |
| Agenda (**16**) | agenda communauté | ✅ | Intéressé + Participant |
| Notifs (08 + **19**) | `notifications` | ✅ | filtres + app notifs |
| Billets (**17**) | `tickets` | ✅ | — |
| Historique (**20**) | onglet Historique `TicketsPage` | ✅ | message billet non scanné |
| Détail billet (**21**) | `TicketDetailPage` | ✅ | QR plein écran, agenda, transfert, revente |
| Profil Overview / Events / Friends / Mur | `CommunityProfileShell` | ✅ | Mur + Prévus livrés |
| Hub compte | `profile` | ➖ | pas de HD compte |
| Checkout | `eventDetail` checkoutOnly | 🟡 | pas de planche checkout |
| Staff / scan communauté | `staffEvents`, `scanTicket` | 🟡 | wireframe ; lieux a le HD |

### 2.4 Lieux

| Maquette | Route | Statut | Notes |
|----------|-------|--------|-------|
| Dashboard / profil / media / feed | `lieuxDashboard`, `lieuxProfil`, `lieuxMedia`, `lieuxFeed` | ✅ | upload media OK ; feed = posts |
| Dispo / events / staff / scanner | `lieuxAvailability`, `lieuxEvents`, `lieuxStaff`, `lieuxScanner` | ✅ | — |
| Demande / détail / chat | `lieuxDemandes`, `lieuxRequestDetail`, `lieuxBookingChat` | 🟡 | pills demande à polisher |
| Notifs / réglages | `lieuxNotifications`, `lieuxSettings` | 🟡 | notifs surtout bookings |
| Create event lieu | — | 🚫 | seuls les orgas créent |
| Surface / sound profil | — | ➖ | **pas de champs Prisma** (ne pas attendre « — » côté API) |
| Profil public lieu | `venueProfile` | ➖ | shell + mur / follow |

### 2.5 Pro DJ / Booker / Prestataire

**Aucune planche HD** dans `design-figma/`.

| Route | Statut |
|-------|--------|
| `djDashboard` | 🟡 hub grille NOX |
| `bookerDashboard` / `bookerEventDashboard` | 🟡 |
| `prestataireDashboard` | ➖ MVP |
| Profils publics `djProfile`, `bookerProfile` | ➖ |

**À demander au design** : Home Artiste, Home Organisateur, wizard Create Event orga.

---

## 3. Matrice « fichier image → code »

| Fichier | Contenu | App | Statut |
|---------|---------|-----|--------|
| `01`–`02` | DS | `nox/*` | 🟡 tokens |
| `03`–`04` | Auth | splash / onboarding / OTP / rôles | ✅ / 🟡 register |
| `05` | Wireframe | — | partiel (stories/bookmarks ❌) |
| `06`–`08` | Communauté classique | home, discover, notifs | ✅ |
| `09`–`14` | Lieux | stack `lieux*` | ✅ / 🟡 polish |
| `15` | Accueil / fil | `communityHome` | ✅ |
| `16` | Agenda | agenda | ✅ |
| `17` | Billets wallet | `TicketsPage` | ✅ |
| `18` | Publication scroll | `FeedScrollMode` | ✅ |
| `19` | Notifs filtrées | `NotificationsPage` | ✅ |
| `20` | Historique | onglet historique | ✅ |
| `21` | Détail billet | `TicketDetailPage` | ✅ |

---

## 4. Backlog restant (hors HelloAsso)

### P0
1. QA pack 15–21 + transfert / revente / notifs / Prévus  
2. Certificats **Apple / Google Wallet** + vars Railway  
3. Maquettes **pro DJ / Orga** (design)  

### P1
4. Skin / planche **checkout** billet  
5. Hub **compte** communauté HD  
6. Profils publics HD  
7. Polish demandes lieu (pills)  
8. Prep stores + Resend  

### P2 / hors scope
9. Prestataire, stories, bookmarks, ranking  

---

## 5. Couverture estimée (nov. 2026)

| Périmètre | Planches | Implémentation |
|-----------|----------|----------------|
| DS + auth | 4 | ~90 % |
| Communauté 06–08 + 15–21 | 10 | ~95 % |
| Lieux 09–14 | 6 | ~90 % |
| Pro DJ / Booker | **0** | ~45 % (sans HD) |
| **Pack versionné (21)** | 21 | **~90 %** des écrans figés |
| **App complète** | partiel | ~65 % avec HD ou wireframe |

---

## 6. Maintenance

- Mettre à jour à chaque livraison dans `design-figma/` ou bascule majeure ([CHANGELOG.md](../../CHANGELOG.md)).  
- Croiser `nox-mobile/screens/` (routes `App.js`) et [MANQUES_APP.md](./MANQUES_APP.md).

*Dernière mise à jour : 24 novembre 2026 — docs rattrapées vs livraisons oct.–nov. ; alignement détail billet maquette 21.*
