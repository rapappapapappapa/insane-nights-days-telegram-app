import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

/**
 * Composant Skeleton pour afficher un placeholder animé pendant le chargement
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
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });
  
  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          opacity,
          borderRadius: circular ? height / 2 : 12,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#1a1a1f',
  },
});

