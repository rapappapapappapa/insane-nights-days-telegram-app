import React, { useState } from 'react';
import { Image, StyleSheet, View, Text, Platform } from 'react-native';
import Colors from '../constants/colors';

/**
 * ✅ Composant Logo NOX réutilisable
 * Utilise le logo NOX (noxlogo.png)
 * 
 * Le logo est placé dans: insane-nights-days-mobile/assets/noxlogo.png
 * Format: PNG avec fond transparent ou fond noir
 * 
 * ✅ Fallback si le logo ne charge pas (affiche le carré rouge avec "N")
 */
export default function Logo({ size = 100, style }) {
  const [imageError, setImageError] = useState(false);
  
  // ✅ DEBUG: Logger pour diagnostiquer les problèmes de chargement sur Android
  const handleImageError = (error) => {
    console.error('[Logo] Erreur de chargement de noxlogo.png:', error);
    console.error('[Logo] Platform:', Platform.OS);
    setImageError(true);
  };
  
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {!imageError ? (
        <Image
          source={require('../assets/noxlogo.png')}
          style={[styles.logo, { width: size, height: size }]}
          resizeMode="contain"
          onError={handleImageError}
        />
      ) : (
        // Fallback si l'image ne charge pas
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size * 0.25 }]}>
          <Text style={[styles.fallbackText, { fontSize: size * 0.5 }]}>N</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  // ✅ AJOUT: Style pour le fallback (carré rouge avec "N")
  fallback: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: Colors.background,
    fontWeight: '900',
  },
});
