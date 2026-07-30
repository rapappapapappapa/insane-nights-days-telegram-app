# Guide de test NOX — semaine 28–31 juillet 2026

Parcours manuels pour valider les livraisons **lieuxDemandes**, **Phase D navigation**, **Splash** et **OTP email**.

---

## Avant de commencer

### Récupérer la dernière version
1. **Fermer complètement** l’app (pas seulement mettre en arrière-plan).
2. Rouvrir l’app — l’OTA se télécharge au boot (écran « Mise à jour… » possible).
3. Si le design reste ancien (rouge) : drawer → **Mises à jour (OTA)** → forcer le check, ou réinstaller le build EAS.

### Comptes de test recommandés
| Profil | Ce qu’il faut tester |
|--------|----------------------|
| **COMMUNITY** | Home, Discover, tickets, achats |
| **VENUE** | Dashboard Lieux, demandes, chat, push |
| **BOOKER** | Welcome / dashboard, création event |
| **DJ** | Welcome / dashboard, bookings |
| *(optionnel)* **PRESTATAIRE** | Dashboard prestataire |

### Noter les bugs
Pour chaque problème, indique :
- **Profil actif** (COMMUNITY, VENUE, etc.)
- **Écran** où tu étais
- **Action** effectuée
- **Attendu** vs **obtenu**
- **Capture** si possible

---

## 1. Boot & Auth (nouveau — 30 juil.)

### 1.1 Splash Figma
**Route** : lancement app **déconnecté**

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Ouvrir l’app (ou se déconnecter puis relancer) | Écran **NOX** fond noir, logo + glow bleu |
| 2 | Attendre ~2 s **ou** taper « Continuer » | Passage aux **3 slides onboarding** |
| 3 | Slide 1 → retour | Retour au **splash** |
| 4 | Dernier slide → « Terminer » | Écran **choix de rôle** (2×2) |

### 1.2 Inscription + OTP
**Route** : splash → onboarding → accountType → **Communauté** (ou autre) → formulaire inscription

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Créer un compte email (CGU + 18 ans) | Toast « Compte créé » |
| 2 | — | Écran **« Vérifie ton email »** (code 6 chiffres) |
| 3 | Consulter l’email **ou** ligne « Code dev » si mail non configuré | Code à 6 chiffres visible |
| 4 | Saisir le code → Valider | Redirection vers **onboarding profil** (ex. `registerCommunity`) ou home selon rôle |
| 5 | « Renvoyer le code » | Nouveau code (attendre 30 s si spam) |

### 1.2bis Profil Communauté (pseudo + suggestions)

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Formulaire `registerCommunity` | **Pseudo en lecture seule** (celui du compte) + nom / prénom / pays / date — **pas** de 2e saisie pseudo |
| 2 | Créer profil → onboarding communauté | Démarre sur **photo** (« Salut {pseudo} »), **pas** d’étape « Quel est ton nom ? » |
| 3 | Étape « Suis quelques artistes » | Liste de **vrais DJ** API (pas Amelie Lens / Charlotte de Witte mock) |
| 4 | Étape lieux | **Vrais lieux** inscrits, ou message vide + Passer |
| 5 | Fin → entrer dans NOX | Les DJ cochés sont **suivis** (`followDj`) |

### 1.3 Connexion existante
| Cas | Attendu |
|-----|---------|
| Email **non vérifié** | OTP avant d’accéder à l’app |
| Email **vérifié** / Google / Apple | Home du **profil actif** directement |

---

## 2. Navigation par profil (Phase D)

Après connexion, la **home** dépend du profil :

| Profil | Home attendue |
|--------|----------------|
| COMMUNITY | `communityHome` |
| VENUE | `lieuxDashboard` |
| DJ / BOOKER / PRESTATAIRE | `welcome` (temporaire) |

### 2.1 Boutons « Découvrir » / « Accueil » (ne doivent plus aller en dur sur `events` / `welcome` legacy)

| Écran | Comment y aller | Bouton | Destination attendue |
|-------|-----------------|--------|----------------------|
| **Tickets** | NX → Tickets → état vide | « Découvrir les événements » | COMMUNITY → **Discover** ; VENUE → **lieuxEvents** ; DJ/Booker → **events** |
| **Achats** | Drawer → Mes achats | Retour | **Home du profil** |
| **Achats** | (liste vide) | « Voir les événements » | **Discover** selon profil |
| **Succès achat** | Acheter un billet | « Accueil » | **Home du profil** |
| **Succès achat** | — | « Retour à l’événement » | Détail event **COMMUNITY** ou **legacy** selon profil |
| **Welcome** (DJ/Booker) | Barre recherche | Tap recherche | **Discover** selon profil |

### 2.2 Retour Android
| Contexte | Attendu |
|----------|---------|
| Sur **home du rôle** | Double appui = quitter l’app |
| Sur écran interne | Retour = écran précédent, sinon home du rôle |
| Sur **splash** (déconnecté) | Double appui = quitter |

---

## 3. Lieux — Demandes (28 juil.)

**Profil VENUE** requis.

| # | Parcours | Attendu |
|---|----------|---------|
| 3.1 | Dashboard → bandeau **« Demandes en attente »** | Liste `lieuxDemandes`, filtre **En attente** |
| 3.2 | Réglages → **Demandes** | Même écran |
| 3.3 | Disponibilités → **Traiter les demandes** | Même écran |
| 3.4 | Filtres pills | En attente / Confirmé / À négocier / Refusé + compteurs |
| 3.5 | Carte → détail | **Confirmé** → `lieuxEventDetail` ; sinon → `lieuxRequestDetail` |
| 3.6 | Icône chat sur carte pending | `lieuxBookingChat` |
| 3.7 | Notifications lieu → notif pending | `lieuxDemandes` filtre pending |

### Push notifs VENUE (si possible)
| Type | Attendu |
|------|---------|
| Message chat | `lieuxBookingChat` (plus `venueDashboard` legacy) |
| Demande booking | `lieuxDemandes` |

---

## 4. Lieux — smoke test rapide

| Écran | Vérifier |
|-------|----------|
| Dashboard | Stats bleues, cloche → notifs, quick actions |
| Chat booking | Pas de crash à l’ouverture |
| Scanner | Sélection event + scan QR |
| NX radial | Visible sur dashboard (pas sur chat) |

---

## 5. Communauté — smoke test

| Écran | Vérifier |
|-------|----------|
| Home | Featured, onglets feed |
| Discover | Events + DJs, filtres |
| Profil | Onglets Aperçu / Events / Mur / Amis |
| Tickets | QR modal, onglets Actifs / Historique |

---

## 6. Pro (DJ / Booker) — état actuel

Pas encore de maquettes Figma dédiées. Vérifier seulement :
- Login → **welcome** (pas d’écran rouge legacy)
- NX radial visible
- Drawer → dashboard pro accessible
- Pas de crash au changement de profil

---

## 7. Checklist régression OTA

- [ ] App démarre sans crash (splash visible)
- [ ] Design **bleu NOX** (#2852E8), pas rouge legacy
- [ ] Connexion / déconnexion OK
- [ ] Changement de profil (drawer) OK
- [ ] Un achat billet bout-en-bout (COMMUNITY si possible)

---

## Modèle de retour bug (copier-coller)

```
### [Titre court]
- Profil : VENUE
- Écran : lieuxDemandes
- Étapes : Dashboard → Demandes en attente → …
- Attendu : liste avec 2 demandes
- Obtenu : écran vide / crash / mauvaise navigation
- Build : OTA du … / commit …
```

---

*Dernière mise à jour : 30 juillet 2026*
