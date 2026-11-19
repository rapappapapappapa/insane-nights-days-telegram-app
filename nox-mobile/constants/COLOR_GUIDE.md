# 🎨 Guide des Couleurs Cyberpunk

## 📋 Stratégie d'utilisation du Rouge

### ✅ **Pourquoi le rouge peut fonctionner ici :**
- **Contexte événements musique** : Le rouge = énergie, passion, nocturne
- **Style cyberpunk** : Le rouge est iconique du genre
- **Utilisation modérée** : On l'utilise pour les accents, pas partout

### ⚠️ **Comment éviter les pièges :**
1. **Ne pas utiliser le rouge pour les erreurs** → Utiliser `Colors.error` (rouge différent)
2. **Utiliser des opacités** → `rgba(230,57,70,0.25)` pour les bordures
3. **Équilibrer avec du cyan** → Couleur secondaire cyberpunk
4. **Tester sur différents écrans** → Vérifier la lisibilité

## 🎯 Palette Recommandée

```javascript
import Colors from '../constants/colors';

// Utilisation dans les styles
const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,        // Rouge principal
    borderColor: Colors.border,            // Bordure avec opacité
  },
  text: {
    color: Colors.primary,                 // Texte rouge
  },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderColor: Colors.border,             // Bordure subtile
  },
});
```

## 🔄 Migration depuis l'Orange

### Étape 1 : Importer les couleurs
```javascript
import Colors from '../constants/colors';
```

### Étape 2 : Remplacer progressivement
- `#ff7a1a` → `Colors.primary`
- `rgba(255,122,26,0.25)` → `Colors.border`
- `rgba(255,122,26,0.5)` → `Colors.borderActive`

### Étape 3 : Tester différentes options
Tu peux changer la palette dans `colors.js` :
- `cyberpunkRed` (recommandé)
- `cyberpunkMagenta` (plus énergique)
- `cyberpunkBordeaux` (plus sobre)

## 🎨 Options de Couleurs

### Option 1 : Rouge Moderne (#E63946) ⭐ **RECOMMANDÉ**
- ✅ Énergique mais pas agressif
- ✅ Bon contraste sur fond noir
- ✅ Évite l'association "erreur"

### Option 2 : Rouge Magenta (#FF006E)
- ✅ Très cyberpunk
- ⚠️ Plus intense, à utiliser avec modération

### Option 3 : Rouge Bordeaux (#B91C1C)
- ✅ Plus sobre et élégant
- ✅ Moins "alerte"
- ⚠️ Moins énergique

## 💡 Conseils d'Utilisation

1. **Accents seulement** : Rouge pour les boutons principaux, liens, logos
2. **Opacités** : Utiliser `Colors.border` (25% opacité) pour les bordures
3. **Cyan en complément** : Utiliser `Colors.cyan` pour les éléments secondaires
4. **Erreurs** : Toujours utiliser `Colors.error` (rouge différent) pour les erreurs

## 🚀 Prochaines Étapes

1. Tester la palette sur un écran (ex: TicketsPage)
2. Vérifier la lisibilité sur différents appareils
3. Ajuster les opacités si nécessaire
4. Migrer progressivement tous les écrans

