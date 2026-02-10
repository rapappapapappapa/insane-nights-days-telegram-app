import React, { useState, useEffect } from 'react';
import { Image, View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SkeletonLoader from './SkeletonLoader';

/**
 * Composant Image avec retry automatique et gestion d'erreurs améliorée
 * @param {string} uri - URI de l'image
 * @param {object} style - Styles pour l'image
 * @param {string} resizeMode - Mode de redimensionnement
 * @param {number} maxRetries - Nombre maximum de tentatives (défaut: 3)
 * @param {number} retryDelay - Délai entre les tentatives en ms (défaut: 1000)
 * @param {function} onError - Callback appelé après tous les retries échoués
 * @param {boolean} showRetryButton - Afficher un bouton de retry manuel (défaut: true)
 * @param {object} fallbackStyle - Styles pour le fallback
 */
export default function ImageWithRetry({
  uri,
  style,
  resizeMode = 'cover',
  maxRetries = 3,
  retryDelay = 1000,
  onError,
  showRetryButton = true,
  fallbackStyle,
  ...props
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentUri, setCurrentUri] = useState(uri);

  useEffect(() => {
    // Réinitialiser l'état quand l'URI change
    setLoading(true);
    setError(false);
    setRetryCount(0);
    setCurrentUri(uri);
  }, [uri]);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    if (retryCount < maxRetries) {
      // Retry automatique avec délai progressif
      const delay = retryDelay * (retryCount + 1);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        // Forcer le rechargement en ajoutant un timestamp à l'URI
        // Nettoyer le timestamp précédent si présent
        const baseUri = uri.split('?')[0];
        setCurrentUri(`${baseUri}?retry=${Date.now()}`);
        setLoading(true);
      }, delay);
    } else {
      // Tous les retries ont échoué
      setLoading(false);
      setError(true);
      onError?.();
    }
  };

  const handleManualRetry = () => {
    setError(false);
    setLoading(true);
    setRetryCount(0);
    setCurrentUri(`${uri}?retry=${Date.now()}`);
  };

  if (error) {
    // Si un fallbackStyle est fourni, retourner null pour laisser le parent gérer le fallback
    // (utile pour les avatars qui ont un placeholder avec texte)
    if (fallbackStyle) {
      return null;
    }
    
    return (
      <View style={[style, styles.errorContainer, fallbackStyle]}>
        <Ionicons name="image-outline" size={24} color="rgba(255,255,255,0.4)" />
        {showRetryButton && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleManualRetry}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={16} color="#FF1744" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={style}>
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
          <SkeletonLoader width="100%" height="100%" style={styles.skeleton} />
        </View>
      )}
      <Image
        source={{ uri: currentUri }}
        style={[style, loading && styles.hidden]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1f',
    borderRadius: 12,
  },
  skeleton: {
    borderRadius: 12,
  },
  hidden: {
    opacity: 0,
  },
  errorContainer: {
    backgroundColor: '#1a1a1f',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 100,
    position: 'relative',
  },
  retryButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 23, 68, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.4)',
  },
});
