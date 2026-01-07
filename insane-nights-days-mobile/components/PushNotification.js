import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import Colors from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Composant de notification push qui apparaît en haut de l'écran
 * @param {Object} props
 * @param {boolean} props.visible - Si la notification est visible
 * @param {string} props.message - Message à afficher
 * @param {Function} props.onPress - Callback quand on clique sur la notification
 * @param {Function} props.onClose - Callback quand la notification se ferme
 */
export default function PushNotification({ visible, message, onPress, onClose }) {
  const { language } = useLanguage();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animation d'entrée
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Fermeture automatique après 5 secondes
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      // Animation de sortie
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onClose) onClose();
    });
  };

  const handlePress = () => {
    handleClose();
    if (onPress) {
      // Petit délai pour que l'animation de fermeture commence
      setTimeout(() => {
        onPress();
      }, 100);
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.notification}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>
            {language === 'fr' ? 'Nouveau message' : 'New message'}
          </Text>
          <Text style={styles.message} numberOfLines={1}>
            {message || (language === 'fr' ? 'Vous avez reçu un nouveau message' : 'You have received a new message')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  notification: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#fff',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
