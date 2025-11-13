import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function HomePage({ onNavigate }) {
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = () => {
    setIsConnecting(true);
    
    setTimeout(() => {
      Alert.alert('Succès', '🎉 Wallet TON connecté avec succès ! SBT actif', [
        {
          text: 'Continuer',
          onPress: () => {
            setIsConnecting(false);
            onNavigate('menu');
          },
        },
      ]);
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>I</Text>
        </View>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Insane</Text>
        <Text style={styles.titleOrange}>Nights</Text>
        <Text style={styles.titleOrange}>& Days</Text>
      </View>

      <Text style={styles.subtitle}>
        Révolutionnez l'industrie des événements avec la blockchain
      </Text>

      <TouchableOpacity
        style={[styles.button, isConnecting && styles.buttonDisabled]}
        onPress={connectWallet}
        disabled={!!isConnecting}
      >
        {isConnecting ? (
          <ActivityIndicator color="#111" />
        ) : (
          <Text style={styles.buttonText}>💳 Connecter Wallet TON</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Paiements sécurisés avec TON et Stars
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: '#ff7a1a',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#0b0b0e',
    fontSize: 36,
    fontWeight: '900',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  titleOrange: {
    color: '#ff7a1a',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 48,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#ff7a1a',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    minWidth: 280,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
});
