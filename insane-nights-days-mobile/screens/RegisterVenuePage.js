import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';

export default function RegisterVenuePage() {
  const { language, t } = useLanguage();
  const { navigate } = useNavigation();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    pseudo: user?.username || '',
    venueName: '',
    email: user?.email || '',
    password: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (loading) return;

    // Validation
    if (!formData.pseudo || !formData.venueName || !formData.email || !formData.password || !formData.address) {
      Alert.alert(
        language === 'fr' ? 'Champs manquants' : 'Missing fields',
        language === 'fr' ? 'Merci de remplir tous les champs.' : 'Please fill in all fields.',
      );
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert(
        language === 'fr' ? 'Mot de passe trop court' : 'Password too short',
        language === 'fr' ? 'Le mot de passe doit contenir au moins 6 caractères.' : 'Password must be at least 6 characters.',
      );
      return;
    }

    setLoading(true);

    try {
      if (!user?.id) {
        Alert.alert(
          language === 'fr' ? 'Erreur' : 'Error',
          language === 'fr'
            ? 'Vous devez être connecté pour créer un profil.'
            : 'You must be logged in to create a profile.',
        );
        setLoading(false);
        return;
      }

      if (!user?.token) {
        Alert.alert(
          language === 'fr' ? 'Erreur' : 'Error',
          language === 'fr'
            ? 'Token d\'authentification manquant. Veuillez vous reconnecter.'
            : 'Authentication token missing. Please log in again.',
        );
        setLoading(false);
        return;
      }

      const response = await api.createVenueProfile({
        token: user.token,
        pseudo: formData.pseudo,
        venueName: formData.venueName,
        email: formData.email,
        password: formData.password,
        address: formData.address,
      });

      if (!response) {
        Alert.alert(
          language === 'fr' ? 'Erreur de connexion' : 'Connection error',
          language === 'fr'
            ? 'Impossible de joindre le serveur. Vérifie ta connexion.'
            : 'Unable to reach server. Check your connection.',
        );
        setLoading(false);
        return;
      }

      if (!response.success) {
        Alert.alert(
          language === 'fr' ? 'Erreur' : 'Error',
          response.message || (language === 'fr' ? 'Erreur lors de la création du profil.' : 'Error creating profile.'),
        );
        setLoading(false);
        return;
      }

      // Succès !
      Alert.alert(
        language === 'fr' ? 'Profil créé !' : 'Profile created!',
        language === 'fr'
          ? 'Profil Lieu créé avec succès !'
          : 'Venue profile created successfully!',
        [
          {
            text: language === 'fr' ? 'Continuer' : 'Continue',
            onPress: () => {
              navigate('welcome');
            },
          },
        ],
      );
    } catch (error) {
      console.error('Erreur création profil Lieu:', error);
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        error.message || (language === 'fr' ? 'Erreur lors de la création du profil.' : 'Error creating profile.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigate('accountType')}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {language === 'fr' ? 'Compte Lieu' : 'Venue Account'}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>
            {language === 'fr' ? 'Nom du lieu' : 'Venue name'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Nom de ton lieu' : 'Your venue name'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="words"
            value={formData.venueName}
            onChangeText={(value) => handleChange('venueName', value)}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Pseudo' : 'Username'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Ton pseudo' : 'Your username'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="words"
            value={formData.pseudo}
            onChangeText={(value) => handleChange('pseudo', value)}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Email' : 'Email'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'ton.email@example.com' : 'your.email@example.com'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Mot de passe' : 'Password'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Choisis un mot de passe' : 'Choose a password'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            secureTextEntry
            value={formData.password}
            onChangeText={(value) => handleChange('password', value)}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Adresse' : 'Address'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? '123 Rue Example, 75001 Paris' : '123 Example Street, 75001 Paris'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={formData.address}
            onChangeText={(value) => handleChange('address', value)}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0b0b0e" />
          ) : (
            <Text style={styles.submitButtonText}>
              {language === 'fr' ? 'Créer mon compte' : 'Create my account'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  form: {
    gap: 18,
    marginBottom: 24,
  },
  label: {
    color: '#ff7a1a',
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
  submitButton: {
    backgroundColor: '#ff7a1a',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '800',
  },
});

