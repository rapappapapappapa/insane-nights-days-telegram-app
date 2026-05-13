# Améliorations à prévoir — NOX

Liste des pistes d’évolution. Cocher au fil des itérations ; l’ordre reflète une **priorisation indicative** (à ajuster selon le produit).

---

## Priorité haute

*(Adoption, revenus, cohérence données, correctifs bloquants.)*

- [ ] **Connexion / inscription** — **Google** déjà en place (`EXPO_PUBLIC_GOOGLE_*` + `GOOGLE_OAUTH_*` serveur). **Sign in with Apple** à faire.

- [ ] **Synchro agenda pro** — relier événements / créneaux NOX à **Google Agenda** et **Calendrier Apple**.

- [ ] **Billetterie : plusieurs tarifs et vente par phases** — à la **création d’événement**, dissocier clairement **infos générales** et **configuration des prix** : plusieurs paliers (« X places à Y € », **libellé** par tarif), **estimation du total** (ex. 10 × 10 € = 100 €), affichage **TTC** (ex. TVA ~20 %) et **commission Nox**. Possibilité d’**ajouter d’autres phases** de vente (même logique répétable).

- [ ] **Places vendues hors Nox** — pouvoir renseigner des **entrées vendues sur une autre plateforme**, **sans décompte** dans le stock géré par Nox.

- [ ] **Capacité liée au lieu** — empêcher une **capacité d’événement supérieure** à ce que le **lieu** peut accueillir (données lieu = plafond).

- [ ] **Plusieurs DJs sur un événement** — permettre **l’ajout de plusieurs DJs** ; **corriger le bug** actuel qui bloque ou fausse ce cas.

- [ ] **Lieu secret** — **adresse (ou précisions lieu) révélée seulement à partir d’une date** configurée ; avant cette date : affichage masqué ou partiel pour le public.

---

## Priorité moyenne

*(Wizard événement, expérience booker/DJ/public, richesse fonctionnelle.)*

- [ ] **Création d’événement : type** — en plus du titre, champ **type** (club, festival, privé, bar, concert, etc.) pour filtrage / affichage.

- [ ] **Lieu externe** — **nom + adresse** saisis sans fiche lieu Nox obligatoire.

- [ ] **Fiches lieu : deals possibles** — afficher les **types de deal** / formats d’accord sur le profil lieu.

- [ ] **Lecteurs média (profils)** — **SoundCloud**, **Spotify**, **YouTube** en lecture in-app depuis les profils (DJ / lieu selon périmètre).

- [ ] **Prestataires dans le wizard** — étape ou page dédiée : **photographe**, **vidéaste**, **VDJ**, etc. **Futur** : nouveau **type de profil « prestataire »** en plus communauté / booker / DJ / lieu.

- [ ] **Récap final avant validation** — quand **toutes les parties** ont validé ce qui les concerne : **récap synthétique** (lieux, DJs, équipe, billetterie, etc.). **Modalités dans ce récap** : prestations / interventions **avec moment**, **description** et **prix** (ex. « telle perf à telle heure pour X € »).

- [ ] **Location de matériel (wizard)** — case à cocher par type (**platines**, **enceintes**, …) avec **stock** éditable côté back-office ou profil lieu ; **réserver** uniquement si dispo.

- [ ] **Agenda matériel** — **planning de disponibilité** du matériel pour réserver sur des **créneaux / jours** sans conflit.

- [ ] **Visuels événement — format carré** — vignettes **plus carrées** que les rectangles actuels lors de la création / mise en avant.

- [ ] **Carrousel / slides événement** — médias (**images et vidéos**) pour l’événement, en s’appuyant notamment sur le **contenu des profils DJ**.

- [ ] **Sortie anticipée & revente & liste d’attente** — **scan « sortie »** avant la fin de l’événement ; **remettre en vente** les places ainsi libérées ; **liste d’attente** / notification lorsqu’une **place redevient dispo**.

---

## Priorité basse / chantiers structurants

*(Gros morceaux transverses ou hors cœur immédiat.)*

- [ ] **Dossier médias après l’événement** — espace **commun** (organisateur · DJ · lieu), **dépôt** de fichiers, **choix des visuels** affichés sur **chaque profil**, **export / téléchargement** du dossier global.

---

## Dette technique

- [ ] **Tests et robustesse billetterie** — multi-phases, TTC / commission Nox, intégration lieu–capacité (scénarios de régression).

- [ ] **Évènements à plusieurs DJs** — couverture tests + migration des données si modèle évènement ⇄ DJ en `n-n`.

---

## UX / accessibilité

- [ ] **Clarté wizard** — progressivité (« infos » vs « prix des places »), libellés TTC / commission, erreurs si capacité > lieu.

- [ ] **Lieu secret** — message utilisateur sur **quand** l’adresse sera visible ; accessibilité des états masqués / dévoilés.

---

## Notes libres

*(captures d’écran, tickets, URLs, arbitrages métier précis)*

-

---

*Dernière mise à jour : 13 mai 2026 — réorganisation des notes wizard, billetterie, matériel, lieu secret, multi-DJ.*
