# Synthèse — refonte NOX (design system + nav)

Document de reprise **étape par étape** si tu dois continuer depuis une autre machine, un autre IDE ou sans l’historique du chat.

**Branche Git** : `railway-phase1`  
**Dossier app mobile** : `nox-mobile/`  
**Couleur Figma** : `#4DA3FF` · typo **Satoshi**  
**Maquettes Figma** : [DESIGN_FIGMA_REFERENCE.md](./DESIGN_FIGMA_REFERENCE.md) + images dans `design-figma/`  
**Migration legacy** : [PLAN_MIGRATION_NOX_LEGACY.md](./PLAN_MIGRATION_NOX_LEGACY.md)

---

## 1. Prérequis (autre poste)

```bash
cd "/chemin/vers/nox-mobile"
git fetch origin
git checkout railway-phase1
git pull origin railway-phase1
cd nox-mobile
npm install
```

Vérifier que tu es aligné avec le remote :

```bash
git status
# doit afficher : up to date with 'origin/railway-phase1'
```

---

## 2. Phase 0 — Design system (commit `ed7f5db`)

**Objectif** : fond noir, bleu Figma, polices Satoshi, composants réutilisables.

| Élément | Emplacement |
|--------|-------------|
| Palette + `primaryAlpha()` | `constants/colors.js` |
| Presets typo | `constants/typography.js` |
| Spacing, radius, layout | `constants/theme.js` |
| Polices Satoshi | `assets/fonts/` + hook `hooks/useNoxFonts.js` |
| Composants de base | `components/nox/` : `NoxText`, `NoxButton`, `NoxInput`, `NoxCard`, `NoxScreenHeader` |

**Boot** : `App.js` charge les polices via `useNoxFonts()` avant d’afficher l’app.

---

## 3. Phase 1 — Écrans principaux (commit `7a6089b`)

**Objectif** : parcours non connecté + feed connecté Figma.

| Écran | Fichier | Détail |
|-------|---------|--------|
| Onboarding 3 slides | `screens/onboarding/OnboardingPage.js` | Boot si non connecté |
| Login / inscription | `screens/auth/LoginPage.js` | Fond noir, `NoxButton`, retour onboarding |
| Choix de rôle | `screens/auth/AccountTypePage.js` | Grille 2×2 + Prestataire |
| Feed connecté (pro) | `screens/pro/ProHomePage.js` | Fil events + raccourcis pro |
| Feed communauté | `screens/community/CommunityHomePage.js` | Accueil, suggestions, onglets feed |
| Barre recherche | `components/nox/NoxSearchBar.js` | |

**Navigation** (`contexts/NavigationContext.js`, `App.js`) :
- Boot → `onboarding`
- Connecté → `welcome`
- Déconnexion → `onboarding`
- Drawer « Fil d’actualité » → `welcome`

---

## 4. Phase 1b — Fidélité Figma (intégré au commit `441d17d`)

**Objectif** : alignements, cartes rôle, onglets feed.

| Composant | Fichier |
|-----------|---------|
| Onglets feed | `components/nox/NoxTabs.js` |
| Cartes rôle teintées | `components/nox/NoxRoleCard.js` |
| Œil mot de passe | slot droit dans `NoxInput.js` |

Affinages : onboarding (titre gauche, compteur), login (icônes champs), welcome (header + tabs).

---

## 5. Phase 2 — Feed, rôles, nav NX (commit `441d17d`)

| Élément | Fichier |
|---------|---------|
| Cartes posts feed | `components/nox/NoxFeedPostCard.js` |
| Nav flottante NX | `components/nox/NoxRadialNav.js` |
| Drawer ouvrable par la nav | `components/Drawer.js` (`forwardRef` + `useImperativeHandle`) |
| Branchement global | `App.js` → `<NoxRadialNav onOpenMenu={…} />` |

**Nav NX** :
- Bouton central **NX** : tap = ouvrir/fermer l’arc
- Appui long = menu drawer latéral
- Raccourcis : Discover, Home, Tickets, Notifs, Profil
- Masquée sur auth, dashboards, wizards (`HIDE_RADIAL_NAV_PAGES`)

---

## 6. Correctif crash Welcome (commit `153b19e`)

**Symptôme** : « Oups une erreur est survenue » au boot si connecté.

**Cause** : `NoxTabs.js` utilisait `NoxText` sans import.

**Fix** : ajouter `import NoxText from './NoxText'`.

**Anti-régression** :

```bash
cd nox-mobile
node scripts/find-unbound-refs.js
```

Le script détecte aussi les identifiants JSX (`JSXIdentifier`).

---

## 7. Debug boot (commit `97fb0bc`)

**Objectif** : voir l’erreur exacte en prod / TestFlight.

