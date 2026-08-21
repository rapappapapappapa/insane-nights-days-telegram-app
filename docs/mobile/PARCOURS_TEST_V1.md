# Parcours de test V1 — NOX Mobile

Checklist manuelle pour la sortie V1.  
**Dernière mise à jour : 21 août 2026** · branche `railway-phase1`

---

## Préparation

| Champ | Valeur |
|-------|--------|
| Testeur | |
| Date | |
| Device 1 (iOS) | modèle / OS |
| Device 2 (Android) | modèle / OS |
| OTA reçu | oui / non — date |
| Comptes utilisés | neuf / existant / DJ / orga / lieu |

**Comptes & données utiles**

- [ ] 1 compte **neuf** (ou app réinstallée) pour tutorial + inscription
- [ ] 1 compte **Communauté** existant
- [ ] 1 compte **DJ** et/ou **Organisateur** et/ou **Lieu**
- [ ] 1 événement **public** avec billet Stripe
- [ ] 1 événement **non publié** ou non accessible (pour test visibilité)

**Grille de sévérité**

| Symbole | Signification |
|---------|---------------|
| 🔴 | Bloquant — crash, impossible de payer / se connecter |
| 🟠 | Majeur — feature cassée mais contournable |
| 🟡 | Mineur — UX, texte, lenteur |
| 🔵 | Idée / polish |

**Avant chaque session**

- [ ] App tuée puis relancée à froid (OTA pris en compte)
- [ ] Noter profil actif (COMMUNITY / DJ / BOOKER / VENUE / PRESTATAIRE)

---

## P0 — Parcours critique (~30–45 min)

### 1. Auth & onboarding

| ✓ | # | Action | Résultat attendu | iOS | Android | Notes / bug |
|---|---|--------|------------------|-----|---------|-------------|
| [ ] | 1.1 | Inscription **Communauté** (compte neuf) | OTP email ou écran vérif, pas de crash | | | |
| [ ] | 1.2 | **1ère connexion** après inscription | Guide NOX une fois ; Passer ou Commencer → accueil | | | |
| [ ] | 1.3 | Déconnexion → reconnexion | Guide **non** reproposé | | | |
| [ ] | 1.4 | Mot de passe oublié (email → code → reset) | Login OK avec nouveau MDP | | | |
| [ ] | 1.4b | MDP oublié en **mode avion** | « Impossible de joindre le serveur… » | | | |
| [ ] | 1.5 | OTP : « Mauvais email ? Le corriger » | Nouvel email + renvoi code sans déco | | | |
| [ ] | 1.6 | Connexion email / pseudo + MDP incorrect | Message d’erreur clair | | | |

### 2. Accueil Communauté

| ✓ | # | Action | Résultat attendu | iOS | Android | Notes / bug |
|---|---|--------|------------------|-----|---------|-------------|
| [ ] | 2.1 | Onglet **Recommandations** | Events, DJs, lieux, collectifs | | | |
| [ ] | 2.2 | Filtre **Style** | Liste filtrée, reset OK | | | |
| [ ] | 2.3 | Filtre **Ville** | Liste filtrée, reset OK | | | |
| [ ] | 2.4 | Tri **Mieux notés** | DJs triés par note | | | |
| [ ] | 2.5 | Tri **Top followers 7j** | DJs triés par gain followers | | | |
| [ ] | 2.6 | Onglet **Fil** → **Découverte** | Posts + événements publiés | | | |
| [ ] | 2.7 | **Fil** → **Abonnements** (connecté) | Posts des profils suivis | | | |
| [ ] | 2.8 | **Fil** → **Abonnements** (non connecté) | Message « Connecte-toi » | | | |
| [ ] | 2.9 | Barre recherche → **Ouvrir Découvrir…** | Navigation Discover OK | | | |
| [ ] | 2.10 | **Mode avion** onglet Reco | Message réseau + **Réessayer** | | | |
| [ ] | 2.11 | **Mode avion** onglet Fil | Message réseau + **Réessayer** | | | |
| [ ] | 2.12 | Pull-to-refresh Reco et Fil | Recharge sans crash | | | |

