# Stack technique de l’application (référentiel précis)

Document généré à partir du dépôt (fins 2026) : versions indiquées telles que dans les `package.json` ou fichiers de config ; où c’est une fourchette semver (`^`, `~`), la version résolue peut varier après `npm install`.

---

## 1. Organisation du dépôt (mono-repo pragmatique)

| Dossier | Rôle |
|--------|------|
| **`server/`** | API HTTP principale (Express), Prisma, logique métier (événements, billetterie, contrats, feed, médias…). |
| **`nox-mobile/`** | Application **mobile Nox** (Expo / React Native) — canal produit principal documenté dans le changelog récent. |
| **`client/`** | Frontend **web** historical (Create React App, React 18), intégration **Telegram Web App** (`@twa-dev/sdk`), Tailwind ; consomme la même API Railway. |
| **Racine** | Scripts de convenance (`npm run dev` = client web + nodemon serveur depuis la racine), dépendances héritées dont **Telegraf** (bot Telegram) — usage effectif à vérifier côté déploiement ; le **`server/`** est autonome avec son propre `package.json`. |

---

## 2. Runtime & langages

- **Node.js** : **`>= 20.18.0`** (contraint dans `server/package.json`).
- **JavaScript** : ES modules côté client API mobile (`import`/`export`) ; CommonJS **`require`** sur le serveur Node.
- **SQL** : généré/appliqué via **Prisma Migrate** (`server/prisma/migrations/`).

---

## 3. Application mobile · **Nox** (`nox-mobile/`)

### Framework & UI

| Composant | Détail |
|-----------|--------|
| **Expo SDK** | `~54.0.31` |
| **React** | `19.1.0` |
| **React Native** | `0.81.5` |
| **React Native Web** | `^0.21.2` (cible **`expo start --web`**) |
| **Navigation** | `@react-navigation/native` `^7.1.19`, drawer `^7.7.11`, native-stack `^7.6.2` |
| **Gestion tactile / animations** | `react-native-gesture-handler`, `react-native-reanimated`, `react-native-screens`, `react-native-safe-area-context` |

### Fonctionnalités natives (packages Expo courants dans le projet)

- **Stripe** : `@stripe/stripe-react-native` `0.50.3` (plugin configuré avec `merchantIdentifier` iOS dans `app.json`).
- **Stockage sécurisé** : `expo-secure-store`.
- **Stockage générique** : `@react-native-async-storage/async-storage`.
- **Notifications push** : `expo-notifications` (tokens enregistrés côté serveur sur `PushDevice`).
- **Mises à jour OTA** : `expo-updates` avec URL Expo (`app.json` → `updates.url` sur `expo.dev`, `runtimeVersion.policy: appVersion`).
- **Médias** : `expo-camera`, `expo-image-picker`, `expo-av`, `expo-video`, `expo-audio`, etc.
- **Auth** : `expo-apple-authentication`, `expo-auth-session` + flux Google côté API.
- **Agenda** : `expo-calendar`.
- **PDF prévisualisation** : `pdfjs-dist` (+ script `postinstall` pour assets).

### Build & distribution

- **EAS** : `eas.json` (profiles `development` avec dev client, `preview`, `production` avec canaux **`preview`** / **`production`**).
- **Expo projet** : `app.json` → `extra.eas.projectId`, nom affiché **« Nox »**, scheme `com.nox.mobile`, **New Architecture** activée (`newArchEnabled: true`).

### Client HTTP

- **Axios** `^1.13.2` via couche **`api/`** (`endpointsConfig`, `http`, `apiMethods`).
- **Base API** : variable d’environnement **`EXPO_PUBLIC_API_BASE`**, défaut codé vers l’instance Railway :  
  `https://api.nox.world`  
  (voir `api/endpointsConfig.js`).

---

## 4. Backend API (`server/`)

### Cœur serveur

| Composant | Version (package.json) |
|-----------|-------------------------|
| **Express** | `^4.18.2` |
| **dotenv** | `^17.2.3` |
| **helmet** | `^8.1.0` |
| **cors** | `^8.6.0` |
| **express-rate-limit** | `^8.2.1` |

