# TODO mobile — backlog court

Liste de tâches **courante** (notes produit / UX).  
Backlog détaillé historique : [`TODO_RESTANT.md`](TODO_RESTANT.md) · plan global : [`PLAN_MIGRATION_NOX_LEGACY.md`](PLAN_MIGRATION_NOX_LEGACY.md) · parcours test : [`PARCOURS_TEST_V1.md`](PARCOURS_TEST_V1.md).

*Dernière mise à jour : 1er septembre 2026.*

---

## Semaine du 1 au 4 septembre 2026

### QA & correctifs

- [ ] **Parcours test V1** : QA manuelle [`PARCOURS_TEST_V1.md`](PARCOURS_TEST_V1.md) (Lieux publication, profil, onboarding follow).
- [ ] **Resend** : vérifier `RESEND_API_KEY` + `RESEND_FROM` sur Railway (emails vérif / reset MDP).

### Suite produit

- [ ] **Stores** : relancer `npm run store:check` ou `store:check:node` avant soumission TestFlight / Play.
- [ ] *(à préciser)*

---

## Semaine du 25 au 28 août 2026 *(archivé)*

### QA & correctifs (remontés en test)

- [x] **Liste d’amis** : `getMyCommunityId is not defined` (serveur — `eventGroupController`). *Push 12440ae — deploy Railway.*
- [x] **Dashboard DJ** : crash `useEffect` (`DjDashboardPage`). *Push 12440ae — OTA mobile à faire.*
- [x] **Accueil DJ** : dashboard pro à la place du fil (`proHome`) — feed via profil Communauté.
- [x] **OTA mobile** : Android preview + iOS production publiés (27 août) — message « Publication Lieux + follow venue + dashboard DJ ».
- [x] **Dashboards pro** : flèche retour sous la safe area (`NoxProDashboardHeader`). *Push `3a3859c` — OTA 28 août.*

### Suite produit

- [x] **Publication Lieux** (FAB « Publier ») : `FeedPost.venueId`, `FollowVenue`, feed, mur profil, follow. *Push `b678ced` — migrate deploy Railway au redéploiement.*
- [x] **Polish Lieux** : radial Publier, profil lieu (avatar, stats, mur), follow lieux à l’onboarding, `postsCount`/`followersCount` API publique. *Push `41ded67` — OTA 28 août.*
- [x] **Prep stores (technique)** : `store:check` OK (warn bundle TestFlight). Resend : config doc `RESEND_FROM=Nox <noreply@nox.world>` — à vérifier sur le dashboard Railway (pas dans `.env` local).
- [x] **`store:check:node`** : script npm Windows pour la vérif pré-store.

---

## Navigation & menu radial *(fait sem. 17–23)*

- [x] **Menu rond (NX radial)** — agenda au centre, arcs par rôle.

## Communauté — accueil *(fait sem. 17–23)*

- [x] Filtres suggestions (style, ville, tri).
- [x] Onglets **Recommandations** / **Fil** + Découverte / Abonnements.

## Onboarding & qualité *(fait sem. 17–23)*

- [x] Tutorial 1er lancement, deep link notifs feed, messages réseau, MDP oublié.
