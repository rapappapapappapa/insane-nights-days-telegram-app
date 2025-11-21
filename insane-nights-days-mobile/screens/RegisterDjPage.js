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
import CityAutocomplete from '../components/CityAutocomplete';

export default function RegisterDjPage() {
  const { language, t } = useLanguage();
  const { navigate } = useNavigation();
  const { user, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    pseudo: user?.username || '',
    artistName: '',
    email: user?.email || '',
    city: '',
    phone: '',
    dateNaissance: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    // Validation spéciale pour la date de naissance
    if (field === 'dateNaissance') {
      // N'autoriser que les chiffres
      const cleaned = value.replace(/[^0-9]/g, '');
      
      // Formater automatiquement avec des slashes
      let formatted = cleaned;
      if (cleaned.length > 2) {
        formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
      }
      if (cleaned.length > 4) {
        formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
      }
      
      // Limiter à 10 caractères (jj/mm/aaaa)
      const limited = formatted.length > 10 ? formatted.slice(0, 10) : formatted;
      setFormData((prev) => ({ ...prev, [field]: limited }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const validateDate = (dateString) => {
    // Format attendu: jj/mm/aaaa
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }
    
    const [, day, month, year] = dateString.match(dateRegex);
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    // Vérifier les limites raisonnables
    if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
      return false;
    }
    if (monthNum < 1 || monthNum > 12) {
      return false;
    }
    if (dayNum < 1 || dayNum > 31) {
      return false;
    }
    
    // Vérifier que la date est valide (ex: pas le 31 février)
    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (
      date.getFullYear() !== yearNum ||
      date.getMonth() !== monthNum - 1 ||
      date.getDate() !== dayNum
    ) {
      return false;
    }
    
    // Vérifier que la personne a au moins 13 ans
    const today = new Date();
    const age = today.getFullYear() - yearNum;
    if (age < 13) {
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (loading) return;

    // Validation
    if (!formData.pseudo || !formData.artistName || !formData.email || !formData.city || !formData.phone || !formData.dateNaissance) {
      Alert.alert(
        language === 'fr' ? 'Champs manquants' : 'Missing fields',
        language === 'fr' ? 'Merci de remplir tous les champs.' : 'Please fill in all fields.',
      );
      return;
    }

    // Validation de la date de naissance
    if (!validateDate(formData.dateNaissance)) {
      Alert.alert(
        language === 'fr' ? 'Date invalide' : 'Invalid date',
        language === 'fr' 
          ? 'La date de naissance doit être au format jj/mm/aaaa et vous devez avoir au moins 13 ans.'
          : 'Date of birth must be in dd/mm/yyyy format and you must be at least 13 years old.',
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

      const response = await api.createDjProfile({
        token: user.token,
        pseudo: formData.pseudo,
        artistName: formData.artistName,
        email: formData.email,
        city: formData.city,
        phone: formData.phone,
        birthDate: formData.dateNaissance,
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

      // Basculer automatiquement vers le profil DJ créé
      try {
        const switchResponse = await api.switchProfile(user.token, 'DJ');
        if (switchResponse && switchResponse.success) {
          updateUser({ activeProfileType: 'DJ' });
        }
      } catch (switchError) {
        console.error('Erreur bascule profil:', switchError);
        // On continue quand même, le profil est créé
      }

      // Succès !
      Alert.alert(
        language === 'fr' ? 'Profil créé !' : 'Profile created!',
        language === 'fr'
          ? 'Profil DJ créé avec succès !'
          : 'DJ profile created successfully!',
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
      console.error('Erreur création profil DJ:', error);
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
            {language === 'fr' ? 'Compte DJ' : 'DJ Account'}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>
            {language === 'fr' ? 'Nom d\'artiste' : 'Artist name'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Ton nom d\'artiste' : 'Your artist name'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="words"
            value={formData.artistName}
            onChangeText={(value) => handleChange('artistName', value)}
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
            {language === 'fr' ? 'Email pro' : 'Professional email'}
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
            {language === 'fr' ? 'Ville' : 'City'}
          </Text>
          <CityAutocomplete
            value={formData.city}
            onChangeText={(value) => handleChange('city', value)}
            placeholder={language === 'fr' ? 'Tapez le nom de votre ville...' : 'Type your city name...'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.input}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Téléphone' : 'Phone'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? '06 12 34 56 78' : '+33 6 12 34 56 78'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="phone-pad"
            value={formData.phone}
            onChangeText={(value) => handleChange('phone', value)}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Date de naissance' : 'Date of birth'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'jj/mm/aaaa' : 'dd/mm/yyyy'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="numeric"
            maxLength={10}
            value={formData.dateNaissance}
            onChangeText={(value) => handleChange('dateNaissance', value)}
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
              {language === 'fr' ? 'Créer mon compte DJ' : 'Create my DJ account'}
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

