# Renommage NOX — effectué (4 août 2026)

Le dépôt a été rebaptisé **NOX** côté code. Checklist ops restante.

## ✅ Fait dans le code

| Élément | Avant | Après |
|---------|--------|--------|
| Dossier Expo | `insane-nights-days-mobile/` | **`nox-mobile/`** |
| Package racine | `insane-nights-days-app` | **`nox-platform`** |
| Package mobile | `insane-nights-days-mobile` | **`nox-mobile`** |
| Package serveur | `insane-nights-days-server` | **`nox-server`** |
| Package client web | `insane-nights-days-client` | **`nox-client`** |
| Expo slug | `insane-nights-days-mobile` | **`nox-mobile`** |
| Bundle iOS / Android | `com.insanenightsdays.mobile` | **`com.nox.mobile`** |
| URL API fallback (code) | `…insane-nights-days-telegram-app…` | **`https://api.nox.world`** |

## ⬜ À faire manuellement (ops)

1. **GitHub** : renommer le repo → `nox-mobile`, puis :
   ```bash
   git remote set-url origin git@github-insane:rapappapapappapa/nox-mobile.git
   ```
2. **DNS** : pointer `api.nox.world` vers Railway (ou définir `EXPO_PUBLIC_API_BASE` / `PUBLIC_URL` avec l’URL Railway actuelle jusqu’à migration).
3. **Railway** : renommer le projet (optionnel) ; mettre à jour les secrets EAS si l’URL change.
4. **Apple / Google developers** : enregistrer le nouveau bundle **`com.nox.mobile`** → **nouvelle fiche store** (pas une simple MAJ de l’ancien ID).
5. **Stripe / Apple Sign-In / Google OAuth** : mettre à jour bundle ID et redirect URIs.
6. **Dossier local dev** : renommer `app telegram` → `nox-mobile` sur chaque machine (hors git).

## ⚠️ Bundle ID

Le passage à `com.nox.mobile` implique un **nouveau binaire store**. Les installs existantes sous `com.insanenightsdays.mobile` ne recevront pas la mise à jour automatique. Planifier migration ou garder l’ancien ID si une release store est déjà live.

---

*Voir [MANQUES_APP.md](./mobile/MANQUES_APP.md) et [ECARTS_FIGMA_VS_APP.md](./mobile/ECARTS_FIGMA_VS_APP.md).*
