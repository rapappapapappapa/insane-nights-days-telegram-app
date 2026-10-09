import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Composant Toast pour afficher des notifications
 * @param {string} message - Le message à afficher
 * @param {string} type - Le type de toast ('success', 'error', 'info', 'warning')
 * @param {boolean} visible - Si le toast est visible
 * @param {Function} onHide - Callback appelé quand le toast se cache
 * @param {number} duration - Durée d'affichage en ms (défaut: 3000)
 */
export default function Toast({ 
  message, 
  type = 'info', 
  visible, 
  onHide,
  duration = 3000 
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-50)).current;
  
  useEffect(() => {
    if (visible) {
      // Animation d'entrée
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Timer pour masquer automatiquement
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -50,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onHide?.();
        });
      }, duration);
      
      return () => clearTimeout(timer);
    } else {
      // Réinitialiser les valeurs quand non visible
      opacity.setValue(0);
      translateY.setValue(-50);
    }
  }, [visible, duration]);
  
  if (!visible || !message) return null;
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      default:
        return 'information-circle';
    }
  };
  
  return (
    <Animated.View
      style={[
        styles.toast,
        styles[type],
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Ionicons name={getIcon()} size={20} color="#fff" style={styles.icon} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  success: {
    backgroundColor: '#10b981',
  },
  error: {
    backgroundColor: '#EF4444',
  },
  info: {
    backgroundColor: '#3b82f6',
  },
  warning: {
    backgroundColor: '#f59e0b',
  },
  icon: {
    marginRight: 12,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

