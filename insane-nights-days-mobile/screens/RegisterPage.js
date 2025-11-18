import React, { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { api } from '../api/config';

export default function RegisterPage({ onNavigate, onAuthSuccess, onUpdateUser }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (loading) {
      return;
    }

    if (!email || !username || !password) {
      Alert.alert('Champs manquants', 'Merci de remplir email, pseudo et mot de passe.');
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Mot de passe trop court',
        'Le mot de passe doit contenir au moins 6 caractères.',
      );
      return;
    }

    setLoading(true);
    try {
      const response = await api.register({ email, username, password });
      if (!response?.success) {
        throw new Error(response?.message ?? "Impossible de créer le compte pour l'instant.");
      }

      onAuthSuccess?.({ user: response.user, token: response.token });
      onUpdateUser?.({
        tickets: 0,
        eventsParticipated: 0,
        lastTicket: null,
      });

      setEmail('');
      setUsername('');
      setPassword('');

      Alert.alert('Inscription réussie', 'Bienvenue sur Insane Nights & Days !', [
        {
          text: 'Aller au profil',
          onPress: () => onNavigate?.('profile'),
        },
      ]);
    } catch (error) {
      const errorMessage =
        error?.message ?? "Une erreur est survenue pendant l'inscription.";
      Alert.alert("Erreur d'inscription", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate?.('home')}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>
            Rejoins la communauté pour suivre tes tickets, ton niveau et ta progression.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="ton.email@example.com"
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Pseudo</Text>
          <TextInput
            style={styles.input}
            placeholder="Ton pseudo"
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="words"
            value={username}
            onChangeText={setUsername}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="Choisis un mot de passe"
            placeholderTextColor="rgba(255,255,255,0.4)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.registerButton, loading && styles.registerButtonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0b0b0e" />
          ) : (
            <Text style={styles.registerButtonText}>Créer mon compte 🔐</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => onNavigate?.('profile')}>
          <Text style={styles.secondaryButtonText}>Déjà inscrit ? Voir le profil</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#0b0b0e',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: '#0b0b0e',
    gap: 32,
  },
  header: {
    gap: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    gap: 18,
  },
  label: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16,
  },
  registerButton: {
    backgroundColor: '#ff7a1a',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

