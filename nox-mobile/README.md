# Nox — application mobile

App **Expo / React Native** (SDK 54) — canal produit principal de la plateforme NOX.

---

## Rôles & parcours

| Profil | Accueil | Découverte événements |
|--------|---------|------------------------|
| **COMMUNITY** | `communityHome` | `communityDiscover` |
| **VENUE** (lieu) | `lieuxDashboard` | `lieuxEvents` |
| **DJ / BOOKER / PRESTATAIRE** | `proHome` | `events` (pro) ou dashboard métier |

Navigation : `NavigationContext` + table `SCREENS` dans `App.js`. Design system dans `components/nox/`.

Les clés legacy (`home`, `feed`, `welcome`, `venueDashboard`, `events`) sont réécrites automatiquement via `utils/legacyScreenRedirects.js` (Phase D terminée).

---

## Structure

```
nox-mobile/
├── App.js                 # Routage (~70 écrans)
├── api/                   # HTTP (axios), endpointsConfig, méthodes par domaine
├── components/nox/        # Design system NOX
├── screens/
│   ├── auth/              # Login, register multi-rôles, OTP email
│   ├── community/         # Accueil, discover, profil, onboarding
│   ├── lieux/             # Dashboard lieu, demandes, chat + contrat
│   ├── pro/               # Accueil pro (DJ / booker / prestataire)
│   ├── dashboard/         # Dashboards métier
│   ├── events/            # Liste pro, détail, billets, scan staff
│   └── …
├── contexts/              # Auth, Navigation, Language (FR/EN), EventForm
├── hooks/                 # Logique métier par écran
└── eas.json               # Profils build EAS
```

---

## Configuration

### Variables d'environnement (EAS / local)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_BASE` | URL API sans slash final (ex. `https://….up.railway.app`) |
| `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` | OAuth Google (iOS / Android / Web) |
| `EXPO_PUBLIC_EVENT_MIN_LEAD_DAYS` | Délai min. wizard événement booker |
| `EXPO_PUBLIC_SCAN_TICKET_TEST_SECRET` | Mode test scan billets (dev) |
| `EXPO_PUBLIC_HIDE_SCAN_TEST_UI` | `true` pour masquer l’UI de test scan en prod |

Défaut API si non défini : voir `api/endpointsConfig.js`.

Variables serveur associées : `server/env.example.txt`.

---

## Commandes

```bash
npm install
npx expo start              # dev local
npx expo start --dev-client # avec development build

# Build
eas build --profile preview --platform android
eas build --profile production --platform ios

# OTA (JS uniquement, runtime = app version 1.0.0)
npm run update:both -- "Description de l'update"
```

Canaux OTA : **`preview`** (Android), **`production`** (iOS).

---

## Docs liées

- Racine : [`../README.md`](../README.md), [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md)
- Stack : [`../docs/STACK.md`](../docs/STACK.md)
- Migration NOX : [`../docs/mobile/PLAN_MIGRATION_NOX_LEGACY.md`](../docs/mobile/PLAN_MIGRATION_NOX_LEGACY.md)
- Maquettes : [`../docs/mobile/DESIGN_FIGMA_REFERENCE.md`](../docs/mobile/DESIGN_FIGMA_REFERENCE.md)
- Setup : [`../docs/guides/GUIDE_SETUP_MOBILE.md`](../docs/guides/GUIDE_SETUP_MOBILE.md)
- Changelog : [`../CHANGELOG.md`](../CHANGELOG.md)
