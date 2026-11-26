# TODO mobile — backlog court

Liste de tâches **courante** (notes produit / UX).  
Backlog détaillé historique : [`TODO_RESTANT.md`](TODO_RESTANT.md) · plan global : [`PLAN_MIGRATION_NOX_LEGACY.md`](PLAN_MIGRATION_NOX_LEGACY.md) · parcours test : [`PARCOURS_TEST_V1.md`](PARCOURS_TEST_V1.md).  
Maquettes locales : [`design-figma/`](design-figma/) · écarts : [`ECARTS_FIGMA_VS_APP.md`](ECARTS_FIGMA_VS_APP.md).

*Dernière mise à jour : 24 novembre 2026.*

---

## Semaine du 24 au 27 novembre 2026

### Fait

- [x] Docs **ECARTS / MANQUES / DESIGN_FIGMA_REFERENCE** rattrapées (pack 01–21).
- [x] **Détail billet** aligné maquette 21 (ordre / libellés actions).
- [x] **Checkout** : titre + aide (`EventCheckoutSection`).

### QA & correctifs

- [x] **QA code features nov.** : statut des événements recalculé sur l'heure réelle, clôture auto des reventes, notifs vendeurs en revente (26 nov.).
- [ ] **QA sur téléphone** : transfert, revente, notifs Événements/Système, Prévus, feed lieu, nouvel écran d'achat.
- [ ] **Parcours test V1** : [`PARCOURS_TEST_V1.md`](PARCOURS_TEST_V1.md).
- [ ] **Resend** : `RESEND_API_KEY` + `RESEND_FROM` sur Railway.

### Suite produit *(hors HelloAsso)*

- [ ] **Apple / Google Wallet** : certificats + vars Railway, puis QA bouton.
- [x] **Checkout** : tarifs en lignes radio, total, aide CGV, revente harmonisée (planche HD toujours absente).
- [x] **Pro DJ / Orga** : hubs alignés sur `nox-mobile/assets/écrans/Dashboard_DJ_Pro.png` et `Dashboard_Orga_Pro.png`.
- [x] **Stores (dépôt)** : `store:check:node` OK, CGV avec transfert et revente, fiches store à jour.
- [ ] **Stores (éditeur)** : raison sociale, siège, directeur de publication (`legalConfig.js` + `mentions.html`), passage au bundle `com.nox.mobile`, captures d'écran, fiches App Store Connect / Play Console — voir [`PUBLICATION_STORES.md`](PUBLICATION_STORES.md).

### Hors scope immédiat

- [ ] **HelloAsso payant** : clés API + `HELLOASSO_ENABLED` (gratuites OK).
