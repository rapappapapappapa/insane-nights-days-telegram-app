# Améliorations à prévoir — NOX

**Ordre de travail conseillé :** commence par **tout ce qui impose un nouveau build App Store / Play (`[Rebuild EAS]`)**. Les cycles sont en général **les plus longs** (bundle EAS, empreintes Android, revue Apple / Google, diffusion aux utilisateurs). En **regroupant plusieurs chantiers rebuild dans le même binaire**, tu évites de **subir plusieurs fois cette même durée**.

Ensuite seulement les chantiers **`[souvent OTA]`** (livraisons plus rapides via JS + API tant que le **runtime** reste compatible — vérifier **fingerprint** Expo Updates si besoin).

---

## Phase 1 — Rebuild (**à faire en premier** · `[Rebuild EAS]`)

À **regrouper dans un même build** quand c’est possible.

- [x] **Sign in avec Apple** (**Google** déjà : env mobile + variables serveur). *Capacité Xcode / App Store + `APPLE_IOS_BUNDLE_ID` si ≠ défaut.*

- [x] **Synchro agenda pro** (Google / Apple Calendar) — permissions + **expo-calendar** (ou équivalent) ; **idéalement le même milestone** que **Sign in Apple**.

- [x] **Lien Spotify / SoundCloud → lecteur dans l’app (embed + WebView)** sur le **profil DJ** — **pas de SDK natif**, donc **pas de rebuild** supplémentaire (souvent **OTA**).

- [ ] *(option, **rebuild** seulement si natif)* **Lecteurs / SDK média natifs** — **uniquement si** tu abandonnes l’embed pour un **SDK** (contrôle OS, fond d’écran, etc.) ; **YouTube** idem (**WebView** = OTA).

- [ ] **`[à trancher]`** **Profil « prestataire »** — **inclure dans ce build** seulement si **nouveau plugin / entitlements** ; sinon souvent **sans** nouveau binaire (données + écrans uniquement).

---

## Étiquettes (rappel)

| Repère | Lecture |
|--------|--------|
| **`[Rebuild EAS]`** | Nouveau **binaire** ⇒ **démarrer en premier**. |
| **`[souvent OTA]`** | Surtout **JS + API** ; **Expo Updates** si runtime inchangé. |
| **`[à trancher]`** | POC : faut-il du **natif** ou non. |

**Nuance** — un **nouveau type de profil** sans nouveau module natif reste très souvent **OTA**, pas forcément Phase 1.

---

## Phase 2 — Priorité produit forte (`[souvent OTA]`)

- [ ] Billetterie **multi-tarifs** / **phases** — infos vs grille de prix ; libellés ; total ; **TTC ~20 %** ; **commission Nox** ; phases répétables.

- [ ] Places **hors Nox** sans décompte stock interne.

- [ ] **Capacité** max = **capacité du lieu**.

- [ ] **Plusieurs DJs** + **correctif bug** actuel.

- [ ] **Lieu secret** — révélation adresse **à partir d’une date**.

---

## Phase 3 — Priorité moyenne (`[souvent OTA]`)

- [ ] **Type d’événement** (club, festival, privé, bar, concert…).

- [ ] **Lieu externe** (nom + adresse).

- [ ] **Fiches lieu — deals possibles.**

- [ ] **Lecteurs média** *(WebView / URLs — pas de SDK natif)*.

- [ ] **Prestataires** dans le wizard (photo, vidéaste, VDJ…) ; type profil « prestataire » — voir **Phase 1** si ajout **natif**.

- [ ] **Récap final** + **modalités** chronologiques / prestations / prix.

- [ ] **Location matériel** (cases, stock, réservation).

- [ ] **Agenda matériel** (dispo / créneaux).

- [ ] **Visuels événement — format carré.**

- [ ] **Carrousel / slides** événement.

- [ ] **Sortie anticipée** + **revente** + **liste d’attente**.

---

## Phase 4 — Plus tard / chantiers lourds

- [ ] **Dossier médias post-événement** *(souvent lourd **back + stockage**)*.

---

## Dette technique

- [ ] Billetterie — tests multi-phases, TTC / commission, capacité vs lieu.

- [ ] Multi-DJs — tests + migrations **n-n** si nécessaire.

---

## UX / accessibilité

- [ ] Wizard : clarté infos vs tarifs, **TTC / commission**, erreur **capacité > lieu**.

- [ ] Lieu secret : visibilité de l’adresse ; états accessibles.

---

## Notes libres

*(captures, tickets, URLs)*

-

---

*Dernière mise à jour : 13 mai 2026 — ordre explicite : Phase 1 = rebuild en premier (cycles les plus longs).*
