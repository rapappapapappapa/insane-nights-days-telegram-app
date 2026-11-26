# Parcours de test — nouveautés oct.–nov. 2026

Parcours à faire sur téléphone après l’OTA du 26 novembre (Android `01a21726…`, iOS `01a21727…`).
Complète [`PARCOURS_TEST_V1.md`](PARCOURS_TEST_V1.md) (parcours général d’août).
Durée : ~1 h 30 pour tout, ~40 min pour les blocs ⭐.

---

## 0. Préparation (10 min)

- [ ] App **fermée puis rouverte deux fois** (la 1ʳᵉ ouverture télécharge l’OTA, la 2ᵉ l’applique). En cas de doute : menu latéral → « Vérifier les mises à jour ».
- [ ] Serveur Railway redéployé après le 26 nov. (sinon les points marqués 🖥️ ne marchent pas).
- [ ] **Compte A** : Communauté (toi).
- [ ] **Compte B** : Communauté (un collègue, ou un 2ᵉ téléphone). Nécessaire pour transfert et revente.
- [ ] **Compte Orga** : organisateur qui crée les événements de test.
- [ ] Événements de test créés par l’orga, publiés sur le fil :
  - **TEST-PAYANT** : dans 3 jours ou plus, **deux tarifs** (ex. « Early » 1 € avec 2 places max, « Normal » 2 €).
  - **TEST-GRATUIT** : dans 3 jours ou plus, gratuit.
  - **TEST-JOUR-J** : **aujourd’hui**, début dans 2–3 h, payant 1 €.
- [ ] Les paiements sont réels si Stripe est en mode live : rester sur des billets à 1–2 €.

---

## ⭐ 1. Bouton NOX et navigation (5 min)

- [ ] 1.1 Détail d’un événement (profil Communauté) : descendre tout en bas → « Acheter des billets » **entièrement visible**, pas caché par le rond NOX.
- [ ] 1.2 Page d’achat : descendre tout en bas → « Payer » et « Paiement sécurisé via Stripe » visibles au-dessus du rond.
- [ ] 1.3 Rond NOX → arc : Accueil / Billets / Agenda / Notifs / Profil ouvrent le bon écran.
- [ ] 1.4 Profil → onglet **Events** → sous-onglets **À venir / Passés / Prévus** présents.

## ⭐ 2. « Intéressé » et Prévus (5 min)

- [ ] 2.1 Sur TEST-GRATUIT, toucher le **cœur** en haut à droite → il se remplit.
- [ ] 2.2 Profil → Events → **Prévus** : TEST-GRATUIT apparaît. Toucher → ouvre l’événement.
- [ ] 2.3 Re-toucher le cœur → l’événement disparaît de Prévus.

## ⭐ 3. Page d’achat (15 min)

Sur **TEST-PAYANT** avec le compte A :

- [ ] 3.1 Chaque tarif est une ligne avec un rond à cocher, le nom à gauche, le prix à droite, « 2 restants » sous « Early ».
- [ ] 3.2 Toucher « Normal » → le rond se coche, « Total · 1 billet » passe à 2 €, le bouton affiche « Payer 2 € ».
- [ ] 3.3 Case CGV **non cochée** → bouton grisé + « Coche les CGV pour activer le paiement ».
- [ ] 3.4 Toucher « CGV » → les CGV s’ouvrent avec les sections **5. Transfert** et **6. Revente**, datées du 26 novembre 2026.
- [ ] 3.5 Cocher, payer « Early » 1 € → écran de succès.
- [ ] 3.6 Notifications → onglet Événements : « Billet confirmé » (+ push sur le téléphone).
- [ ] 3.7 🖥️ Email « Billet confirmé » reçu avec le QR code **(seulement si Resend est configuré sur Railway — sinon noter « pas d’email », c’est attendu)**.
- [ ] 3.8 Acheter le 2ᵉ « Early » → ensuite la ligne Early affiche **« Complet »** et ne se coche plus.
- [ ] 3.9 TEST-GRATUIT : une seule ligne de tarif, affichée cochée, total « Gratuit » / 0 €, achat OK.

## ⭐ 4. Détail du billet (5 min)

- [ ] 4.1 Billets → toucher le billet TEST-PAYANT → affiche, infos, QR.
- [ ] 4.2 Toucher le QR → plein écran, lisible.
- [ ] 4.3 Ordre des actions : Agenda → Transférer le billet → Revendre le billet → (Voir l’événement…).
- [ ] 4.4 **Pas** de bouton Apple / Google Wallet (normal tant que les certificats ne sont pas fournis).
- [ ] 4.5 « Ajouter à mon agenda » → l’événement arrive dans le calendrier du téléphone, à la bonne heure.

## ⭐ 5. Transfert A → B (10 min)

- [ ] 5.1 Compte A, billet TEST-GRATUIT → « Transférer le billet » → chercher le pseudo de B → confirmer.
- [ ] 5.2 Le billet disparaît des billets de A ; A reçoit « Billet transféré » (dans l’app, sans push).
- [ ] 5.3 B reçoit la push « Billet reçu » ; le billet est dans ses Billets avec un **QR différent** de celui que A avait.
- [ ] 5.4 🖥️ B reçoit l’email « Billet reçu » (si Resend configuré).
- [ ] 5.5 Chercher son propre pseudo dans la recherche de transfert → absent ou refusé avec un message clair.

