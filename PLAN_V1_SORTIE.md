# Plan V1 - Préparation à la sortie

Objectif : **Finaliser la v1 de l'app mobile** pour savoir quoi reproduire sur la webapp.

---

## ✅ Déjà en place (mobile)

- Auth : inscription, connexion, date de naissance, certification majorité
- Profils : Community, DJ, Booker, Venue (création, édition, switch)
- Feed : posts, événements, like, commentaires, onglets Pour tous / Abonnements
- Événements : liste, détail, achat ticket (Stripe)
- Tickets : liste, QR code
- Dashboards : DJ (bookings, chat, profil), Booker (événements, chat), Venue
- Amis Communauté : liste, demandes, recherche
- Notifications : feed + chat
- CGU, CGV, mentions légales, politique de confidentialité
- RGPD : export données, suppression de compte
- Pages légales dans le drawer

---

## 🔲 À valider / compléter pour la v1

### 1. Critique (bloquant pour la sortie)

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 1 | **Email en prod** | À faire | Configurer Resend avec nox.world (RESEND_FROM="noreply@nox.world") |
| 2 | **Tests complets** | À faire | Parcours : inscription → profil → feed → événement → achat ticket |
| 3 | **Bugs bloquants** | À auditer | Tester sur iOS + Android, identifier les crashs / bugs majeurs |
| 4 | **Variables d'env prod** | À vérifier | API_BASE, Stripe, Resend, etc. sur Railway |

### 2. Important (avant ou juste après la sortie)

| # | Tâche | Statut | Notes |
|---|-------|--------|-------|
| 5 | **Mot de passe oublié** | À vérifier | Flow complet : email → code → reset |
| 6 | **Vérification email** | Optionnel | Si implémenté côté backend, activer le flow |
| 7 | **Tutoriel premier lancement** | À vérifier | TutorialPage affiché pour les nouveaux utilisateurs ? |
| 8 | **Gestion erreurs réseau** | À auditer | Messages clairs si backend injoignable |

### 3. Nice to have (v1.1)

| # | Tâche | Statut |
|---|-------|--------|
| 9 | Sections "Coming soon" du DjDashboard | Remplir ou masquer |
| 10 | Monitoring / analytics | Intégrer (ex: Sentry) |
| 11 | Tests automatisés | E2E ou unitaires |

---

## 📋 Checklist avant publication stores

- [ ] Compte Apple Developer / Google Play Console prêts
- [ ] Icône et splash screen finaux
- [ ] Politique de confidentialité hébergée (URL accessible)
- [ ] CGU hébergées
- [ ] Backend stable sur Railway
- [ ] Tests sur devices réels (iOS + Android)
- [ ] Pas de logs sensibles en prod
- [ ] Version et buildNumber incrémentés (app.json)

---

## 🌐 Après la v1 mobile : Webapp

Une fois la v1 mobile validée, aligner la webapp sur :

1. **Pages à avoir** : Welcome (feed), Events, EventDetail, Profile, Tickets, Login
2. **Fonctionnalités prioritaires** : auth, feed, événements, achat ticket (Stripe)
3. **Fonctionnalités secondaires** : dashboards DJ/Booker/Venue, amis, notifications

Voir `client/FEATURES_A_IMPLEMENTER.md` pour le détail des features web à implémenter.

---

## Prochaines actions recommandées

1. **Aujourd'hui** : Configurer Resend avec nox.world (si pas encore fait)
2. **Cette semaine** : Faire un parcours complet de test sur mobile
3. **Avant sortie** : Valider la checklist stores avec ton patron
