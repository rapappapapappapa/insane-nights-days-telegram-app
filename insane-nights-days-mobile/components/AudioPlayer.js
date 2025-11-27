import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import { useLanguage } from '../contexts/LanguageContext';

export default function AudioPlayer({ audioUrl, title, onClose }) {
  const { language } = useLanguage();
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [audioUrl]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      
      // Si on a déjà un son, le décharger
      if (sound) {
        await sound.unloadAsync();
      }

      // Configurer le mode audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Convertir l'URL si c'est un objet (require())
      let audioSource = audioUrl;
      if (typeof audioUrl === 'object' && audioUrl !== null) {
        audioSource = audioUrl.uri || audioUrl;
      }

      // Si c'est YouTube, on ne peut pas le lire directement
      if (typeof audioSource === 'string' && 
          (audioSource.includes('youtube.com') || audioSource.includes('youtu.be'))) {
        console.warn('Les URLs YouTube ne peuvent pas être lues directement en audio');
        setIsLoading(false);
        return;
      }

      // Charger le son
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: typeof audioSource === 'string' ? audioSource : audioSource },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsLoading(false);
    } catch (error) {
      console.error('Erreur chargement audio:', error);
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const playPause = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Erreur play/pause:', error);
    }
  };

  const seek = async (value) => {
    if (!sound) return;
    try {
      await sound.setPositionAsync(value);
    } catch (error) {
      console.error('Erreur seek:', error);
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
        <ActivityIndicator size="small" color="#FF1744" />
        <Text style={styles.loadingText}>
          {language === 'fr' ? 'Chargement...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  if (!sound) {
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
          disabled={!sound}
        >
          <Text style={styles.playIcon}>
            {isPlaying ? '⏸' : '▶'}
          </Text>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <Slider
            style={styles.slider}
            value={position}
            minimumValue={0}
            maximumValue={duration || 1}
            onSlidingComplete={seek}
            minimumTrackTintColor="#FF1744"
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor="#FF1744"
            disabled={!sound || duration === 0}
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
    backgroundColor: '#FF1744',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: '#fff',
    fontSize: 20,
    marginLeft: 2,
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
    color: '#FF1744',
    fontSize: 12,
    textAlign: 'center',
  },
});

