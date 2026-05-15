# Améliorations à prévoir — NOX

Liste des pistes d’évolution ; **la première section** fixe la priorité **technique** (nouveau **build App Store / Play** vs **OTA**).

---

## Comment décider « quoi faire en premier »

**Oui en principe :** tout ce qui **oblige un nouveau binaire** (capabilités Apple, nouveau **plugin Expo**, **module natif**, **empreinte SHA-1**, **OAuth lié aux identifiants bundle**, etc.), il vaut mieux le traiter **tôt et en lot** avec d’autres chantiers **`[Rebuild EAS]`**, pour éviter **plusieurs campagnes** « retélécharger l’app ».

**Nuance importante**

- Un **nouveau type de profil** (prestataire) reste très souvent **`[souvent OTA]`** si reste dans **backend + écrans + navigation** sans lib native nouvelle.

| Repère | Lecture |
|--------|--------|
| **`[Rebuild EAS]`** | À **combiner** avec les autres lignes équivalentes avant **un même build**. |
| **`[souvent OTA]`** | Surtout **JS + API** ; mise à jour **Expo Updates** si **runtime inchangé** (vérifier **fingerprint**). |
| **`[à trancher]`** | Décision après POC (besoin réel de natif ou non). |

---

## À planifier avant / avec un build natif **`[Rebuild EAS]`**

- [ ] **`[Rebuild EAS]`** **Sign in avec Apple** (**Google** déjà : env mobile + variables serveur).

- [ ] **`[Rebuild EAS]`** **Synchro agenda pro** (Google / Apple Calendar) — permissions + **expo-calendar** (ou équivalent) ; **idéalement même build** qu’Apple ci-dessus.

- [ ] **`[Rebuild EAS]`** *(option)* **Lecteurs média natifs** (SoundCloud / Spotify / YouTube) — uniquement si **SDK natif** ; sinon **priorité moyenne** (WebView = OTA).

- [ ] **`[à trancher]`** **Profil « prestataire »** comme **capability store** — **OTA** si seulement données + écrans ; **Rebuild** si plugin / entitlements.

---

## Priorité haute (produit)

- [ ] **`[souvent OTA]`** Billetterie **multi-tarifs** / **phases** — infos vs grille de prix ; libellés ; total ; **TTC ~20 %** ; **commission Nox** ; phases répétables.

- [ ] **`[souvent OTA]`** Places **hors Nox** sans décompte stock interne.

- [ ] **`[souvent OTA]`** **Capacité** max = **capacité du lieu**.

- [ ] **`[souvent OTA]`** **Plusieurs DJs** + **fix bug** actuel.

- [ ] **`[souvent OTA]`** **Lieu secret** — révélation adresse **à partir d’une date**.

---

## Priorité moyenne

- [ ] **`[souvent OTA]`** **Type d’événement** (club, festival, privé, bar, concert…).

- [ ] **`[souvent OTA]`** **Lieu externe** (nom + adresse).

- [ ] **`[souvent OTA]`** **Fiches lieu — deals possibles.**

- [ ] **`[souvent OTA]`** **Lecteurs média** *si WebView / URLs* (sinon bloc Rebuild).

- [ ] **`[souvent OTA]`** **Prestataires** dans le wizard (photo, vidéaste, VDJ…) ; **futur** type profil **`[à trancher]`** (voir bloc natif).

- [ ] **`[souvent OTA]`** **Récap final** + **modalités** chronologiques / prestations / prix.

- [ ] **`[souvent OTA]`** **Location matériel** dans le wizard (cases, stock, réservation).

- [ ] **`[souvent OTA]`** **Agenda matériel** (dispo / réservation par créneaux).

- [ ] **`[souvent OTA]`** **Visuels événement — format carré.**

- [ ] **`[souvent OTA]`** **Carrousel / slides** événement (images + vidéos, contenu profils DJ).

- [ ] **`[souvent OTA]`** **Sortie anticipée** + **revente places** + **liste d’attente** (notification quand une place se libère).

---

## Priorité basse / chantiers structurants

- [ ] **`[souvent OTA]`** **Dossier médias post-événement** *(chantier souvent lourd **back + stockage**)* — espace commun organisateur · DJ · lieu, dépôt, choix pour chaque profil, export global.

---

## Dette technique

- [ ] **Billetterie** — tests multi-phases, TTC / commission, capacité vs lieu.

- [ ] **Plusieurs DJs** — tests + migrations **n-n** si nécessaire.

---

## UX / accessibilité

- [ ] Wizard : **clarté** infos vs tarifs, messages **TTC / commission**, erreur **capacité > lieu**.

- [ ] **Lieu secret** : quand l’adresse sera visible ; états accessibles.

---

## Notes libres

*(captures, tickets, URLs)*

-

---

*Dernière mise à jour : 13 mai 2026 — priorisation « rebuild EAS » vs OTA et profil prestataire.*
