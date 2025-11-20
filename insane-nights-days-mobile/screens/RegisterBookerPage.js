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

export default function RegisterBookerPage() {
  const { language, t } = useLanguage();
  const { navigate } = useNavigation();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    pseudo: user?.username || '',
    nom: '',
    prenom: '',
    email: user?.email || '',
    phonePro: '',
    bookerType: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (loading) return;

    // Validation
    if (!formData.pseudo || !formData.nom || !formData.prenom || !formData.email || !formData.phonePro || !formData.bookerType) {
      Alert.alert(
        language === 'fr' ? 'Champs manquants' : 'Missing fields',
        language === 'fr' ? 'Merci de remplir tous les champs.' : 'Please fill in all fields.',
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

      const response = await api.createBookerProfile({
        token: user.token,
        pseudo: formData.pseudo,
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        phonePro: formData.phonePro,
        bookerType: formData.bookerType,
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
          ? 'Profil Booker créé avec succès !'
          : 'Booker profile created successfully!',
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
      console.error('Erreur création profil Booker:', error);
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
            {language === 'fr' ? 'Compte Booker' : 'Booker Account'}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>
            {language === 'fr' ? 'Nom' : 'Last name'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Ton nom' : 'Your last name'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="words"
            value={formData.nom}
            onChangeText={(value) => handleChange('nom', value)}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Prénom' : 'First name'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Ton prénom' : 'Your first name'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="words"
            value={formData.prenom}
            onChangeText={(value) => handleChange('prenom', value)}
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
            {language === 'fr' ? 'Téléphone pro' : 'Professional phone'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? '06 12 34 56 78' : '+33 6 12 34 56 78'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="phone-pad"
            value={formData.phonePro}
            onChangeText={(value) => handleChange('phonePro', value)}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Type de booker' : 'Booker type'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Ex: Indépendant, Agence, etc.' : 'Ex: Independent, Agency, etc.'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={formData.bookerType}
            onChangeText={(value) => handleChange('bookerType', value)}
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

