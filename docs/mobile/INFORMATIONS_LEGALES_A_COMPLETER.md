# Informations légales à compléter — Nox

**Objectif :** un seul endroit pour savoir **quoi** renseigner et **où** le mettre (code, pages web, stores).

> **Pour le patron / l’éditeur :** utilise le formulaire imprimable **[FORMULAIRE_LEGAL_EDITEUR.md](./FORMULAIRE_LEGAL_EDITEUR.md)** (tableaux + texte à trou). Une fois complété, reporte les réponses dans le code via la section B ci-dessous.

> Remplis d’abord le **bloc A** ci-dessous, puis propage les valeurs aux emplacements listés.

---

## A. Formulaire à remplir (source de vérité)

Copie ce bloc, complète-le, garde-le pour ton équipe / ton patron.

```
=== ÉDITEUR / RESPONSABLE DU TRAITEMENT ===
Raison sociale          :
Forme juridique         :  (ex. SAS, SARL, auto-entrepreneur…)
Capital social          :  (si société)
SIRET                   :
Numéro TVA intracom.    :  (si applicable)
Siège social (adresse)  :
Pays                    :  France
Directeur de publication:
Email support           :  support@nox.world   ← déjà utilisé dans le projet
Email contact légal     :  (peut être le même que support)
Téléphone support       :  (optionnel stores)

=== HÉBERGEMENT ===
Hébergeur API (backend) :  Railway Corp.
Adresse hébergeur       :  548 Market St, San Francisco, CA 94104, USA
Hébergeur fichiers      :  Cloudflare R2 (si questionné)
Hébergeur emails        :  Resend

=== APPLICATION ===
Nom affiché store       :  Nox
Nom long / marque       :  Insane Nights & Days
Bundle ID iOS           :  com.insanenightsdays.mobile   ← déjà fixé
Package Android         :  com.insanenightsdays.mobile   ← déjà fixé
Site web / URL support  :  https://nox.world             (ou URL Railway si pas de site)
Date mise à jour docs   :  17 juin 2026

=== URLS LÉGALES PUBLIQUES (après déploiement serveur) ===
Base API prod           :  https://insane-nights-days-telegram-app-production.up.railway.app
Politique confidentialité: {BASE}/legal/privacy.html
CGU                     :  {BASE}/legal/cgu.html
CGV                     :  {BASE}/legal/cgv.html
Mentions légales        :  {BASE}/legal/mentions.html
Index légal             :  {BASE}/legal/
```

---

## B. Tableau : quoi → où

| Information | Statut actuel | Où la saisir |
|-------------|---------------|--------------|
| **Raison sociale** | ❌ À compléter | ① `legalConfig.js` → `LEGAL_PUBLISHER_NAME` · ② `server/public/legal/mentions.html` · ③ App Store Connect · ④ Play Console |
| **Siège social** | ❌ À compléter | ① `LEGAL_PUBLISHER_ADDRESS` · ② `mentions.html` · ③ Play Console (adresse développeur) |
| **Directeur de publication** | ❌ À compléter | ① `LEGAL_PUBLISHER_DIRECTOR` · ② `mentions.html` |
| **Email support** | ✅ `support@nox.world` | ① `LEGAL_SUPPORT_EMAIL` · ② tous les HTML `/legal/*` · ③ App Store Connect · ④ Play Console · ⑤ `store-metadata/*.txt` |
| **Email expéditeur (noreply)** | ✅ `noreply@nox.world` | `server/.env` → `RESEND_FROM` (pas dans l’app) |
| **Date mise à jour CGU/CGV/confidentialité** | ✅ 17 juin 2026 | ① `LEGAL_LAST_UPDATED_FR` / `_EN` · ② textes dans `LegalPage.js` (placeholders auto) · ③ HTML si tu changes la date à la main |
| **Responsable traitement (RGPD)** | ⚠️ Dérivé de raison sociale + adresse | ① `legalConfig.js` (via placeholders privacy) · ② `privacy.html` (paragraphe §1) |
| **Hébergeur backend** | ✅ Railway | ① `LEGAL_HOST_NAME` / `LEGAL_HOST_ADDRESS` · ② `mentions.html` |
| **Nom app** | ✅ Nox | `app.json` → `expo.name` · stores |
| **Nom long** | ✅ Insane Nights & Days | `LEGAL_APP_NAME_LONG` · textes légaux |
| **SIRET / TVA** | ❌ Non dans le code | À ajouter dans `mentions.html` + éventuellement `legalConfig.js` si tu veux l’afficher in-app |
| **URL politique confidentialité** | ✅ Route serveur prête | App Store Connect + Play Console (champ obligatoire) — voir URLs section A |
| **CGU / CGV in-app** | ✅ Écrans présents | `LegalPage.js` — contenu rempli via `applyLegalPlaceholders()` |
| **Case CGU à l’inscription** | ✅ En place | `LoginPage.js` |
| **Case CGV avant achat billet** | ✅ En place | `EventDetailPage.js` / `useEventDetailPurchase.js` |
| **Export / suppression compte (RGPD)** | ✅ En place | `ProfilePage.js` — pas de saisie légale supplémentaire |

