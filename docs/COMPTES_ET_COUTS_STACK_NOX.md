# Comptes, services et coûts — stack Nox (app mobile + backend)

Document à usage interne : liste des **comptes nécessaires** pour faire tourner l’application et les **coûts récurrents ou ponctuels** associés.  
**Les montants sont indicatifs** : vérifier systématiquement sur le site officiel de chaque fournisseur au moment de la souscription.

---

## 1. Synthèse rapide

| Service | Rôle | Coût indicatif (à confirmer) |
|--------|------|------------------------------|
| **Railway** (ou équivalent) | Hébergement API Node.js + souvent PostgreSQL | Plan type Hobby ~ **5 $/mois** + usage au-delà du crédit inclus ; plan Pro ~ **20 $/mois** + usage |
| **PostgreSQL** | Base de données (souvent plugin Railway ou instance managée) | Souvent inclus / facturé dans l’usage Railway |
| **Cloudflare R2** | Stockage fichiers (médias, images) — compatible S3 | Stockage + requêtes : **très faible** en début de projet ; voir grille Cloudflare |
| **Resend** | Envoi d’e-mails (inscription, mot de passe, contrats, etc.) | Gratuit jusqu’à **~3 000 e-mails/mois** ; au-delà : plan payant |
| **Stripe** | Paiements (billets, intents) | **Pas d’abonnement** classique ; **frais par transaction** (ex. ~1,4 % + 0,25 € par paiement carte en zone EU — voir Stripe) |
| **Expo (EAS)** | Builds iOS/Android + mises à jour OTA (`expo-updates`) | Compte **gratuit** possible ; builds au-delà des quotas = **usage facturé** (crédits EAS) |
| **Apple Developer Program** | Publier sur l’App Store / TestFlight | **~99 $/an** (facturé en dollars par Apple) |
| **Google Play Console** | Publier sur le Play Store | **Frais d’inscription ponctuels** (historiquement ~25 $ une fois — vérifier sur Google) |
| **Nom de domaine** | Site, e-mails type `noreply@…`, CDN R2 | Variable (ex. **~10–40 €/an** selon extension et registrar) |
| **GitHub** (si dépôt privé / CI) | Code, éventuellement Actions | Gratuit avec limites ; **Team** payant si besoin |

**À ne pas oublier :** clés secrètes côté serveur (`JWT_SECRET`, clés API, webhooks) — **aucun coût**, mais **à stocker de façon sécurisée** (variables d’environnement sur Railway, jamais dans le dépôt public).

---

## 2. Détail par brique (lien avec le projet)

### 2.1 Hébergement backend + base de données — **Railway** (référence actuelle)

