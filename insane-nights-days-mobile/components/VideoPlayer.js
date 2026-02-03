import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Text,
  Dimensions,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { WebView } from 'react-native-webview';
import { useLanguage } from '../contexts/LanguageContext';

const { width, height } = Dimensions.get('window');

export default function VideoPlayer({ videoUrl, thumbnailUrl, title, visible, onClose, isYouTube = false }) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);

  // Convertir videoUrl en source valide
  const getVideoSource = () => {
    if (!videoUrl) return null;
    
    // Si c'est une string, l'utiliser directement
    if (typeof videoUrl === 'string') {
      return videoUrl;
    }
    
    // Si c'est un objet (require()), extraire l'URI
    if (typeof videoUrl === 'object' && videoUrl !== null) {
      return videoUrl.uri || videoUrl;
    }
    
    return null;
  };

  const videoSource = getVideoSource();
  
  // Extraire l'ID YouTube si c'est une vidéo YouTube
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
    }
    return null;
  };

  const youtubeEmbedUrl = isYouTube ? getYouTubeEmbedUrl(videoSource) : null;
  
  // Créer le player seulement si on a une source valide et que le modal est visible (pas pour YouTube).
  // Évite les erreurs Android "shared object already released" quand visible toggle vite.
  const playerSource = useMemo(() => {
    if (isYouTube) return null;
    if (!visible) return null;
    if (!videoSource) return null;
    return videoSource;
  }, [isYouTube, visible, videoSource]);

  const player = useVideoPlayer(playerSource, (player) => {
    try {
      player.play();
    } catch (e) {
      // best-effort
    }
  });

  useEffect(() => {
    let t = null;
    if (visible) {
      setLoading(true);
      // Le player se charge automatiquement (fallback UX)
      t = setTimeout(() => setLoading(false), 800);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [visible, videoSource, isYouTube]);

  // Ne pas afficher si pas de source
  if (!videoSource || !visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.videoContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
          
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF1744" />
            </View>
          )}

          {isYouTube && youtubeEmbedUrl ? (
            <WebView
              source={{ uri: youtubeEmbedUrl }}
              style={styles.video}
              allowsFullscreenVideo={true}
              mediaPlaybackRequiresUserAction={false}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          ) : videoSource && !isYouTube && player ? (
            <VideoView
              style={styles.video}
              player={player}
              allowsFullscreen
              allowsPictureInPicture
              contentFit="contain"
              nativeControls
            />
          ) : null}

          {title && (
            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>{title}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: width,
    height: height * 0.6,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 23, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  titleContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
  },
  titleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