### 3. Événement & billet

| ✓ | # | Action | Résultat attendu | iOS | Android | Notes / bug |
|---|---|--------|------------------|-----|---------|-------------|
| [ ] | 3.1 | Event **public** depuis Reco | Détail correct (vraies données) | | | |
| [ ] | 3.2 | Event ID **invalide** / erreur API | Écran erreur + **Réessayer** (pas faux event « Nox Night ») | | | |
| [ ] | 3.3 | Achat billet Stripe | Paiement → succès | | | |
| [ ] | 3.4 | Ticket dans **Tickets** + QR | QR scannable / affiché | | | |
| [ ] | 3.5 | Event **non visible** (non publié, non participant) | Refus ou erreur, pas de tunnel d’achat fantôme | | | |

### 4. Feed & social

| ✓ | # | Action | Résultat attendu | iOS | Android | Notes / bug |
|---|---|--------|------------------|-----|---------|-------------|
| [ ] | 4.1 | Like sur un post | Compteur mis à jour | | | |
| [ ] | 4.2 | Commentaire sur un post | Commentaire visible | | | |
| [ ] | 4.3 | Notif feed (like) → tap | Fil ouvert, post surligné / scroll | | | |
| [ ] | 4.4 | Notif feed (commentaire) → tap | Commentaires ouverts sur le bon post | | | |
| [ ] | 4.5 | Suivre un DJ → Fil Abonnements | Ses posts visibles | | | |
| [ ] | 4.6 | Signalement / suppression (si auteur) | Modale / confirmation OK | | | |

### 5. Menu radial NX

| ✓ | Rôle | Entrées à vérifier | Agenda au centre | iOS | Android | Notes |
|---|---|-------------------|------------------|-----|---------|-------|
| [ ] | **COMMUNITY** | Home / Tickets / Agenda / Notifs / Profil | oui | | | |
| [ ] | **DJ·BOOKER·PRESTA** | Home / Booking / Agenda / Publier / Notifs | oui | | | |
| [ ] | **VENUE** | Accueil / Demandes / Agenda / Notifs / Profil | oui | | | |
| [ ] | Tous | Drawer → **Guide NOX** | Tutorial manuel OK | | | |

---

## P1 — Par profil (~45–60 min chacun)

### Communauté

| ✓ | Action | iOS | Android | Notes |
|---|--------|-----|---------|-------|
| [ ] | Amis : envoyer demande | | | |
| [ ] | Amis : accepter / refuser | | | |
| [ ] | Amis : recherche utilisateur | | | |
| [ ] | Amis : ouvrir event depuis liste (pas double redirect) | | | |
| [ ] | Profil commu : édition (nom, bio, photo) | | | |
| [ ] | Discover : parcourir events / DJs / lieux | | | |
| [ ] | Notifications cloche accueil : liste, lu/non lu | | | |
| [ ] | Opt-in push 1ère visite (accepter / refuser) | | | |
| [ ] | Drawer : CGU, CGV, mentions, privacy | | | |
| [ ] | RGPD : export données | | | |
| [ ] | RGPD : suppression compte (compte test!) | | | |

### DJ

| ✓ | Action | iOS | Android | Notes |
|---|--------|-----|---------|-------|
| [ ] | Dashboard : onglet **Paiements** (cachets réels, pas placeholder) | | | |
| [ ] | Dashboard : deep link section tarifs / paiements (`openSection`) | | | |
| [ ] | Bookings + chat booking (pas clignotement / blocage) | | | |
| [ ] | **Publier** post feed → visible Fil Découverte | | | |
| [ ] | Profil DJ → « Voir tous les avis » → djRatings | | | |
| [ ] | Repost publication d’un autre artiste | | | |
| [ ] | Lister onglets encore « Bientôt disponible » | | | |

### Organisateur (Booker)

