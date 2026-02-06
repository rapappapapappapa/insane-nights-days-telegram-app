import React, { useState } from 'react';
import { Image, StyleSheet, View, Text } from 'react-native';

/**
 * ✅ Composant Logo NOX réutilisable
 * Utilise le logo NOX (vrailogo.png)
 * 
 * Le logo est placé dans: insane-nights-days-mobile/assets/vrailogo.png
 * Format: PNG avec fond transparent ou fond noir
 * 
 * ✅ Fallback si le logo ne charge pas (affiche le carré rouge avec "N")
 */
export default function Logo({ size = 100, style }) {
  const [imageError, setImageError] = useState(false);
  
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {!imageError ? (
        <Image
          source={require('../assets/vrailogo.png')}
          style={[styles.logo, { width: size, height: size }]}
          resizeMode="contain"
          onError={() => setImageError(true)}
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
  // ✅ AJOUT: Style pour le fallback (carré rouge avec "I")
  fallback: {
    backgroundColor: '#FF1744',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#0b0b0e',
    fontWeight: '900',
  },
});
