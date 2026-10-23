# Explication du backend NOX

Vue d’ensemble de l’API **Node.js + Express** qui alimente l’app mobile Expo et le client web legacy.

> **Référence complète** : [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md) · [`../STACK.md`](../STACK.md) · [`../../PROJECT_CONTEXT.md`](../../PROJECT_CONTEXT.md)

---

## Architecture

| Couche | Détail |
|--------|--------|
| **Runtime** | Node.js ≥ 20.18 |
| **Framework** | Express 4 |
| **ORM** | Prisma 6 → **PostgreSQL** (`DATABASE_URL`) |
| **Auth** | JWT (`Authorization: Bearer`), bcrypt, Google / Apple Sign-In |
| **Paiements** | Stripe (intents, webhooks, billets QR) |
| **Médias** | Multer — stockage local ou **Cloudflare R2** |
| **Emails** | Nodemailer / Resend (contrats PDF, OTP, notifications) |
| **PDF** | `pdfkit` — contrats DJ / lieu (commission NOX 10 %) |
| **Push** | Expo Push (`expo-server-sdk`) |

Point d’entrée : `server/index.js` (routes principales + modules sous `server/routes/`).

---

## Données persistées (PostgreSQL)

Plus de stockage en mémoire ni wallet TON. Principales entités Prisma :

- **`User`** — compte, email vérifié, `activeProfileType`, rôle admin
- **Profils** — `UserCommunity`, `UserDj`, `UserBooker`, `UserVenue`, prestataire
- **`Event`** — événements booker, capacité, billetterie, feed
- **`EventDj` / `EventVenue`** — invitations, chat, contrats, paiements booking
- **`Ticket` / `Payment`** — billetterie Stripe, QR, scan staff
- **`FeedPost`** — feed social, likes, commentaires, reposts
- **`Message`** — chat privé booking et groupes event

Schéma complet : `server/prisma/schema.prisma`.

---

## Authentification

| Endpoint | Usage |
|----------|--------|
| `POST /api/auth/register` | Inscription email + profil |
| `POST /api/auth/login` | Connexion email / pseudo |
| `POST /api/auth/google` | Google Sign-In (id_token) |
| `POST /api/auth/apple` | Apple Sign-In (identityToken) |
| `GET /api/user/profiles` | Profils du compte connecté |

La route **`POST /api/wallet/connect`** (wallet TON mock) est **obsolète** — ne plus documenter côté client.

---

## Zones fonctionnelles API

Toutes sous **`/api/...`**, auth JWT sauf routes publiques.

| Domaine | Exemples |
|---------|----------|
| **Événements** | `GET /api/events`, CRUD booker, publish feed |
| **Bookings** | Invitations DJ / lieu, accept / reject, chat |
| **Contrats** | `/api/contracts/event-djs/...`, `/api/contracts/event-venues/...` |
| **Billetterie** | Stripe checkout, tickets, scan QR staff |
| **Feed** | Posts, likes, commentaires, repost, mur profil (`GET /api/feed/wall`) |
| **Découverte** | DJs publics, lieux, collectifs |
| **Admin** | Modération, seed démo |

Exploration rapide : `grep` dans `server/routes/` et `server/index.js`.

---

## Sécurité

- **helmet**, **cors** (`ALLOWED_ORIGINS`), **express-rate-limit**
- Limites strictes sur login / register / admin
- **Trust proxy** activé (Railway)
- Secrets via variables d’environnement — voir `server/env.example.txt`

---

## Déploiement

- **Production** : Railway (`server/railway.json`)
- **Migrations** : `cd server && npx prisma migrate deploy`
- **URL API mobile** : `EXPO_PUBLIC_API_BASE` → instance Railway (défaut dans `nox-mobile/api/endpointsConfig.js`)

Guide détaillé : [`DEPLOY.md`](DEPLOY.md).

---

## Lien avec l’app mobile

1. L’app lit `EXPO_PUBLIC_API_BASE` (ou fallback Railway codé).
2. `nox-mobile/api/` centralise les appels (axios + JWT depuis Secure Store).
3. Les OTA Expo livrent le JS client ; le serveur se déploie indépendamment sur Railway.

---

*Dernière mise à jour : 11 août 2026.*
