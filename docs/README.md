# Documentation NOX

Index de la documentation du mono-repo **insane-nights-days-telegram-app**.  
Pour démarrer rapidement : [`../README.md`](../README.md) · [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md) · [`../CHANGELOG.md`](../CHANGELOG.md).

---

## Référentiels à jour (août 2026)

| Document | Contenu |
|----------|---------|
| [`STACK.md`](STACK.md) | Versions exactes (Expo 54, Prisma, PostgreSQL, etc.) |
| [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md) | Contexte métier, modèle Prisma, zones API |
| [`mobile/PLAN_MIGRATION_NOX_LEGACY.md`](mobile/PLAN_MIGRATION_NOX_LEGACY.md) | Migration UI NOX — **Phase D ✅**, Phase E en cours |
| [`mobile/DESIGN_FIGMA_REFERENCE.md`](mobile/DESIGN_FIGMA_REFERENCE.md) | Maquettes Figma ↔ écrans app |
| [`mobile/ECARTS_FIGMA_VS_APP.md`](mobile/ECARTS_FIGMA_VS_APP.md) | Écarts design / implémentation |
| [`mobile/MANQUES_APP.md`](mobile/MANQUES_APP.md) | Écrans sans maquette Figma |
| [`mobile/GUIDE_TEST_NOX.md`](mobile/GUIDE_TEST_NOX.md) | Parcours de test manuel |
| [`backend/API_DOCUMENTATION.md`](backend/API_DOCUMENTATION.md) | Endpoints REST (auth JWT, events, tickets…) |
| [`backend/DEPLOY.md`](backend/DEPLOY.md) | Déploiement Railway / PostgreSQL |

---

## Guides (`/docs/guides/`)

| Fichier | Sujet |
|---------|--------|
| [`GUIDE_SETUP_MOBILE.md`](guides/GUIDE_SETUP_MOBILE.md) | Setup Expo, EAS, émulateurs |
| [`GUIDE_CONFIGURATION_R2.md`](guides/GUIDE_CONFIGURATION_R2.md) | Stockage médias Cloudflare R2 |
| [`GUIDE_CLOUDFLARED.md`](guides/GUIDE_CLOUDFLARED.md) | Tunnel Cloudflare (dev local) |
| [`LOGO_SETUP.md`](guides/LOGO_SETUP.md) | Logo et composant `Logo.js` |

---

## Backend (`/docs/backend/`)

| Fichier | Sujet |
|---------|--------|
| [`EXPLICATION_BACKEND.md`](backend/EXPLICATION_BACKEND.md) | Architecture serveur (PostgreSQL, Prisma, Stripe) |
| [`API_DOCUMENTATION.md`](backend/API_DOCUMENTATION.md) | Référence API |
| [`DEPLOY.md`](backend/DEPLOY.md) | Prod Railway, migrations Prisma |
| [`GUIDE_DEMARRAGE.md`](backend/GUIDE_DEMARRAGE.md) | Démarrage local |
| [`ARRETER_SERVEUR.md`](backend/ARRETER_SERVEUR.md) | Arrêt propre du serveur |

---

## Mobile (`/docs/mobile/`)

| Fichier | Sujet |
|---------|--------|
| [`PLAN_MIGRATION_NOX_LEGACY.md`](mobile/PLAN_MIGRATION_NOX_LEGACY.md) | Plan migration legacy → NOX |
| [`DESIGN_FIGMA_REFERENCE.md`](mobile/DESIGN_FIGMA_REFERENCE.md) | Pack maquettes (`design-figma/`) |
| [`SYNTHESE_REFONTE_NOX_JUIN2026.md`](mobile/SYNTHESE_REFONTE_NOX_JUIN2026.md) | Design system + navigation |
| [`GUIDE_TEST_NOX.md`](mobile/GUIDE_TEST_NOX.md) | QA manuelle |
| [`SECURITE_TOKENS_IMPLEMENTATION.md`](mobile/SECURITE_TOKENS_IMPLEMENTATION.md) | Tokens JWT / Secure Store |
| [`LOGGING_SECURISE_IMPLEMENTATION.md`](mobile/LOGGING_SECURISE_IMPLEMENTATION.md) | Logging sans fuite de secrets |

Documents **historiques** (audit juil. 2026, chemins parfois obsolètes) — lire avec prudence :

- [`mobile/AMELIORATIONS_SYNTHESE.md`](mobile/AMELIORATIONS_SYNTHESE.md)
- [`mobile/OPTIMISATIONS_RECOMMANDATIONS.md`](mobile/OPTIMISATIONS_RECOMMANDATIONS.md)
- [`mobile/EXEMPLE_UTILISATION.md`](mobile/EXEMPLE_UTILISATION.md)
- [`../AMELIORATIONS.md`](../AMELIORATIONS.md)
- [`STRUCTURE_PROPOSEE.md`](STRUCTURE_PROPOSEE.md)

---

## Structure app mobile (`nox-mobile/`)

Organisation actuelle des écrans :

| Dossier | Rôle |
|---------|------|
| `screens/auth/` | Login, register multi-rôles, OTP email, choix de rôle |
| `screens/community/` | Accueil, discover, profil, onboarding, détail event |
| `screens/lieux/` | Dashboard lieu, demandes, chat + contrat, events, scan |
| `screens/pro/` | Accueil pro (`proHome`) — DJ, booker, prestataire |
| `screens/dashboard/` | Dashboards métier (DJ, booker, prestataire, admin) |
| `screens/events/` | Liste pro (`EventsRoutePage`), détail, billets, scan staff |
| `screens/feed/` | `CreateFeedPostPage` + styles partagés (`FeedPage.styles.js`) |
| `screens/profiles/` | Profils publics et édition |
| `screens/purchases/` | Historique achats |
| `screens/notifications/` | Centre de notifications |
| `components/nox/` | Design system NOX (Satoshi, `#2852E8`) |

**Écrans legacy supprimés (Phase D, août 2026)** : `HomePage`, `FeedPage`, `WelcomePage`, `VenueDashboardPage`, `MenuPageOld`.  
Les clés de route `home`, `feed`, `welcome`, `venueDashboard`, `events` restent des **alias** résolus dans `utils/legacyScreenRedirects.js`.

---

## Démarrage rapide

1. **Backend** : [`backend/GUIDE_DEMARRAGE.md`](backend/GUIDE_DEMARRAGE.md) — PostgreSQL + `server/env.example.txt`
2. **Mobile** : [`guides/GUIDE_SETUP_MOBILE.md`](guides/GUIDE_SETUP_MOBILE.md) — `EXPO_PUBLIC_API_BASE`
3. **Déploiement** : [`backend/DEPLOY.md`](backend/DEPLOY.md) · OTA : `nox-mobile/` → `npm run update:both`

---

*Dernière mise à jour : 11 août 2026.*
