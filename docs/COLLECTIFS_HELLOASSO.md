# Collectifs & HelloAsso — adhésions via NOX

Document de cadrage produit (à garder de côté).  
*Dernière mise à jour : 25 août 2026.*

---

## En une phrase

Chaque **collectif** enregistre son **HelloAsso** et le **prix de son adhésion** ; les profils **Communauté** peuvent **rejoindre** un collectif depuis l’app NOX, avec paiement HelloAsso au tarif défini par ce collectif.

---   

## Modèle produit

| Rôle | Profil NOX | Rôle HelloAsso |
|------|------------|----------------|
| **Membre** | `COMMUNITY` | Contributeur / adhérent |
| **Collectif** | `BOOKER` + `bookerType: Collectif` | Organisation (association) |

On **ne crée pas** un nouveau `activeProfileType` pour l’instant : le collectif reste un **booker**, avec un sous-type et une intégration HelloAsso.

### Qui fixe quoi

| | Qui | Quoi |
|---|-----|------|
| **Prix d’adhésion** | Chaque collectif | Cotisation sur **son** compte HelloAsso (gratuit, 5 €, 20 €/an, etc.) |
| **Être « rejoignable »** | Le collectif | Lie HelloAsso + formulaire d’adhésion dans NOX |
| **Rejoindre** | Profil Communauté | Checkout HelloAsso **du collectif choisi** |

NOX **n’impose pas** de prix global : l’app affiche et lance le paiement **du collectif concerné**.

### Multi-collectifs

```
Collectif A (slug HA "asso-techno")   → adhésion 15 €/an
Collectif B (slug HA "collectif-bass") → adhésion 0 €
Collectif C (slug HA "label-xyz")      → adhésion 30 €
```

Chaque collectif = **organisation HelloAsso** + **formulaire d’adhésion** + **tarif propre**.

---

## Parcours utilisateur (Communauté)

```
Marie (Communauté)
   │
   ▼
Découverte collectif (Accueil Reco, Discover, profil booker)
   │
   [ Rejoindre / Adhérer ]
   │
   ▼
NOX → API HelloAsso (checkout-intent adhésion)
   │
   ▼
Paiement HelloAsso (redirect, ~15 min)
   │
   ▼
Retour app + webhook → Marie = membre du collectif sur NOX
```

### Ce que Marie voit

1. Liste / profil d’un **collectif** (déjà partiellement en place : Discover, suggestions accueil).
2. Bouton **Rejoindre** (montant affiché si récupérable depuis HA).
3. Paiement HelloAsso (carte, éventuellement SEPA).
4. Confirmation NOX : **« Tu es membre de [Collectif] »**.
5. Plus tard (V2) : events réservés membres, « Mes adhésions », etc.

---

## Parcours collectif (Booker Collectif)

1. Créer / maintenir le profil NOX `bookerType: Collectif` (inscription existante).
2. **Connecter HelloAsso** : slug organisation, plus tard flux OAuth partenaire.
3. Choisir ou créer le **formulaire d’adhésion** sur HelloAsso.
4. Activer **« Adhésions ouvertes via NOX »** dans le dashboard booker.

Sans liaison HelloAsso → profil visible comme aujourd’hui, **sans** bouton Rejoindre (ou message « adhésions non configurées »).

---

## NOX aujourd’hui vs cible

| Feature actuelle | Adhésion HelloAsso |
|------------------|-------------------|
| `FollowBooker` (suivre le fil) | Complémentaire, pas remplacé |
| `BookerCommunityFriend` (ami orga) | Distinct de l’adhésion |
| Billetterie event (Stripe) | Inchangée pour promoteurs ; option HA plus tard pour collectifs |
| **Rejoindre = adhérer + payer** | **À construire** |

---

## Périmètre HelloAsso (API v5)