**Légende :** ✅ fait · ⚠️ partiel · ❌ à compléter par l’éditeur

---

## C. Fichiers du dépôt — détail fichier par fichier

### ① Fichier principal (à modifier en premier)

**`insane-nights-days-mobile/constants/legalConfig.js`**

| Constante | Valeur actuelle | À mettre |
|-----------|-----------------|----------|
| `LEGAL_PUBLISHER_NAME` | `[Raison sociale à compléter]` | Nom légal de la société / éditeur |
| `LEGAL_PUBLISHER_ADDRESS` | `[Adresse du siège à compléter]` | Adresse complète du siège |
| `LEGAL_PUBLISHER_DIRECTOR` | `[Directeur de publication à compléter]` | Nom du directeur de publication |
| `LEGAL_SUPPORT_EMAIL` | `support@nox.world` | Changer seulement si autre boîte |
| `LEGAL_LAST_UPDATED_FR` | `17 juin 2026` | Date de dernière révision des docs |
| `LEGAL_HOST_NAME` | `Railway Corp.` | Laisser sauf autre hébergeur |
| `LEGAL_HOST_ADDRESS` | Adresse Railway | Laisser sauf autre hébergeur |

→ Après modification : les écrans **CGU, CGV, mentions, confidentialité** in-app (`LegalPage.js`) se mettent à jour automatiquement.

---

### ② Pages légales publiques (URL pour les stores)

**Dossier : `server/public/legal/`**

| Fichier | URL publique | Ce qu’il faut encore éditer |
|---------|--------------|----------------------------|
| `privacy.html` | `/legal/privacy.html` | §1 responsable : remplacer le texte générique par raison sociale + adresse si tu veux plus de précision |
| `cgu.html` | `/legal/cgu.html` | Rien d’obligatoire (email déjà OK) |
| `cgv.html` | `/legal/cgv.html` | Rien d’obligatoire |
| `mentions.html` | `/legal/mentions.html` | **Obligatoire** : enlever le bandeau jaune et mettre raison sociale, siège, directeur, SIRET si tu l’as |
| `index.html` | `/legal/` | Rien d’obligatoire |

**Route serveur :** `server/index.js` → `app.use('/legal', …)` (déjà configuré).

**Après edit :** redéployer Railway, puis tester dans le navigateur (navigation privée).

---

### ③ Textes longs in-app (rarement à toucher)

**`insane-nights-days-mobile/screens/legal/LegalPage.js`**

Contient le texte intégral CGU / CGV / mentions / confidentialité (FR + EN).  
Les `[À compléter]` sont remplacés à l’affichage par `legalConfig.js`.  
Tu n’édites ce fichier **que si** tu changes le fond du contrat (nouvel article, nouvelle règle métier).

---

### ④ Fiches stores (textes marketing)

