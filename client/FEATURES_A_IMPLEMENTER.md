# Fonctionnalités à implémenter - Version Web

Ce fichier liste les fonctionnalités dont la **base** est déjà en place.  
Pour chaque fonctionnalité, **demande-moi le code en commentaire** et je te fournirai le snippet à copier.

---

## 1. Auth & Compte

| Fonctionnalité | Fichier | Description |
|----------------|---------|-------------|
| Mot de passe oublié | `LoginPage.js` | Lien + page pour récupérer son mot de passe |
| Liens CGU / Confidentialité | `LoginPage.js` | Liens cliquables vers les pages légales |
| Validation champs en temps réel | `LoginPage.js` | Messages d'erreur sous chaque champ |
| Changer mot de passe | `ProfilePage.js` | Formulaire ancien/nouveau/confirmation |
| Switcher de profil | `ProfilePage.js` | Basculer Community / DJ / Booker / Venue |
| Export données RGPD | `ProfilePage.js` | Télécharger ses données |
| Suppression de compte | `ProfilePage.js` | Supprimer son compte avec confirmation |

---

## 2. Feed

| Fonctionnalité | Fichier | Description |
|----------------|---------|-------------|
| Créer un post | `FeedPage.js` | Bouton + modal pour les DJs/Bookers |
| Liker un post | `FeedPage.js` | Bouton cœur + compteur |
| Commentaires | `FeedPage.js` | Afficher + ajouter des commentaires |
| Pagination / infinite scroll | `FeedPage.js` | Charger plus de posts au scroll |
| Feed "Abonnements" | `FeedPage.js` | Onglet pour les posts des profils suivis |

---

## 3. Événements & Tickets

| Fonctionnalité | Fichier | Description |
|----------------|---------|-------------|
| Acheter un ticket (Stripe) | `EventDetailPage.js` | Intégration paiement |
| Noter un événement | `EventDetailPage.js` | Noter DJ et lieu après l'événement |
| Liens profils DJ / Lieu | `EventDetailPage.js` | Pages dédiées |
| QR code ticket | `TicketsPage.js` | Afficher le QR pour chaque ticket |
| Filtre par date | `EventsPage.js` | Événements à venir / passés |
| Tri (date, prix) | `EventsPage.js` | Trier la liste |

---

## 4. Navigation & Layout

| Fonctionnalité | Fichier | Description |
|----------------|---------|-------------|
| Menu burger mobile | `Navigation.js` | Menu responsive |
| Badge notifications | `Navigation.js` | Icône cloche + compteur |
| Switcher profil dans la nav | `Navigation.js` | Dropdown pour changer de profil |
| ProtectedRoute | `App.js` | Redirection vers /login si non connecté |
| Page Legal | Nouveau | CGU, CGV, mentions, confidentialité |
| Page Mot de passe oublié | Nouveau | /forgot-password, /reset-password |

---

## Comment demander le code

Exemple : *"Donne-moi le code pour la fonctionnalité 1 (mot de passe oublié) dans LoginPage"*

Ou : *"J'aimerais implémenter le like sur les posts dans FeedPage"*
