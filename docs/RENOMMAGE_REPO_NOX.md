# Identifiants NOX — état actuel (4 août 2026)

Le dépôt utilise la marque **NOX** à l’affichage. Les identifiants store suivent une stratégie en deux temps.

## Identifiants dans le code

| Élément | Valeur |
|---------|--------|
| Dossier Expo | **`nox-mobile/`** |
| Package racine | **`nox-platform`** |
| Package mobile | **`nox-mobile`** |
| Package serveur | **`nox-server`** |
| Package client web | **`nox-client`** |
| Expo slug | **`nox-mobile`** |
| Nom affiché (stores) | **Nox** |
| **Bundle iOS / Android (TestFlight / dev)** | **`com.insanenightsdays.mobile`** |
| **Bundle cible (App Store / Play publics)** | **`com.nox.mobile`** — voir [PUBLICATION_STORES.md](./mobile/PUBLICATION_STORES.md) |
| URL API fallback (code) | **`https://api.nox.world`** |
| Remote GitHub | **`rapappapapappapa/insane-nights-days-telegram-app`** (renommage `nox-mobile` optionnel) |

## Stratégie bundle ID

| Phase | Bundle | Raison |
|-------|--------|--------|
| **Maintenant** (TestFlight, builds internes) | `com.insanenightsdays.mobile` | Continuité avec la fiche App Store Connect existante (Apple ID `6758730347`) |
| **Avant sortie stores publics** | `com.nox.mobile` | Rebrand technique complet — **nouvelle fiche** iOS/Android obligatoire |

Checklist détaillée : **[PUBLICATION_STORES.md § Migration bundle ID](./mobile/PUBLICATION_STORES.md)**.

## Ops restants

1. **DNS** : pointer `api.nox.world` vers Railway (ou `EXPO_PUBLIC_API_BASE` en attendant).
2. **GitHub** : renommer le repo → `nox-mobile` si souhaité.
3. **Stores** : ne pas soumettre en public sans avoir migré vers `com.nox.mobile`.

---

*Voir [MANQUES_APP.md](./mobile/MANQUES_APP.md) et [ECARTS_FIGMA_VS_APP.md](./mobile/ECARTS_FIGMA_VS_APP.md).*
