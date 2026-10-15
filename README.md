# NOX

Plateforme événementielle : mise en relation **organisateurs (bookers)**, **DJs**, **lieux** et **communauté**. Billetterie Stripe, contrats PDF, chat de booking, feed social et scan de billets.

**Canal produit principal** : app mobile **Expo** (`nox-mobile/`).  
**API** : Node.js + Express + Prisma + **PostgreSQL** (déployée sur **Railway**).  
**Client web** : SPA React legacy (`client/`), secondaire.

---

## Documentation

| Document | Contenu |
|----------|---------|
| [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) | Contexte métier, modèle de données, zones API |
| [`docs/STACK.md`](docs/STACK.md) | Versions et stack détaillée |
| [`CHANGELOG.md`](CHANGELOG.md) | Historique des livraisons (par semaine) |
| [`docs/README.md`](docs/README.md) | Index guides backend / mobile / Figma |
| [`docs/mobile/PLAN_MIGRATION_NOX_LEGACY.md`](docs/mobile/PLAN_MIGRATION_NOX_LEGACY.md) | Migration UI NOX (Phase D ✅, Phase E en cours) |
| [`docs/backend/API_DOCUMENTATION.md`](docs/backend/API_DOCUMENTATION.md) | Référence API REST |

---

## Structure du dépôt

```
.
├── server/           # API Express, Prisma, webhooks Stripe, PDF contrats, push Expo
├── nox-mobile/       # App mobile Nox (Expo SDK 54, EAS Build + OTA)
├── client/           # Frontend web React (Telegram Web App, legacy)
├── docs/             # Guides, maquettes Figma, plans de migration
├── CHANGELOG.md
└── PROJECT_CONTEXT.md
```

---

## Stack (résumé)

| Couche | Technologies |
|--------|----------------|
| **Mobile** | Expo ~54, React 19, RN 0.81, navigation custom (`NavigationContext`), design system `components/nox/` |
| **Backend** | Express 4, Prisma 6, PostgreSQL, JWT, Stripe, nodemailer/Resend, stockage local ou Cloudflare R2 |
| **Web** | React 18, Tailwind, `@twa-dev/sdk` |

Profils utilisateur : **COMMUNITY**, **DJ**, **BOOKER**, **VENUE**, **PRESTATAIRE** — un compte peut en posséder plusieurs.

---

## Démarrage rapide

### Prérequis

- **Node.js** ≥ 20.18
- **PostgreSQL** (local ou distant) pour le serveur
- **Expo CLI** / EAS pour le mobile (`nox-mobile/`)

### 1. Cloner et installer

```bash
git clone https://github.com/rapappapapappapa/insane-nights-days-telegram-app.git
cd insane-nights-days-telegram-app

npm run install:all
cd nox-mobile && npm install
```

### 2. Backend

```bash
cd server
cp env.example.txt .env   # puis éditer DATABASE_URL, JWT_SECRET, Stripe, etc.
npx prisma migrate dev
npm run dev               # ou depuis la racine : npm run server:dev
```

L’API écoute par défaut sur le port configuré dans `.env` (souvent **5000** en local).

### 3. App mobile

```bash
cd nox-mobile
# Créer un .env local si besoin (EXPO_PUBLIC_API_BASE=…)
npx expo start
```

Variable essentielle :

```bash
EXPO_PUBLIC_API_BASE=https://votre-instance.railway.app
```

Défaut codé si absent : instance Railway de prod (voir `nox-mobile/api/endpointsConfig.js`).

Guide détaillé : [`docs/guides/GUIDE_SETUP_MOBILE.md`](docs/guides/GUIDE_SETUP_MOBILE.md).

### 4. Client web (optionnel)

```bash
npm run dev    # serveur + client en parallèle
# ou
npm run client:dev
```

---

## Mobile — build & OTA

Profils EAS (`nox-mobile/eas.json`) :

| Profil | Canal | Usage |
|--------|-------|--------|
| `development` | — | Dev client |
| `preview` | `preview` | APK Android interne |
| `production` | `production` | App Store / Play Store |

```bash
cd nox-mobile

# Build store
eas build --profile production --platform all

# Mise à jour JS sans rebuild (runtime 1.0.0)
export CI=1 EAS_SKIP_AUTO_FINGERPRINT=1
eas update --branch preview --environment preview --platform android --message "…"
eas update --branch production --environment production --platform ios --message "…"
# ou : npm run update:both -- "Mon message"
```

Bundle iOS TestFlight : `com.insanenightsdays.mobile`.

---

## Déploiement backend

- **Railway** : `server/railway.json`, variables dans le dashboard (voir `server/env.example.txt`).
- Migrations prod : `npx prisma migrate deploy` dans `server/`.
- Guide : [`docs/backend/DEPLOY.md`](docs/backend/DEPLOY.md).

---

## Branche de travail

Développement actif sur **`railway-phase1`**.

---

## Contribution

1. Lire le [`CHANGELOG.md`](CHANGELOG.md) et la section en cours avant de livrer.
2. Pour tout changement visible : entrée CHANGELOG (français) + commit message clair.
3. Doc technique à jour : `PROJECT_CONTEXT.md`, `docs/STACK.md` si l’architecture change.

---

## Licence

MIT — voir [`LICENSE`](LICENSE).