| Fichier | Usage |
|---------|--------|
| `insane-nights-days-mobile/store-metadata/app-store-description-fr.txt` | Description App Store |
| `insane-nights-days-mobile/store-metadata/play-store-description-fr.txt` | Description Play Store |
| `insane-nights-days-mobile/store-metadata/whats-new-fr.txt` | Notes de version |

Email support déjà présent — ajouter URL site si tu en as une.

---

### ⑤ Identité technique app (ne pas changer sans raison)

| Fichier | Champ | Valeur |
|---------|-------|--------|
| `insane-nights-days-mobile/app.json` | `expo.name` | `Nox` |
| `insane-nights-days-mobile/app.json` | `expo.ios.bundleIdentifier` | `com.insanenightsdays.mobile` |
| `insane-nights-days-mobile/app.json` | `expo.android.package` | `com.insanenightsdays.mobile` |
| `insane-nights-days-mobile/app.json` | `expo.version` | `1.0.0` |
| `server/env.example.txt` | `RESEND_FROM` | `Nox <noreply@nox.world>` |

---

## D. Consoles externes (hors dépôt)

### App Store Connect (iOS)

[appstoreconnect.apple.com](https://appstoreconnect.apple.com) → App **Nox**

| Champ Apple | Quoi mettre |
|-------------|-------------|
| **Privacy Policy URL** | `https://…/legal/privacy.html` |
| **Support URL** | Site vitrine ou `https://nox.world` |
| **Marketing URL** | Optionnel |
| **Contact / support email** | `support@nox.world` |
| **Copyright** | `2026 {Raison sociale}` |
| **Age Rating** | Questionnaire (événements, paiements → souvent 17+) |
| **App Privacy (nutrition labels)** | Déclarer : email, nom, paiements (Stripe), identifiants, etc. |

### Google Play Console (Android)

[play.google.com/console](https://play.google.com/console)

| Champ Google | Quoi mettre |
|--------------|-------------|
| **Politique de confidentialité** | Même URL `/legal/privacy.html` |
| **Adresse développeur** | Siège social (visible publiquement) |
| **Email contact** | `support@nox.world` |
| **Formulaire Sécurité des données** | Aligné sur `privacy.html` + Stripe + Resend + Yousign |
| **Classification contenu** | Questionnaire (paiements, utilisateurs, etc.) |

### Autres services (infos légales indirectes)

| Service | Où | Info légale |
|---------|-----|-------------|
| **Resend** | resend.com | Domaine `nox.world` vérifié (SPF/DKIM) |
| **Stripe** | dashboard.stripe.com | Raison sociale + IBAN pour virements ; mentions sur factures |
| **Railway** | railway.app | Facturation au nom de l’éditeur |
| **Domaine nox.world** | Registrar / DNS | WHOIS = souvent adresse admin (peut différer du siège) |

---

## E. Ordre de travail recommandé

1. Remplir le **bloc A** (formulaire) avec ton patron / comptable.
2. Reporter dans **`legalConfig.js`** (3 constantes `LEGAL_PUBLISHER_*`).
3. Mettre à jour **`server/public/legal/mentions.html`** (et `privacy.html` §1 si besoin).
4. **Déployer** le serveur sur Railway.
5. Tester les 4 URLs dans un navigateur.
6. Coller l’URL privacy dans **App Store Connect** et **Play Console**.
7. Lancer `npm run store:check` dans `insane-nights-days-mobile`.

---

## F. Vérification rapide

```bash
cd insane-nights-days-mobile
npm run store:check
```

Si tu vois encore :

```
⚠️  Raison sociale encore à compléter dans constants/legalConfig.js
```

→ le bloc A n’est pas encore propagé dans le code.

---

## G. Liens utiles

- Checklist publication complète : [`PUBLICATION_STORES.md`](./PUBLICATION_STORES.md)
- Plan sortie v1 : [`../../PLAN_V1_SORTIE.md`](../../PLAN_V1_SORTIE.md)
- Coûts & comptes : [`../COMPTES_ET_COUTS_STACK_NOX.md`](../COMPTES_ET_COUTS_STACK_NOX.md)
