# Identifiants NOX — état actuel (4 août 2026)

Le dépôt utilise exclusivement la marque **NOX**. Checklist ops restante.

## Identifiants dans le code

| Élément | Valeur |
|---------|--------|
| Dossier Expo | **`nox-mobile/`** |
| Package racine | **`nox-platform`** |
| Package mobile | **`nox-mobile`** |
| Package serveur | **`nox-server`** |
| Package client web | **`nox-client`** |
| Expo slug | **`nox-mobile`** |
| Bundle iOS / Android | **`com.nox.mobile`** |
| URL API fallback (code) | **`https://api.nox.world`** |
| Remote GitHub (cible) | **`rapappapapappapa/nox-mobile`** |

## À faire manuellement (ops)

1. **GitHub** : vérifier que le repo s’appelle `nox-mobile`, puis :
   ```bash
   git remote set-url origin git@github.com:rapappapapappapa/nox-mobile.git
   ```
2. **DNS** : pointer `api.nox.world` vers Railway (ou définir `EXPO_PUBLIC_API_BASE` / `PUBLIC_URL` avec l’URL Railway actuelle jusqu’à migration).
3. **Railway** : renommer le projet (optionnel) ; mettre à jour les secrets EAS si l’URL change.
4. **Apple / Google developers** : enregistrer le bundle **`com.nox.mobile`** → **nouvelle fiche store** si une app était déjà publiée sous un autre identifiant.
5. **Stripe / Apple Sign-In / Google OAuth** : mettre à jour bundle ID et redirect URIs.
6. **Dossier local dev** : renommer le dossier de travail si besoin sur chaque machine (hors git).

## Bundle ID store

**`com.nox.mobile`** est un identifiant store distinct : pas de mise à jour automatique pour les utilisateurs d’une app publiée sous un autre bundle. Planifier une nouvelle soumission App Store / Play Store.

---

*Voir [MANQUES_APP.md](./mobile/MANQUES_APP.md) et [ECARTS_FIGMA_VS_APP.md](./mobile/ECARTS_FIGMA_VS_APP.md).*
