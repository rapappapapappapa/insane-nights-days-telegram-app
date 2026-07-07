import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function RegisterCommunityPage() {
  const { language, t } = useLanguage();
  const { navigate, goBack } = useNavigation();
  const { user, updateUser } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();

  // Drawer global géré dans App.js
  const [formData, setFormData] = useState({
    pseudo: user?.username || '',
    nom: '',
    prenom: '',
    email: user?.email || '',
    pays: '',
    dateNaissance: '',
  });
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);

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
    if (!formData.pseudo || !formData.nom || !formData.prenom || !formData.email || !formData.pays || !formData.dateNaissance) {
      showError(language === 'fr' ? 'Merci de remplir tous les champs.' : 'Please fill in all fields.');
      return;
    }

    // Validation de la date de naissance
    if (!validateDate(formData.dateNaissance)) {
      showError(language === 'fr' 
        ? 'La date de naissance doit être au format jj/mm/aaaa et vous devez avoir au moins 13 ans.'
        : 'Date of birth must be in dd/mm/yyyy format and you must be at least 13 years old.');
      return;
    }

    setLoading(true);

    try {
      if (!user?.id) {
        showError(language === 'fr' 
          ? 'Vous devez être connecté pour créer un profil.'
          : 'You must be logged in to create a profile.');
        setLoading(false);
        return;
      }

      if (!user?.token) {
        showError(language === 'fr'
          ? 'Token d\'authentification manquant. Veuillez vous reconnecter.'
          : 'Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await api.createCommunityProfile({
        token: user.token,
        pseudo: formData.pseudo,
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        pays: formData.pays,
        dateNaissance: formData.dateNaissance,
      });

      if (!response) {
        showError(language === 'fr'
          ? 'Impossible de joindre le serveur. Vérifie ta connexion.'
          : 'Unable to reach server. Check your connection.');
        setLoading(false);
        return;
      }

      if (!response.success) {
        showError(response.message || (language === 'fr' ? 'Erreur lors de la création du profil.' : 'Error creating profile.'));
        setLoading(false);
        return;
      }

      // Basculer automatiquement vers le profil COMMUNITY créé
      try {
        const switchResponse = await api.switchProfile(user.token, 'COMMUNITY');
        if (switchResponse && switchResponse.success) {
          updateUser({ activeProfileType: 'COMMUNITY' });
        }
      } catch (switchError) {
        console.error('Erreur bascule profil:', switchError);
        // On continue quand même, le profil est créé
      }

      // Succès !
      const successMessage = language === 'fr'
        ? `Votre numéro ISN : ${response.profile?.isnNumber || 'N/A'}\n\nProfil Communauté créé avec succès !`
        : `Your ISN number: ${response.profile?.isnNumber || 'N/A'}\n\nCommunity profile created successfully!`;
      showSuccess(successMessage);
      setTimeout(() => navigate('communityOnboarding'), 2000);
    } catch (error) {
      console.error('Erreur création profil Communauté:', error);
      showError(error.message || (language === 'fr' ? 'Erreur lors de la création du profil.' : 'Error creating profile.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <View style={{ width: 44 }} />
      </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {language === 'fr' ? 'Compte Communauté' : 'Community Account'}
            </Text>
            <Text style={styles.subtitle}>
              {language === 'fr'
                ? 'Votre numéro ISN sera généré.'
                : 'Your ISN number will be generated.'}
            </Text>
          </View>

          <View style={styles.form}>
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
              {language === 'fr' ? 'Pays' : 'Country'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={language === 'fr' ? 'France' : 'France'}
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={formData.pays}
              onChangeText={(value) => handleChange('pays', value)}
              onFocus={() => {
                if (Platform.OS === 'android') {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }
              }}
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
              onFocus={() => {
                if (Platform.OS === 'android') {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }
              }}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.submitButtonText}>
                {language === 'fr' ? 'Créer mon compte' : 'Create my account'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Toast pour les notifications */}
        <Toast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          onHide={hideToast}
        />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  menuButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.35)',
    backgroundColor: 'rgba(11,11,14,0.65)',
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 18,
    marginBottom: 24,
  },
  label: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.3)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: '800',
  },
});

