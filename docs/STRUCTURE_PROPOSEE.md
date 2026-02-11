# Structure proposée pour réorganiser le projet

## 📁 Structure proposée

```
/home/ridah/app telegram/
├── docs/                          # 📚 TOUTE LA DOCUMENTATION
│   ├── guides/                    # Guides de configuration
│   │   ├── GUIDE_CONFIGURATION_R2.md
│   │   ├── GUIDE_CLOUDFLARED.md
│   │   ├── GUIDE_SETUP_MOBILE.md
│   │   └── LOGO_SETUP.md
│   ├── backend/                   # Documentation backend
│   │   ├── EXPLICATION_BACKEND.md
│   │   ├── API_DOCUMENTATION.md
│   │   ├── DEPLOY.md
│   │   ├── GUIDE_DEMARRAGE.md
│   │   └── ARRETER_SERVEUR.md
│   ├── mobile/                    # Documentation mobile
│   │   ├── ANALYSE_PROFESSIONNELLE.md
│   │   ├── AMELIORATIONS_SYNTHESE.md
│   │   ├── OPTIMISATIONS_RECOMMANDATIONS.md
│   │   ├── SECURITE_TOKENS_IMPLEMENTATION.md
│   │   ├── LOGGING_SECURISE_IMPLEMENTATION.md
│   │   ├── HAUTE_PRIORITE_IMPLEMENTATION.md
│   │   ├── EXEMPLE_UTILISATION.md
│   │   └── TODO_RESTANT.md
│   └── README.md                  # README principal du projet
│
├── insane-nights-days-mobile/
│   ├── screens/                   # Écrans organisés par fonctionnalité
│   │   ├── auth/                  # Authentification
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterDjPage.js
│   │   │   ├── RegisterBookerPage.js
│   │   │   ├── RegisterVenuePage.js
│   │   │   ├── RegisterCommunityPage.js
│   │   │   └── AccountTypePage.js
│   │   ├── dashboard/             # Dashboards
│   │   │   ├── DjDashboardPage.js
│   │   │   ├── BookerDashboardPage.js
│   │   │   ├── VenueDashboardPage.js
│   │   │   └── AdminPage.js
│   │   ├── feed/                  # Feed et posts
│   │   │   ├── FeedPage.js
│   │   │   ├── HomePage.js
│   │   │   ├── WelcomePage.js
│   │   │   └── CreateFeedPostPage.js
│   │   ├── events/                # Événements
│   │   │   ├── EventsPage.js
│   │   │   ├── EventDetailPage.js
│   │   │   ├── RateEventPage.js
│   │   │   └── TicketsPage.js
│   │   ├── profiles/              # Profils
│   │   │   ├── ProfilePage.js
│   │   │   ├── DjProfilePage.js
│   │   │   ├── VenueProfilePage.js
│   │   │   ├── DjListPage.js
│   │   │   ├── VenueListPage.js
│   │   │   ├── DjRatingsPage.js
│   │   │   └── VenueRatingsPage.js
│   │   ├── selection/             # Sélection DJ/Venue
│   │   │   ├── SelectDjPage.js
│   │   │   └── SelectVenuePage.js
│   │   ├── profile-management/    # Gestion de profil
│   │   │   └── SwitchProfilePage.js
│   │   ├── purchases/             # Achats
│   │   │   ├── PurchasesPage.js
│   │   │   └── PurchaseSuccessPage.js
│   │   ├── notifications/         # Notifications
│   │   │   └── NotificationsPage.js
│   │   ├── ranking/              # Classements
│   │   │   └── RankingPage.js
│   │   ├── menu/                  # Menu
│   │   │   └── MenuPageOld.js
│   │   └── tutorial/             # Tutoriel
│   │       └── TutorialPage.js
│   ├── components/               # Composants réutilisables
│   ├── contexts/                 # Contextes React
│   ├── hooks/                    # Hooks personnalisés
│   ├── api/                      # Configuration API
│   ├── utils/                    # Utilitaires
│   └── constants/                # Constantes
│
├── server/
│   ├── docs/                     # Documentation serveur (si nécessaire)
│   ├── scripts/                  # Scripts (déjà bien organisé)
│   └── ...
│
└── config/                       # 📝 Fichiers de configuration temporaires
    ├── VARIABLES_RAILWAY_R2.txt
    ├── cloudflare_url.txt
    └── stripe_webhook_url.txt
```

## 🎯 Avantages

1. **Documentation centralisée** : Tous les guides dans `docs/`
2. **Screens organisés** : Par fonctionnalité, plus facile à naviguer
3. **Fichiers temporaires** : Dans `config/` pour les fichiers de config temporaires
4. **Structure claire** : Plus facile de trouver ce qu'on cherche

## 📋 Plan d'action

1. Créer les dossiers `docs/` avec sous-dossiers
2. Déplacer tous les fichiers .md dans `docs/`
3. Réorganiser les screens par fonctionnalité
4. Déplacer les fichiers temporaires dans `config/`
5. Mettre à jour les imports dans les fichiers qui référencent les screens déplacés