| Fichier | Rôle |
|---------|------|
| `components/ErrorBoundary.js` | message + stack JS + stack composant (texte sélectionnable) |
| `utils/installGlobalErrorHandlers.js` | erreurs JS globales + promesses rejetées |
| `index.js` | appelle `installGlobalErrorHandlers()` |
| `App.js` | ErrorBoundary par écran (`context=`Écran: …``), log `[NOX Boot]` |

---

## 8. CHANGELOG (commit `f713640`)

Tout le travail NOX est regroupé sous :

**`## Semaine du 30 juin au 4 juillet 2026 (mar. - ven.)`** dans `CHANGELOG.md` (racine du repo).

---

## 9. Correctif nav NX — toggle + espacement (dernier commit de session)

**Symptômes** :
- Second tap sur **NX** ne fermait pas le menu (backdrop + toggle se déclenchaient ensemble → réouverture).
- Icônes de l’arc trop rapprochées / labels qui se chevauchent.

**Fix** (`components/nox/NoxRadialNav.js`) :
- Backdrop visuel en `pointerEvents="none"`.
- Zone de tap « fermer » **au-dessus** du cluster NX (pas sur le bouton).
- Rayon arc : **118 px** ; angles **−152° à −20°** (~33° entre icônes).

**Test manuel** :
1. Ouvrir l’app connecté → feed
2. Tap **NX** → arc s’ouvre
3. Re-tap **NX** → arc se ferme
4. Tap fond assombri → se ferme aussi
5. Appui long **NX** → drawer latéral

---

## 10. Historique des commits (ordre chronologique)

| Hash | Message |
|------|---------|
| `ed7f5db` | design system NOX Figma — bleu, Satoshi, composants de base |
| `7a6089b` | écrans principaux NOX — onboarding, auth, feed connecté |
| `441d17d` | fidélité Figma — feed, rôles, nav NX radiale |
| `153b19e` | crash Welcome — import NoxText manquant dans NoxTabs |
| `97fb0bc` | affichage détaillé des erreurs au boot |
| `f713640` | CHANGELOG semaine 30 juin–4 juillet |
| *(dernier)* | fix nav NX toggle + espacement arc |

---

## 11. Publier depuis un autre poste

### A. Commit + push (si tu modifies le code)

```bash
cd "/chemin/vers/nox-mobile"
git add CHANGELOG.md nox-mobile/components/nox/NoxRadialNav.js docs/mobile/SYNTHESE_REFONTE_NOX_JUIN2026.md
git status
git commit -m "$(cat <<'EOF'
fix(mobile): nav NX — toggle fermeture + arc plus aéré

Backdrop sans capture sur le bouton NX ; rayon et angles élargis.
EOF
)"
git push origin railway-phase1
```

### B. OTA (mise à jour sans rebuild store)

Depuis `nox-mobile/` :

```bash
npm run update:both -- "fix nav NX toggle + espacement arc"
```

Ou manuellement :

```bash
npx eas-cli update --branch production --message "fix nav NX toggle + espacement arc"
# + branche preview si tu utilises les deux
```

**Note** : l’OTA ne change pas les icônes d’app (`icon.png`) — seulement le JS/assets bundlés.

### C. Backend Railway

Railway déploie **`server/`** depuis Git. Cette refonte NOX est **100 % mobile** : pas de redeploy backend nécessaire pour ces changements.

---

## 12. Fichiers clés (checklist rapide)

```
nox-mobile/
├── App.js
├── index.js
├── constants/colors.js, typography.js, theme.js
├── hooks/useNoxFonts.js
├── components/nox/
│   ├── NoxText.js, NoxButton.js, NoxInput.js, NoxCard.js
│   ├── NoxTabs.js, NoxRoleCard.js, NoxFeedPostCard.js
│   ├── NoxSearchBar.js, NoxRadialNav.js
│   └── index.js
├── components/Drawer.js
├── components/ErrorBoundary.js
├── utils/installGlobalErrorHandlers.js
├── contexts/NavigationContext.js
├── screens/onboarding/OnboardingPage.js
├── screens/auth/LoginPage.js, AccountTypePage.js
├── screens/pro/ProHomePage.js          # Accueil DJ / booker / prestataire
└── screens/community/CommunityHomePage.js  # Accueil communauté
```

---

## 13. Suite possible (non fait)

- Voir **[PLAN_MIGRATION_NOX_LEGACY.md](./PLAN_MIGRATION_NOX_LEGACY.md)** — ordre de bascule NOX ↔ legacy (phases A→E)
- Phase 3 : barre NX permanente, assets Figma réels sur cartes rôle
- Refonte écran par écran (Tickets, Events, Profil…) avec composants `nox/`
- Crash boot **non connecté** (onboarding) : utiliser le message détaillé ErrorBoundary post-OTA pour identifier la cause si encore présent

---

*Dernière mise à jour : session du 30 juin 2026 — branche `railway-phase1`.*