Comportements notables dans `server/index.js` :

- **Trust proxy** activé (`app.set('trust proxy', 1)`) pour derrière Railway / reverse-proxy.
- **CORS** : liste **`ALLOWED_ORIGINS`** (séparée par virgules) ou `*` par défaut.
- **Limite générale** : ~2000 req / 15 min / IP (`RATE_LIMIT_MAX` configurable).
- **Limites plus strictes** sur `/api/auth/login`, `register`, `google`, `apple` et routes admin bootstrap/seed.

### Persistance & ORM

| Composant | Version |
|-----------|---------|
| **Prisma** | `^6.19.0` (`prisma` + `@prisma/client`) |
| **PostgreSQL** (driver) | `pg` `^8.16.3` |
| **Schéma** | `server/prisma/schema.prisma`, `datasource db` → `DATABASE_URL`. |

Les migrations vivent sous **`server/prisma/migrations/`** ; déploiement standard : **`npx prisma migrate deploy`** (recommandé en prod).

### Sécurité & auth

| Composant | Usage |
|-----------|--------|
| **jsonwebtoken** `^9.0.2` | Sessions API (secret `JWT_SECRET`, durée `JWT_EXPIRES_IN`). |
| **bcryptjs** | Hash de mots de passe. |
| **google-auth-library** + **`server/utils/googleIdTokenVerify.js`** | Google Sign-In (`GOOGLE_OAUTH_*_CLIENT_ID`). |
| **jwks-rsa** | Vérification de jetons selon besoins JWKS. |
| **Apple** | `APPLE_IOS_BUNDLE_ID` (+ utilitaire `appleIdTokenVerify.js`). |

Codes e-mail / reset : selon `AUTH_CODE_SALT`, option **`DEBUG_LOGS`**.

### Paiements