Doc : [dev.helloasso.com](https://dev.helloasso.com)

| Besoin NOX | API HA |
|------------|--------|
| Lier un collectif | Slug orga + OAuth (partenaire) ou clés orga (sandbox) |
| Adhérer / payer | **Checkout** : `POST /organizations/{slug}/checkout-intents` |
| Confirmer adhésion | Webhooks **Order** / **Payment** + `GET .../checkout-intents/{id}` |
| Prix / libellé adhésion | Formulaire public adhésion : `GET .../forms/{formType}/{formSlug}/public` |
| Découvrir des assos (option) | Directory / annuaire partenaire |

Sandbox : [helloasso-sandbox.com](https://www.helloasso-sandbox.com) + `api.helloasso-sandbox.com/v5`.

### Paiements : deux rails

| Rail | Usage NOX |
|------|-----------|
| **Stripe** | Promoteurs, indépendants, billets classiques, contrats pro DJ/lieu |
| **HelloAsso** | **Adhésions collectifs** (prix variable par orga) ; billetterie collectif en option plus tard |

---

## Partenariat HelloAsso (prod multi-collectifs)

NOX = **plateforme** avec **plusieurs** collectifs → accès **partenaire** recommandé :

- Contact : [partenariats@helloasso.org](mailto:partenariats@helloasso.org)
- Flux `authorization_code` pour que **chaque** asso autorise NOX
- Endpoints partenaire : `GET /partners/me/organizations`, directory, etc.

Sans partenaire : spike possible avec **une** asso sandbox ; pas suffisant pour « plein de collectifs » en prod.

---

## Esquisse technique (quand on développera)

### Données (indicatif)

Sur `UserBooker` (si `bookerType === 'Collectif'`) :

- `helloAssoOrganizationSlug`
- `helloAssoAdhesionFormType` / `helloAssoAdhesionFormSlug` (optionnel)
- `helloAssoLinkedAt`
- `helloAssoAdhesionEnabled` (bool)

Nouvelle table (indicatif) **`CollectifMembership`** :

- `communityId`, `bookerId` (collectif)
- `helloAssoOrderId` / `checkoutIntentId`
- `status` : `PENDING` | `ACTIVE` | `EXPIRED` | `CANCELLED`
- `amountCents`, `validUntil` (si adhésion annuelle)

### API NOX (indicatif)

- `POST /api/bookers/:id/helloasso/link` — config slug (orga)
- `POST /api/collectifs/:bookerId/join` — crée checkout-intent, retourne `redirectUrl`
- `GET /api/user/me/collectif-memberships` — mes adhésions (commu)
- `POST /api/webhooks/helloasso` — sync statuts

### Mobile (indicatif)

- **Profil collectif** (`bookerProfile`) : bouton **Rejoindre**, badge « Membre »
- **WebBrowser** / deep link retour après paiement HA
- Dashboard booker collectif : onglet **Adhérents** / lien HelloAsso

---

## Roadmap suggérée (après V1 stores)

| Phase | Contenu |
|-------|---------|
| **0** | Mail partenariat HelloAsso + compte sandbox |
| **1** | Collectif lie slug HA (settings) |
| **2** | Bouton **Rejoindre** + checkout + webhook → membre NOX |
| **3** | « Mes adhésions » côté Communauté |
| **4** | (option) Billets events collectif via HelloAsso |

**Ne pas bloquer** la sortie V1 (QA, Resend, `store:check`) sur ce chantier.

---

## Message type pour le patron

> Chaque collectif branche son HelloAsso et fixe son tarif d’adhésion. Les utilisateurs Communauté rejoignent le collectif de leur choix depuis NOX ; le paiement passe par HelloAsso au prix du collectif. NOX gère la découverte et le lien ; HelloAsso gère l’encaissement asso et la conformité.

---

## Références internes

- Collectifs dans l’app : `bookerType: 'Collectif'`, Discover / accueil commu
- Inscription booker : `nox-mobile/screens/auth/RegisterBookerPage.js`
- Modèle : `UserBooker` dans `server/prisma/schema.prisma`
- Paiements actuels billets : Stripe dans `server/routes/registerTicketsAndPayments.js`
- Plan sortie : [`PLAN_V1_SORTIE.md`](../PLAN_V1_SORTIE.md)