- **Compte :** [railway.app](https://railway.app)
- **Usage dans le projet :** déploiement du serveur Node (`server/`), variable `PUBLIC_URL`, `PORT`, souvent `DATABASE_URL` si PostgreSQL est attaché au projet.
- **Coût :** modèle **abonnement + usage** (crédits inclus selon le plan). Dépasser le crédit = facturation du surplus.
- **Alternative mentionnée dans le code :** **Render** (même idée : PaaS + Postgres).

### 2.2 Base de données — **PostgreSQL**

- Souvent fournie par **Railway** (plugin Postgres) → une URL `DATABASE_URL` dans l’environnement.
- **Coût :** généralement **inclus dans la facture d’hébergement** ou en supplément selon la taille de l’instance.

### 2.3 Stockage médias — **Cloudflare R2**

- **Compte :** Cloudflare (R2 = stockage objet type S3).
- **Usage dans le projet :** `MEDIA_STORAGE=r2`, variables `R2_*`, `R2_PUBLIC_BASE_URL` (CDN / domaine custom conseillé pour les URLs publiques).
- **Coût :** facturation **stockage + opérations** ; pas de facturation « egress » classique comme S3 pour beaucoup de cas — voir **tarifs R2** sur le site Cloudflare.

### 2.4 E-mails transactionnels — **Resend**

- **Compte :** [resend.com](https://resend.com)
- **Usage dans le projet :** `RESEND_API_KEY`, `RESEND_FROM` (ex. expéditeur sur domaine vérifié type `noreply@…`).
- **Coût :** **gratuit** avec quota mensuel (ordre de grandeur **3 000 e-mails/mois** sur l’offre gratuite — à confirmer) ; domaine à **vérifier** (DNS SPF/DKIM).
- **Alternative dans le code :** **SMTP** (Gmail, O365, etc.) — possible mais moins adapté en production à grande échelle.

### 2.5 Paiements — **Stripe**

- **Compte :** [stripe.com](https://stripe.com) (mode **test** puis **live**).
- **Usage dans le projet :** `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` (mobile), `STRIPE_WEBHOOK_SECRET` pour les webhooks.
- **Coût :** pas de frais fixes obligatoires au même titre qu’un abonnement SaaS ; **commission par paiement réussi** selon pays et moyen de paiement (carte, etc.) — consulter la **grille Stripe** pour la France / l’UE.

### 2.6 Application mobile — **Expo / EAS**

- **Compte :** [expo.dev](https://expo.dev) (lié au projet via `app.json` / `eas.json`).
- **Usage dans le projet :** builds **EAS** (Android `.aab` / APK, iOS), **EAS Update** (mises à jour JS sans repasser par les stores), `EXPO_PUBLIC_*` au build (ex. `EXPO_PUBLIC_API_BASE`, `EXPO_PUBLIC_EVENT_MIN_LEAD_DAYS`).
- **Coût :** compte gratuit avec **limites de builds** ; au-delà, **facturation à l’usage** (crédits EAS — voir [expo.dev/pricing](https://expo.dev/pricing)).

### 2.7 Stores — **Apple** et **Google**

- **Apple Developer Program** : compte obligatoire pour **TestFlight** et **App Store** — tarif **annuel** fixe (ordre de **~99 $/an**).
- **Google Play Console** : frais d’inscription **ponctuels** (souvent un petit montant **une fois**, à vérifier sur la doc Google Play).

### 2.8 Nom de domaine et DNS

- Indispensable pour : site vitrine, **e-mails** professionnels, **vérification du domaine** Resend, éventuellement **sous-domaine** pointant vers l’API ou le CDN R2.
- **Coût :** renouvellement **annuel** selon registrar (.com, .world, etc.).

### 2.9 Développement / code — **GitHub** (ou équivalent)

- Hébergement du dépôt ; si **privé** et besoin d’équipe/CI avancée, plans payants possibles.
- **Coût :** souvent **0 €** pour un petit équipe sur GitHub Free avec limites.

---

## 3. Variables d’environnement principales (serveur)

Fichier de référence dans le dépôt : `server/env.example.txt`.

| Catégorie | Exemples de variables |
|-----------|------------------------|
| Serveur | `PORT`, `PUBLIC_URL`, `JWT_SECRET`, `DATABASE_URL` |
| Médias | `MEDIA_STORAGE`, `R2_*`, `R2_PUBLIC_BASE_URL` |
| E-mail | `RESEND_API_KEY`, `RESEND_FROM` ou SMTP |
| Paiements | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Métier | `EVENT_MIN_LEAD_DAYS`, `BOOKER_ALLOW_DELETE_WITH_TICKETS`, etc. |

---

## 4. Variables côté app mobile (build)

Exemples utilisés dans le projet :

- `EXPO_PUBLIC_API_BASE` : URL du backend (Railway ou autre).
- `EXPO_PUBLIC_EVENT_MIN_LEAD_DAYS` : alignement UI avec la règle serveur (ex. `0` en test, `7` en prod).

Ces valeurs sont **injectées au moment du build EAS**, pas dans le code source en clair pour la prod.

---

## 5. Checklist « comptes à créer / rattacher » pour l’entreprise

1. **Railway** (ou PaaS équivalent) — facturation carte entreprise.  
2. **Cloudflare** — R2 + (optionnel) DNS du domaine.  
3. **Resend** — compte + domaine d’envoi vérifié.  
4. **Stripe** — compte entreprise, IBAN pour versements, activation live.  
5. **Expo** — organisation / compte pour les builds et Update.  
6. **Apple Developer** — compte entreprise (D-U-N-S si société selon procédure Apple).  
7. **Google Play Console** — compte développeur.  
8. **Registrar de domaine** — renouvellement annuel.  
9. **GitHub** (ou GitLab / Bitbucket) — accès équipe au dépôt.

---

## 6. Notes pour la direction / finance

- Les **montants fixes** les plus visibles sont en général : **hébergement (Railway)**, **Apple (annuel)**, **domaine (annuel)**, éventuellement **Expo** si beaucoup de builds.  
- **Stripe** se répercute surtout comme **% du chiffre encaissé**, pas comme abonnement.  
- **Resend** peut rester **0 €** tant que le volume d’e-mails reste dans le quota gratuit.  
- Prévoir une **marge** sur l’hébergement si le trafic ou la base augmente (usage Railway au-delà des crédits inclus).

---

*Document généré à partir de la stack du dépôt (backend `server/`, mobile `nox-mobile/`). À mettre à jour lors d’un changement de fournisseur ou de tarifs.*
