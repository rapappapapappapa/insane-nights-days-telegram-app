import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

/**
 * Composant réutilisable pour la vidéo d'arrière-plan
 * @param {number} opacity - Opacité de l'overlay (défaut: 0.6)
 */
export default function BackgroundVideo({ opacity = 0.6 }) {
  const videoSource = useMemo(() => require('../assets/Background_D_.mp4'), []);
  // Important: configurer le player dans le callback du hook pour éviter
  // des effets "après release" (Android: shared object already released).
  const backgroundVideo = useVideoPlayer(videoSource, (player) => {
    try {
      player.loop = true;
      player.muted = true;
      player.play();
    } catch (e) {
      // best-effort (ne pas crasher l'app)
    }
  });
  
  return (
    <>
      {backgroundVideo ? (
        <VideoView
          // key pour forcer un remount propre si le player change
          key={`bg-${String(videoSource)}`}
          player={backgroundVideo}
          style={styles.backgroundVideo}
          contentFit="cover"
          nativeControls={false}
          allowsPictureInPicture={false}
        />
      ) : null}
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

