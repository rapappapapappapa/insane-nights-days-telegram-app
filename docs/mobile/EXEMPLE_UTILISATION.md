# 📝 Exemples d'utilisation des nouveaux composants

> **Document historique (audit juil. 2026)** — les exemples citent `HomePage.js` et `WelcomePage.js`, **supprimés en Phase D (août 2026)**.  
> Pour l’état actuel : `SplashPage`, `ProHomePage`, `CommunityHomePage`, composants dans `components/nox/`.

---

```javascript
// ✅ AVANT (HomePage.js)
const videoSource = useMemo(() => require('../assets/Background_D_.mp4'), []);
const backgroundVideo = useVideoPlayer(videoSource);

useEffect(() => {
  if (backgroundVideo) {
    backgroundVideo.play();
    backgroundVideo.loop = true;
    backgroundVideo.muted = true;
  }
}, [backgroundVideo]);

return (
  <View style={styles.container}>
    <VideoView
      player={backgroundVideo}
      style={styles.backgroundVideo}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
    <View style={styles.videoOverlay} />
    {/* ... reste du code */}
  </View>
);

// ✅ APRÈS (HomePage.js)
import BackgroundVideo from '../components/BackgroundVideo';

return (
  <View style={styles.container}>
    <BackgroundVideo opacity={0.6} />
    {/* ... reste du code */}
  </View>
);
```

## 2. Utilisation de useDebounce dans EventsPage

```javascript
// ✅ AVANT (EventsPage.js)
const [searchTerm, setSearchTerm] = useState('');

const filteredEvents = events.filter(event => {
  const matchesGenre = selectedGenre === 'all' || event.genre === selectedGenre;
  const matchesSearch =
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location.toLowerCase().includes(searchTerm.toLowerCase());
  return matchesGenre && matchesSearch;
});

// ✅ APRÈS (EventsPage.js)
import { useDebounce } from '../hooks/useDebounce';
import { useMemo } from 'react';

const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 300);

const filteredEvents = useMemo(() => {
  return events.filter(event => {
    const matchesGenre = selectedGenre === 'all' || event.genre === selectedGenre;
    const matchesSearch =
      event.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    return matchesGenre && matchesSearch;
  });
}, [events, selectedGenre, debouncedSearchTerm]);
```

## 3. Utilisation de SkeletonLoader dans EventsPage

```javascript
// ✅ AVANT (EventsPage.js)
if (loading && events.length === 0) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF1744" />
      <Text style={styles.loadingText}>Chargement des événements...</Text>
    </View>
  );
}

// ✅ APRÈS (EventsPage.js)
import SkeletonLoader from '../components/SkeletonLoader';

if (loading && events.length === 0) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.eventsTopBar}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => navigate('welcome')}>
          <Text style={styles.backButtonTopText}>← Retour</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.eventsScroll} contentContainerStyle={styles.eventsContent}>
        <View style={styles.eventsHeader}>
          <SkeletonLoader width="60%" height={28} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="80%" height={14} />
        </View>
        
        {[1, 2, 3].map(i => (
          <View key={i} style={styles.eventCard}>
            <SkeletonLoader width="100%" height={200} style={{ marginBottom: 16 }} />
            <SkeletonLoader width="80%" height={20} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="60%" height={16} style={{ marginBottom: 12 }} />
            <SkeletonLoader width="100%" height={12} style={{ marginBottom: 4 }} />
            <SkeletonLoader width="70%" height={12} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
```

## 4. Utilisation de EmptyState dans EventsPage

```javascript
// ✅ AVANT (EventsPage.js)
{filteredEvents.length === 0 && (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyEmoji}>😔</Text>
    <Text style={styles.emptyTitle}>Aucun événement trouvé</Text>
    <Text style={styles.emptyText}>
      Essayez de modifier vos filtres ou votre recherche
    </Text>
  </View>
)}

// ✅ APRÈS (EventsPage.js)
import EmptyState from '../components/EmptyState';

{filteredEvents.length === 0 && !loading && (
  <EmptyState
    emoji="🎵"
    title="Aucun événement trouvé"
    message="Essayez de modifier vos filtres ou votre recherche"
    actionLabel="Réinitialiser les filtres"
    onAction={() => {
      setSearchTerm('');
      setSelectedGenre('all');
    }}
  />
)}
```

## 5. Utilisation de Toast pour les erreurs

```javascript
// ✅ AVANT (HomePage.js)
const handleLogin = async () => {
  // ...
  if (result.success) {
    navigate('welcome');
  } else {
    Alert.alert(
      language === 'fr' ? 'Erreur de connexion' : 'Login error',
      result.error ?? (language === 'fr' ? 'Erreur de connexion.' : 'Login error.'),
    );
  }
};

// ✅ APRÈS (HomePage.js)
import Toast from '../components/Toast';

const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

const handleLogin = async () => {
  // ...
  if (result.success) {
    setToast({
      visible: true,
      message: language === 'fr' ? 'Connexion réussie !' : 'Login successful!',
      type: 'success',
    });
    setTimeout(() => navigate('welcome'), 500);
  } else {
    setToast({
      visible: true,
      message: result.error ?? (language === 'fr' ? 'Erreur de connexion.' : 'Login error.'),
      type: 'error',
    });
  }
};

return (
  <View style={styles.container}>
    {/* ... reste du code */}
    <Toast
      message={toast.message}
      type={toast.type}
      visible={toast.visible}
      onHide={() => setToast({ ...toast, visible: false })}
    />
  </View>
);
```

## 6. Optimisation des genres avec useMemo

```javascript
// ✅ AVANT (EventsPage.js ligne 97)
const genres = ['all', ...new Set(events.map(event => event.genre))];

// ✅ APRÈS (EventsPage.js)
const genres = useMemo(() => {
  return ['all', ...new Set(events.map(event => event.genre))];
}, [events]);
```

## 7. Hook personnalisé pour Toast (optionnel)

Pour simplifier l'utilisation du Toast, créer un hook :

```javascript
// hooks/useToast.js
import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  
  const showToast = useCallback((message, type = 'info') => {
    setToast({ visible: true, message, type });
  }, []);
  
  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);
  
  return { toast, showToast, hideToast };
}

// Utilisation
const { toast, showToast, hideToast } = useToast();

// Dans handleLogin
if (result.success) {
  showToast('Connexion réussie !', 'success');
} else {
  showToast(result.error, 'error');
}

// Dans le JSX
<Toast
  message={toast.message}
  type={toast.type}
  visible={toast.visible}
  onHide={hideToast}
/>
```

## 📊 Checklist d'implémentation

- [ ] Créer le dossier `hooks/` et ajouter `useDebounce.js`
- [ ] Créer les composants dans `components/` :
  - [ ] `BackgroundVideo.js`
  - [ ] `EmptyState.js`
  - [ ] `Toast.js`
  - [ ] `SkeletonLoader.js`
- [ ] Modifier `HomePage.js` :
  - [ ] Remplacer le code vidéo par `<BackgroundVideo />`
  - [ ] Ajouter Toast pour les erreurs
- [ ] Modifier `EventsPage.js` :
  - [ ] Ajouter `useDebounce` pour la recherche
  - [ ] Ajouter `useMemo` pour les genres et filteredEvents
  - [ ] Remplacer le spinner par `SkeletonLoader`
  - [ ] Remplacer l'empty state par `<EmptyState />`
- [ ] Modifier `WelcomePage.js` :
  - [ ] Remplacer le code vidéo par `<BackgroundVideo />`
- [ ] Tester toutes les fonctionnalités

