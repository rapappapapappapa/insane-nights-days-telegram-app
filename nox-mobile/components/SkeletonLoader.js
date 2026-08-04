import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

/**
 * Composant Skeleton pour afficher un placeholder animé pendant le chargement
 * Amélioré avec effet shimmer moderne
 * @param {number|string} width - Largeur du skeleton
 * @param {number|string} height - Hauteur du skeleton
 * @param {object} style - Styles additionnels
 * @param {boolean} circular - Si le skeleton doit être circulaire
 */
export default function SkeletonLoader({ 
  width = '100%', 
  height = 20, 
  style,
  circular = false 
}) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });
  
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: circular ? height / 2 : 12,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#1a1a1f',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.5,
  },
});

