import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

/**
 * Composant réutilisable pour la vidéo d'arrière-plan
 * @param {number} opacity - Opacité de l'overlay (défaut: 0.6)
 */
export default function BackgroundVideo({ opacity = 0.6 }) {
  const videoSource = useMemo(() => require('../assets/Background_D_.mp4'), []);
  
  return (
    <>
      <Video
        source={videoSource}
        style={styles.backgroundVideo}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />
      <View style={[styles.videoOverlay, { backgroundColor: `rgba(11, 11, 14, ${opacity})` }]} />
    </>
  );
}

const styles = StyleSheet.create({
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: 0,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: 0,
  },
});