## ⭐ 6. Revente (20 min)

Billet payant « Early » de A sur TEST-PAYANT :

- [ ] 6.1 A → « Revendre le billet (1 €) » → confirmer. Badge **EN REVENTE** sur le billet, QR changé.
- [ ] 6.2 (Si un scanner est dispo) scanner le QR du billet en revente → **refusé**.
- [ ] 6.3 A → « Retirer de la revente » → billet de nouveau valable, nouveau QR.
- [ ] 6.4 Remettre en vente. Compte B → TEST-PAYANT → page d’achat : bloc **« Billets en revente (1) »** avec « Early · 1 € » et bouton « Acheter ».
- [ ] 6.5 B coche les CGV, achète la revente → succès ; le billet apparaît chez B avec un nouveau QR.
- [ ] 6.6 A reçoit « Billet revendu … 1,00 € remboursés sur ta carte » ; le billet a disparu de ses Billets.
- [ ] 6.7 Dans Stripe (dashboard) : remboursement de 1 € sur le paiement d’origine de A.
- [ ] 6.8 A ne voit pas sa propre annonce dans « Billets en revente ».
- [ ] 6.9 Billet reçu par **transfert** (test 5) → **pas** de bouton « Revendre le billet » (seul l’acheteur d’origine peut revendre).
- [ ] 6.10 Billet gratuit → pas de bouton « Revendre le billet ».

## 7. Jour J (🖥️, 15 min, à étaler dans la journée)

Sur **TEST-JOUR-J** (aujourd’hui, début dans quelques heures) :

- [ ] 7.1 Quelques heures **avant** le début : l’événement est toujours **à venir**, l’achat marche. *(Avant le correctif du 26 nov., il pouvait passer « Terminé » dès l’après-midi.)*
- [ ] 7.2 A achète un billet, le met **en revente** et le laisse sans acheteur.
- [ ] 7.3 Après l’heure de début (+5 min max) : l’événement passe « en cours », l’achat est fermé.
- [ ] 7.4 A reçoit « **Revente clôturée** » ; son billet est de nouveau valable (plus de badge EN REVENTE).
- [ ] 7.5 TEST-JOUR-J reste dans Prévus / Agenda jusqu’à la fin de la soirée (6 h par défaut), puis passe dans « Passés ».
- [ ] 7.6 Le lendemain après 12 h, si le billet a été scanné : notification « Alors, … ? » pour noter la soirée.

## 8. Notifications Événements / Système (10 min)

- [ ] 8.1 Nouveau compte ou 1ʳᵉ ouverture des notifs : message de bienvenue dans « Système ».
- [ ] 8.2 L’orga change l’**heure** de TEST-PAYANT → A et B reçoivent « Changement : … ».
- [ ] 8.3 La veille d’un événement (après 10 h) : « C’est demain : … » pour les détenteurs de billet, « … c’est demain » pour les « Intéressé » sans billet.
- [ ] 8.4 Toucher une notification Événements → ouvre le bon événement.
- [ ] 8.5 Ouvrir les notifications puis revenir → le compteur de la cloche retombe à zéro.
- [ ] 8.6 **À la fin** : l’orga supprime TEST-GRATUIT → A et B reçoivent « … annulé ».

## 9. Collectifs — adhésion gratuite (10 min)

- [ ] 9.1 Compte Orga → profil → « Adhésions du collectif » → activer, prix 0 €, enregistrer.
- [ ] 9.2 Compte A → profil public du collectif → carte « Rejoindre le collectif » → rejoindre → « Membre jusqu’au … ».
- [ ] 9.3 A reçoit « Tu es membre de … ».
- [ ] 9.4 Orga → « Adhésions du collectif » → A apparaît dans les adhérents.
- [ ] 9.5 Mettre un prix > 0 → côté A : « Adhésions bientôt disponibles » (normal tant que HelloAsso n’est pas activé).

## 10. Pro et fil (10 min)

- [ ] 10.1 Hub DJ : carte followers / événements / note, prochains bookings avec l’affiche, stats sur une ligne.
- [ ] 10.2 Hub Orga : « Voir plus » aligné, même rangée de stats.
- [ ] 10.3 Accueil Communauté : cartes événement plein cadre avec cœur et partage.
- [ ] 10.4 Fil : mode scroll plein écran, feuille de commentaires qui s’ouvre et se ferme sans crash.
- [ ] 10.5 Profil d’un lieu → onglet Feed : publications au format du fil.

---

## Comment me renvoyer les bugs

Le plus simple : **une capture (ou vidéo) + une ligne** dans le chat, au format :

```
[n° du test] [🔴/🟠/🟡/🔵] [iOS/Android] — ce que j’ai fait → ce que j’attendais / ce que j’ai eu
```

Exemples :

```
6.5 🔴 Android — B achète la revente → écran blanc après paiement, pas de billet chez B
3.1 🟡 iOS — prix collé au nom du tarif sur petit écran
```

Sévérités : 🔴 bloquant (crash, paiement impossible) · 🟠 cassé mais contournable · 🟡 visuel / texte · 🔵 idée.

Utile à préciser si tu l’as : **profil actif**, **compte A ou B**, **heure** du bug (pour retrouver les logs Railway).
Tu peux m’envoyer les bugs au fil de l’eau ou tous à la fin.
