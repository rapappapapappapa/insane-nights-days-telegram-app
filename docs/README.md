# 📚 Documentation du Projet

Bienvenue dans la documentation du projet **Insane Nights & Days**.

## 📁 Structure de la documentation

### `/docs/guides/`
Guides de configuration et setup :
- `GUIDE_CONFIGURATION_R2.md` - Configuration Cloudflare R2 pour le stockage des images
- `GUIDE_CLOUDFLARED.md` - Configuration du tunnel Cloudflare
- `GUIDE_SETUP_MOBILE.md` - Guide de setup pour l'application mobile
- `LOGO_SETUP.md` - Configuration du logo de l'application

### `/docs/backend/`
Documentation backend :
- `EXPLICATION_BACKEND.md` - Explication générale du backend
- `API_DOCUMENTATION.md` - Documentation de l'API REST
- `DEPLOY.md` - Guide de déploiement
- `GUIDE_DEMARRAGE.md` - Guide de démarrage du serveur
- `ARRETER_SERVEUR.md` - Comment arrêter le serveur

### `/docs/mobile/`
Documentation mobile :
- `DESIGN_FIGMA_REFERENCE.md` - **Référence maquettes Figma NOX** (images dans `design-figma/`)
- `PLAN_MIGRATION_NOX_LEGACY.md` - **Plan de bascule NOX ↔ legacy** (ordre, garder/supprimer/réutiliser)
- `SYNTHESE_REFONTE_NOX_JUIN2026.md` - Synthèse refonte design system + navigation
- `ANALYSE_PROFESSIONNELLE.md` - Analyse professionnelle de l'app
- `AMELIORATIONS_SYNTHESE.md` - Synthèse des améliorations
- `OPTIMISATIONS_RECOMMANDATIONS.md` - Recommandations d'optimisation
- `SECURITE_TOKENS_IMPLEMENTATION.md` - Implémentation de la sécurité des tokens
- `LOGGING_SECURISE_IMPLEMENTATION.md` - Implémentation du logging sécurisé
- `HAUTE_PRIORITE_IMPLEMENTATION.md` - Implémentations haute priorité
- `EXEMPLE_UTILISATION.md` - Exemples d'utilisation
- `TODO_RESTANT.md` - Liste des tâches restantes

## 📂 Structure du projet

### Application Mobile (`/insane-nights-days-mobile/`)

Les screens sont organisés par fonctionnalité :

- **`/screens/auth/`** - Authentification (Login, Register, etc.)
- **`/screens/dashboard/`** - Dashboards (DJ, Booker, Venue, Admin)
- **`/screens/feed/`** - Feed et posts (HomePage, FeedPage, CreateFeedPostPage)
- **`/screens/events/`** - Événements (EventsPage, EventDetailPage, TicketsPage)
- **`/screens/profiles/`** - Profils (ProfilePage, DjProfilePage, VenueProfilePage, etc.)
- **`/screens/selection/`** - Sélection (SelectDjPage, SelectVenuePage)
- **`/screens/profile-management/`** - Gestion de profil (SwitchProfilePage)
- **`/screens/purchases/`** - Achats (PurchasesPage, PurchaseSuccessPage)
- **`/screens/notifications/`** - Notifications
- **`/screens/ranking/`** - Classements
- **`/screens/menu/`** - Menu
- **`/screens/tutorial/`** - Tutoriel

### Configuration temporaire (`/config/`)

Fichiers de configuration temporaires :
- `VARIABLES_RAILWAY_R2.txt` - Variables d'environnement R2
- `cloudflare_url.txt` - URL du tunnel Cloudflare

## 🚀 Démarrage rapide

1. **Backend** : Voir `/docs/backend/GUIDE_DEMARRAGE.md`
2. **Mobile** : Voir `/docs/guides/GUIDE_SETUP_MOBILE.md`
3. **Déploiement** : Voir `/docs/backend/DEPLOY.md`

## 📝 Notes

- Toute la documentation a été réorganisée pour une meilleure lisibilité
- Les screens sont maintenant organisés par fonctionnalité pour faciliter la navigation
- Les fichiers temporaires sont dans `/config/` pour éviter l'encombrement à la racine
