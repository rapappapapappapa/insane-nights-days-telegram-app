# Publication App Store & Play Store — Nox

Checklist pour passer de **TestFlight / builds Expo internes** à une **publication officielle** sur les stores, tout en continuant à développer via **EAS Update**.

**État actuel du projet**

| Élément | Statut |
|--------|--------|
| iOS TestFlight (canal `production`) | ✅ En place |
| Android APK interne (canal `preview`) | ✅ En place |
| Profil EAS `production` → `store` | ✅ Configuré |
| EAS Submit (`eas.json`) | ✅ Configuré |
| Pages légales publiques (`/legal/*`) | ✅ Ajoutées côté serveur |
| Scripts npm build / submit / check | ✅ Ajoutés |
| Textes store (brouillons FR) | ✅ `store-metadata/` |

---

## Phase 0 — Vérification automatique

```bash
cd insane-nights-days-mobile
npm run store:check
```

Corrige les points ❌ avant de continuer.

---

## Phase 1 — Comptes & accès (à faire par toi / l’éditeur)

- [ ] **Apple Developer Program** actif (~99 $/an) — [developer.apple.com](https://developer.apple.com/programs/)
- [ ] **Google Play Console** créé (~25 $ une fois) — [play.google.com/console](https://play.google.com/console)
- [ ] Compte **Expo** connecté : `eas login` / `eas whoami`
- [ ] Accès **App Store Connect** à l’app `com.insanenightsdays.mobile`
- [ ] Accès **Google Play** à l’app `com.insanenightsdays.mobile` (à créer si première fois)

---

## Phase 2 — Infos légales (partiellement fait)

### Déjà fait dans le dépôt

- Pages in-app : CGU, CGV, mentions, confidentialité (`LegalPage.js`)
- Pages **publiques** (obligatoires stores) servies par le backend :
  - `https://<API_PROD>/legal/privacy.html`
  - `https://<API_PROD>/legal/cgu.html`
  - `https://<API_PROD>/legal/cgv.html`
  - `https://<API_PROD>/legal/mentions.html`

URL prod actuelle (Railway) :

```
https://insane-nights-days-telegram-app-production.up.railway.app/legal/privacy.html
```

> Si tu as un domaine `nox.world` pointant vers l’API ou un site vitrine, tu pourras utiliser `https://nox.world/legal/...` à la place — à mettre à jour dans App Store Connect / Play Console.

### À compléter manuellement

Voir le détail champ par champ : **[INFORMATIONS_LEGALES_A_COMPLETER.md](./INFORMATIONS_LEGALES_A_COMPLETER.md)**

- [ ] Renseigner la **raison sociale**, **siège** et **directeur de publication** dans `insane-nights-days-mobile/constants/legalConfig.js`
- [ ] Vérifier que `support@nox.world` existe et répond (boîte support)
- [ ] Déployer le serveur sur Railway (route `/legal`) — **push `server/`** si pas encore déployé
- [ ] Tester les URLs légales dans un navigateur (sans être connecté à l’app)

---

## Phase 3 — Backend & paiements prod

- [ ] Variables Railway prod : `STRIPE_*` (mode **live**), `YOUSIGN_*`, `RESEND_*`, `JWT_SECRET`, etc.
- [ ] `EXPO_PUBLIC_API_BASE` en EAS Secrets → URL Railway prod
- [ ] Stripe : clés **live** + webhook prod configuré
- [ ] `EXPO_PUBLIC_HIDE_SCAN_TEST_UI=true` en prod (masquer le bandeau scan test)
- [ ] Parcours complet testé : inscription → événement → achat billet → contrat → paiement → signature

---

## Phase 4 — Assets & fiche store

### Visuels

- [ ] Icône 1024×1024 (`assets/icon.png`)
- [ ] Splash final (`assets/splash-icon.png`)
- [ ] Icône adaptive Android (`assets/adaptive-icon.png`)
- [ ] **Captures iPhone** 6,7" (min. 3–5 écrans représentatifs)
- [ ] **Captures Android** phone (min. 2–8)
- [ ] Optionnel : iPad si `supportsTablet: true`

### Textes (brouillons dans `store-metadata/`)

- [ ] Relire / adapter `app-store-description-fr.txt`
- [ ] Relire / adapter `play-store-description-fr.txt`
- [ ] Notes de version : `whats-new-fr.txt`
- [ ] **Catégorie** suggérée : Lifestyle ou Entertainment
- [ ] **Âge** : 17+ / 18+ (contenu événementiel, paiements)
- [ ] Déclarer les **achats** : paiements via Stripe (hors IAP Apple pour la billetterie tierce — à valider avec les règles Apple ; souvent acceptable si biens/services consommés hors app)

### App Store Connect (iOS)

- [ ] Créer la fiche « Nox » si pas déjà fait
- [ ] URL politique de confidentialité → `/legal/privacy.html`
- [ ] Renseigner **Support URL** et email support
- [ ] Questionnaire **chiffrement** : `ITSAppUsesNonExemptEncryption: false` déjà dans `app.json` ✅
- [ ] **Sign in with Apple** : déjà configuré ✅
- [ ] Soumettre le build TestFlight en **App Review**

### Google Play Console (Android)

- [ ] Créer l’application
- [ ] Formulaire **sécurité des données** (données collectées, Stripe, etc.)
- [ ] **Politique de confidentialité** → même URL `/legal/privacy.html`
- [ ] Téléverser le **AAB** (pas l’APK preview)
- [ ] Commencer par piste **internal** ou **closed testing**, puis **production**

---

## Phase 5 — Build & soumission (commandes)

### iOS (souvent le plus rapide — build TestFlight déjà proche)

```bash
cd insane-nights-days-mobile

# Option A : soumettre le dernier build production déjà sur TestFlight
npm run submit:store:ios

# Option B : nouveau build puis soumission
npm run build:store:ios
npm run submit:store:ios
```

Puis dans **App Store Connect** → sélectionner le build → **Soumettre pour examen**.

### Android (nouveau build production obligatoire)

```bash
cd insane-nights-days-mobile
npm run build:store:android
npm run submit:store:android
```

Pour `eas submit` Android en automatique, créer un **compte de service** Google Play et placer la clé JSON (ne pas committer) :

```bash
# une fois la clé obtenue :
# insane-nights-days-mobile/google-play-service-account.json  (gitignored)
```

Sinon : télécharger le `.aab` depuis [expo.dev](https://expo.dev) et l’uploader manuellement dans Play Console.

### Aligner les canaux OTA après publication Android

Aujourd’hui Android utilise le canal `preview`, iOS le canal `production`. **Après** le premier build Android store :

- [ ] Publier les updates Android sur le canal **`production`** (modifier `scripts/publish-update-both.sh` ou créer `update:production:both`)
- [ ] Vérifier compatibilité OTA : `npm run eas:verify-fingerprint`

---

## Phase 6 — Après publication (développement continu)

| Besoin | Action |
|--------|--------|
| Correctif JS / UI | `npm run update:both` — pas de review store |
| Nouveau module natif (expo-camera, Stripe…) | `npm run build:store:*` + nouvelle soumission |
| Backend | Push Railway comme aujourd’hui |
| Version visible store | Incrémenter `version` dans `app.json` + nouveau build |

**Tu peux continuer à développer normalement.** La publication store ne fige pas le projet.

---

## Délais indicatifs

| Étape | Délai |
|-------|-------|
| Build EAS production | 15–45 min |
| Review Apple (1ère soumission) | 1–5 jours |
| Review Google (1ère soumission) | Quelques heures – 3 jours |
| OTA après publication | Quasi immédiat (au prochain lancement app) |

---

## Fichiers utiles du dépôt

| Fichier | Rôle |
|---------|------|
| **`docs/mobile/INFORMATIONS_LEGALES_A_COMPLETER.md`** | **Quoi remplir et où (formulaire + tableau)** |
| `insane-nights-days-mobile/eas.json` | Profils build + submit |
| `insane-nights-days-mobile/app.json` | Version, bundle ID, permissions |
| `insane-nights-days-mobile/constants/legalConfig.js` | Email support, placeholders éditeur |
| `server/public/legal/*.html` | Pages légales publiques |
| `insane-nights-days-mobile/store-metadata/` | Descriptions store |
| `insane-nights-days-mobile/scripts/verify-store-readiness.sh` | Contrôle automatique |

---

## Prochaines actions recommandées (ordre)

1. Compléter `legalConfig.js` (raison sociale, adresse)
2. Déployer le serveur + tester `/legal/privacy.html`
3. `npm run store:check`
4. **iOS** : soumettre le build TestFlight en review (le plus court)
5. **Android** : `npm run build:store:android` + fiche Play Console
6. Après validation : aligner canal OTA Android sur `production`
