import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

/**
 * Composant réutilisable pour la vidéo d'arrière-plan
 * @param {number} opacity - Opacité de l'overlay (défaut: 0.6)
 */
export default function BackgroundVideo({ opacity = 0.6 }) {
  const videoSource = useMemo(() => require('../assets/Background_D_.mp4'), []);
  const backgroundVideo = useVideoPlayer(videoSource);
  
  useEffect(() => {
    if (backgroundVideo) {
      try {
        backgroundVideo.play();
        backgroundVideo.loop = true;
        backgroundVideo.muted = true;
      } catch (error) {
        console.warn('Erreur lors de la lecture de la vidéo:', error);
      }
    }
    
    return () => {
      // Ne pas essayer de pause() dans le cleanup car le player peut être détruit
      // Le cleanup se fera automatiquement quand le composant est démonté
    };
  }, [backgroundVideo]);
  
  return (
    <>
      <VideoView
        player={backgroundVideo}
        style={styles.backgroundVideo}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
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