- **stripe** `^20.2.0` (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`).
- Billetterie : intents + webhooks + confirmation côté API (dont multi-tarifs `tierId`).

### Emails

- **resend** `^6.9.2` si `RESEND_API_KEY` + `RESEND_FROM`.
- Sinon **nodemailer** `^8.0.0` si `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (voir `server/utils/mailer.js`).

### Fichiers & médias upload

- **multer** `^2.0.2`.
- Stratégie **`MEDIA_STORAGE`** : **`local`** (dossier type `/uploads/media`) ou **`r2`**.
- Mode **R2** : **`@aws-sdk/client-s3`** `^3.899.0` — API compatible S3 vers **Cloudflare R2**  
  Variables : `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, **`R2_PUBLIC_BASE_URL`** (URL publique des objets).

### Autres libs métier

- **PDF** : **pdfkit** `^0.18.0` (contrats / exports).
- **QR codes** : **qrcode** `^1.5.3` (billets, scan).
- **uuid** `^9.0.1`.

---

## 5. Frontend web (`client/`)

| Composant | Version |
|-----------|---------|
| **react-scripts** | 5.0.1 (CRA) |
| **React / React DOM** | `^18.2.0` |
| **react-router-dom** | `^6.8.0` |
| **Telegram Web App** | `@twa-dev/sdk` `^8.0.2` |
| **CSS** | Tailwind CSS `^3.3.0` (PostCSS / Autoprefixer) |

Fichiers de config API typiques : **`REACT_APP_API_BASE`** avec la même URL Railway par défaut que le mobile (`client/src/apiBase.js`, `client/src/api/config.js`).

---

## 6. Hébergement & déploiement

### Railway (backend)

- Fichier **`server/railway.json`** :
  - **Builder** : **NIXPACKS**.
  - **StartCommand** (extrait logique) : enchaîne des scripts Node de maintenance optionnels puis **`npx prisma db push --accept-data-loss`** puis **`npm start`**.  
  - ⚠️ En production, **`db push`** contourne l’historique des migrations ; l’équipe peut préférer **`prisma migrate deploy`** pour coller aux fichiers dans `prisma/migrations/` (cohérence avec ce qui est fait sur un poste dev / CI).

- Variables Railway usuelles côté doc interne : **`DATABASE_URL`**, **`PORT`**, **`PUBLIC_URL`**, **`JWT_SECRET`**, clés Stripe, R2 ou `MEDIA_STORAGE=local`, **`ALLOWED_ORIGINS`**, etc.

### Expo / EAS (mobile)

- Builds **EAS** (Android AAB/APK, iOS avec auto-increment iOS selon profile).
- **Expo Updates** : canal lié aux builds preview/production.

---

## 7. Variables d’environnement (liste de référence non exhaustive)

### Serveur

| Variable | Rôle principal |
|---------|----------------|
| `DATABASE_URL` | Connexion PostgreSQL (Prisma). |
| `PORT` | Écoute HTTP (défaut **8080** dans le code). |
| `NODE_ENV` | Comportements prod (`production`). |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | JWT API. |
| `ALLOWED_ORIGINS` | CORS (liste CSV). |
| `RATE_LIMIT_MAX` | Plafond requêtes générales / 15 min / IP. |
| `PUBLIC_URL` | URL publique du service (liens dans e-mails / feed / absolus). |
| `STRIPE_*` | Paiements + webhooks. |
| `MEDIA_STORAGE` | `local` \| `r2`. |
| `R2_*` | Cloudflare R2 (si `MEDIA_STORAGE=r2`). |
| `RESEND_*` ou `SMTP_*` | Envoi d’e-mails. |
| `GOOGLE_OAUTH_WEB_CLIENT_ID`, `GOOGLE_OAUTH_IOS_CLIENT_ID`, `GOOGLE_OAUTH_ANDROID_CLIENT_ID` | Google. |
| `APPLE_IOS_BUNDLE_ID` | Apple Sign-In. |
| `AUTH_CODE_SALT` | Sel pour codes vérif email. |
| `ADMIN_BOOTSTRAP_KEY` | Protection routes admin bootstrap / seed. |
| `ENABLE_EVENT_STATUS_CRON` | Tâche de mise à jour des statuts d’événements (`true` par défaut). |
| `EVENT_MIN_LEAD_DAYS` | Délai minimum avant date d’événement (création côté booker). |
| `SCAN_TICKET_*` | Règles de scan QR (dont mode test optionnel). |
| `BOOKER_ALLOW_DELETE_WITH_TICKETS` | Comportement suppression événement avec billets. |
| `DEBUG_LOGS` | Logs de debug auth / admin. |

### Mobile

| Variable | Rôle principal |
|---------|----------------|
| **`EXPO_PUBLIC_API_BASE`** | URL de base de l’API (sans slash final conseillé). |

---

## 8. Flux produit reliant les briques

- **Clients** (Expo iOS/Android/Web, client CRA) ↔ **HTTPS** ↔ **Express** ↔ **Prisma** ↔ **PostgreSQL**.
- **Médias** : upload API → disque local **ou** **R2** ; URLs persistées renvoyées au client (**`PUBLIC_URL`** / **`R2_PUBLIC_BASE_URL`**).
- **Billetterie** : **Stripe PaymentSheet** mobile → intents API → webhooks Stripe → écriture `Payment` / `Ticket` ; mode démo **POST** `/api/tickets/buy` sans carte (selon plateforme).
- **Notifications** : app enregistre **Expo push token** → table **`PushDevice`** → envois via la stack Expo depuis le serveur (lib à confirmer dans les routes notifications).

---

## 9. Résumé une phrase

**Stack principale actuelle** : **Expo/React Native (Nox)** + **Node/Express** + **Prisma/PostgreSQL** + **Stripe** + stockage **local ou Cloudflare R2** + mails **Resend ou SMTP**, hébergement API typiquement **Railway**, distributions mobile via **EAS** et **Expo Updates** ; client **React (CRA)** + **Telegram Web App SDK** existe en parallèle pour le même backend.

---

*Pour toute divergence entre ce fichier et la réalité d’un environnement précis (branches Railway, désactivation Stripe, pas de R2), se fier aux variables configurées et aux logs de déploiement.*
