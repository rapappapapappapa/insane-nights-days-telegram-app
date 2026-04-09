import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import Colors from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useAudioPlayer } from 'expo-audio';
import { useLanguage } from '../contexts/LanguageContext';

export default function AudioPlayer({ audioUrl, title, onClose }) {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  
  // Convertir l'URL si c'est un objet (require())
  const audioSource = useMemo(() => {
    if (!audioUrl) return null;
    if (typeof audioUrl === 'object' && audioUrl !== null) {
      return audioUrl.uri || audioUrl;
      }
    return audioUrl;
  }, [audioUrl]);

  // Si c'est YouTube, on ne peut pas le lire directement
  const isValidSource = useMemo(() => {
    if (!audioSource || typeof audioSource !== 'string') return true;
    return !audioSource.includes('youtube.com') && !audioSource.includes('youtu.be');
  }, [audioSource]);

  // Ne créer le player que si on a une source valide
  const shouldCreatePlayer = audioSource && isValidSource;
  const player = useAudioPlayer(shouldCreatePlayer ? audioSource : null);
  
  // Vérifier que le player est valide avant d'accéder à ses propriétés
  const isPlayerValid = player && typeof player === 'object' && 'playing' in player;
  const isPlaying = isPlayerValid ? (player.playing ?? false) : false;
  const duration = isPlayerValid && player.duration ? Math.floor(player.duration * 1000) : 0;
  const position = isPlayerValid && player.currentTime ? Math.floor(player.currentTime * 1000) : 0;

  // Note: expo-audio gère automatiquement le nettoyage du player quand le composant est démonté
  // Pas besoin de cleanup manuel qui peut causer des erreurs si le player est déjà libéré

  useEffect(() => {
    if (!isPlayerValid || !isValidSource || !audioSource) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    let timeoutId = null;
    let isMounted = true;
    
    const checkLoaded = () => {
      if (!isMounted) return;
      
      try {
        if (isPlayerValid && player && player.duration && player.duration > 0) {
          setIsLoading(false);
        } else if (isPlayerValid && player) {
          timeoutId = setTimeout(checkLoaded, 100);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        // Si le player est libéré, arrêter la vérification
        console.warn('Player audio libéré pendant le chargement:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    checkLoaded();
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [player, isValidSource, audioSource, isPlayerValid]);

  const playPause = () => {
    if (!isPlayerValid || !player || !isValidSource) return;
    try {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.warn('Erreur lors de la lecture/pause audio:', error);
    }
  };

  const seek = (value) => {
    if (!isPlayerValid || !player || !isValidSource) return;
    try {
      player.seekTo(value / 1000); // Convertir en secondes
    } catch (error) {
      console.warn('Erreur lors du seek audio:', error);
    }
  };

  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>
          {language === 'fr' ? 'Chargement...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  if (!isPlayerValid || !player || !isValidSource || !audioSource) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {language === 'fr' ? 'Impossible de charger l\'audio' : 'Unable to load audio'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title && (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      )}
      
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={playPause}
          disabled={!isPlayerValid || !player || !isValidSource}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color="#fff"
            style={isPlaying ? styles.pauseIcon : styles.playIcon}
          />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <Slider
            style={styles.slider}
            value={position}
            minimumValue={0}
            maximumValue={duration || 1}
            onSlidingComplete={seek}
            minimumTrackTintColor=Colors.primary
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor=Colors.primary
            disabled={!isPlayerValid || !player || !isValidSource || duration === 0}
          />
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#1a1a1f',
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    marginLeft: 2, // Décalage pour centrer le play
  },
  pauseIcon: {
    marginLeft: 0, // Pas de décalage pour la pause
  },
  progressContainer: {
    flex: 1,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.primary,
    fontSize: 12,
    textAlign: 'center',
  },
});