| ✓ | Action | iOS | Android | Notes |
|---|--------|-----|---------|-------|
| [ ] | Créer / éditer un événement | | | |
| [ ] | Publier event sur le feed (`publishedOnFeed`) | | | |
| [ ] | Dashboard event : marquer payé **DJ** | | | |
| [ ] | Dashboard event : marquer payé **lieu** | | | |
| [ ] | Dashboard event : marquer payé **prestataire** | | | |
| [ ] | Chat orga ↔ DJ / lieu | | | |
| [ ] | Amis booker | | | |

### Lieu (Venue)

| ✓ | Action | iOS | Android | Notes |
|---|--------|-----|---------|-------|
| [ ] | Dashboard : demandes entrantes | | | |
| [ ] | **Médias** : ajout photo / vidéo / URL | | | |
| [ ] | **Médias** : suppression avec confirmation | | | |
| [ ] | Chat booking : contrat, acceptation | | | |
| [ ] | Contrat sans montant → alerte explicite | | | |
| [ ] | Retour chat stable (pas clignotement) | | | |
| [ ] | Profil lieu → avis venueRatings | | | |
| [ ] | ⚠️ FAB **Publier** feed lieux | *Non implémenté — noter comportement* | | | |

---

## P2 — Régressions récentes (OTA sem. 11–23 août)

Cocher si OK sur **les deux** plateformes.

| ✓ | Sujet | iOS | Android | Notes |
|---|-------|-----|---------|-------|
| [ ] | EventDetail : plus de mock « Nox Night » en erreur | | | |
| [ ] | Visibilité GET event (non-participant) | | | |
| [ ] | Accueil Reco / Fil + sous-onglets | | | |
| [ ] | Filtres suggestions accueil | | | |
| [ ] | Menu radial par rôle, agenda centre | | | |
| [ ] | Tutorial 1er lancement uniquement | | | |
| [ ] | Deep link notif → post feed | | | |
| [ ] | Messages réseau homogènes | | | |
| [ ] | Changement email écran OTP | | | |
| [ ] | Upload médias Lieux | | | |
| [ ] | Paiements DJ dashboard réels | | | |
| [ ] | Liens avis DJ / lieu | | | |

---

## P3 — Stress & edge cases (~15 min)

| ✓ | Action | iOS | Android | Notes |
|---|--------|-----|---------|-------|
| [ ] | Switch profil Commu ↔ DJ ↔ Orga ↔ Lieu | | | |
| [ ] | Bon écran home après chaque switch | | | |
| [ ] | Retour Android : pile cohérente | | | |
| [ ] | Double tap quitter sur home Android | | | |
| [ ] | Session longue / token expiré → renvoi login | | | |
| [ ] | Notif push chat → bon dashboard + bon chat | | | |
| [ ] | Partage post feed | *Absent — noter si manque ressenti* | | |

---

## Parcours express — 1 heure chrono

Si peu de temps, dans cet ordre :

1. [ ] Auth + tutorial + MDP oublié (15 min)
2. [ ] Accueil Reco/Fil + filtres + réseau off (15 min)
3. [ ] Event public → achat → QR ticket (15 min)
4. [ ] Notif feed → post surligné (10 min)
5. [ ] Radial 1 rôle + switch profil (5 min)

---

## Modèle de fiche bug

```
Titre :
Sévérité : 🔴 / 🟠 / 🟡 / 🔵
Device : 
OS : 
Profil actif : 
Build / OTA : 
Date :

Étapes :
1.
2.
3.

Attendu :
Obtenu :

Capture / vidéo :
```

---

## Bugs relevés (synthèse session)

| # | Sévérité | Résumé | Profil | iOS | Android | Statut |
|---|----------|--------|--------|-----|---------|--------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |

---

## Références

- Plan global V1 : [`PLAN_V1_SORTIE.md`](../../PLAN_V1_SORTIE.md)
- Backlog mobile : [`TODO.md`](TODO.md)
- Checklist stores : [`PUBLICATION_STORES.md`](PUBLICATION_STORES.md)
- Changelog : [`CHANGELOG.md`](../../CHANGELOG.md)
