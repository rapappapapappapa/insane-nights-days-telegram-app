import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../api/config';

const accountTypes = [
  {
    id: 'community',
    emoji: '👥',
    titleFr: 'Communauté',
    titleEn: 'Community',
    descriptionFr: 'Rejoignez la communauté',
    descriptionEn: 'Join the community',
  },
  {
    id: 'dj',
    emoji: '🎧',
    titleFr: 'DJ',
    titleEn: 'DJ',
    descriptionFr: 'Créez votre profil DJ',
    descriptionEn: 'Create your DJ profile',
  },
  {
    id: 'booker',
    emoji: '📅',
    titleFr: 'Booker',
    titleEn: 'Booker',
    descriptionFr: 'Gérez vos événements',
    descriptionEn: 'Manage your events',
  },
  {
    id: 'venue',
    emoji: '🏢',
    titleFr: 'Lieu',
    titleEn: 'Venue',
    descriptionFr: 'Ajoutez votre lieu',
    descriptionEn: 'Add your venue',
  },
];

export default function HomePage({ onNavigate, onAuthSuccess }) {
  const { language, changeLanguage, t } = useLanguage();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' ou 'register'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleAccountTypeSelect = (type) => {
    // Pour l'instant, on navigue vers register avec le type en paramètre
    // Plus tard, on créera des pages spécifiques : registerCommunity, registerDj, etc.
    onNavigate('register', { accountType: type });
  };

  const handleLogin = async () => {
    if (loginLoading) {
      return;
    }

    if (!loginEmail || !loginPassword) {
      Alert.alert(
        language === 'fr' ? 'Champs manquants' : 'Missing fields',
        language === 'fr' ? 'Merci de remplir email et mot de passe.' : 'Please fill in email and password.',
      );
      return;
    }

    setLoginLoading(true);
    try {
      const response = await api.login({ email: loginEmail, password: loginPassword });
      if (!response?.success) {
        throw new Error(
          response?.message ?? (language === 'fr' ? 'Erreur de connexion.' : 'Login error.'),
        );
      }

      onAuthSuccess?.({ user: response.user, token: response.token });
      setLoginEmail('');
      setLoginPassword('');

      Alert.alert(
        language === 'fr' ? 'Connexion réussie' : 'Login successful',
        language === 'fr' ? 'Bienvenue sur Insane Nights & Days !' : 'Welcome to Insane Nights & Days!',
        [
          {
            text: language === 'fr' ? 'Continuer' : 'Continue',
            onPress: () => onNavigate?.('menu'),
          },
        ],
      );
    } catch (error) {
      const errorMessage =
        error?.message ?? (language === 'fr' ? 'Erreur de connexion.' : 'Login error.');
      Alert.alert(
        language === 'fr' ? 'Erreur de connexion' : 'Login error',
        errorMessage,
      );
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header avec Logo centré et Langue */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>I</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setShowLanguageModal(true)}
        >
          <Text style={styles.languageButtonText}>
            {language === 'fr' ? 'FR' : 'EN'} ▼
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.scrollView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Switch Connexion/Inscription */}
          <View style={styles.modeSwitch}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}
              onPress={() => setMode('login')}
            >
              <Text
                style={[styles.modeButtonText, mode === 'login' && styles.modeButtonTextActive]}
              >
                {t('login')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'register' && styles.modeButtonActive]}
              onPress={() => setMode('register')}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'register' && styles.modeButtonTextActive,
                ]}
              >
                {t('register')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Formulaire selon le mode */}
          {mode === 'login' ? (
            <>
              {/* Formulaire de connexion */}
              <View style={styles.form}>
                <Text style={styles.label}>{t('email')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'ton.email@example.com' : 'your.email@example.com'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                />

                <Text style={styles.label}>{t('password')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'Mot de passe' : 'Password'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  secureTextEntry
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                />
              </View>

              <TouchableOpacity
                style={[styles.loginButton, loginLoading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <ActivityIndicator color="#0b0b0e" />
                ) : (
                  <Text style={styles.loginButtonText}>{t('loginButton')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.forgotPasswordButton}>
                <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Formulaire d'inscription */}
              <Text style={styles.mainTitle}>{t('createAccount')}</Text>
              
              <View style={styles.form}>
                <Text style={styles.label}>{t('email')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'ton.email@example.com' : 'your.email@example.com'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />

                <Text style={styles.label}>{t('password')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'Choisis un mot de passe' : 'Choose a password'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.registerButton}
                onPress={() => {
                  // Plus tard, on naviguera vers la page de choix de type de compte
                  // Pour l'instant, on navigue vers register
                  onNavigate('register');
                }}
              >
                <Text style={styles.registerButtonText}>
                  {language === 'fr' ? 'Continuer' : 'Continue'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* CGU et CGV */}
          <View style={styles.legalContainer}>
            <TouchableOpacity style={styles.legalLink}>
              <Text style={styles.legalText}>{t('cgu')}</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}> • </Text>
            <TouchableOpacity style={styles.legalLink}>
              <Text style={styles.legalText}>{t('cgv')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de sélection de langue */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('language')}</Text>
            <TouchableOpacity
              style={[styles.modalOption, language === 'fr' && styles.modalOptionSelected]}
              onPress={() => {
                changeLanguage('fr');
                setShowLanguageModal(false);
              }}
            >
              <Text style={[styles.modalOptionText, language === 'fr' && styles.modalOptionTextSelected]}>
                Français
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalOption, language === 'en' && styles.modalOptionSelected]}
              onPress={() => {
                changeLanguage('en');
                setShowLanguageModal(false);
              }}
            >
              <Text style={[styles.modalOptionText, language === 'en' && styles.modalOptionTextSelected]}>
                English
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    backgroundColor: '#ff7a1a',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#0b0b0e',
    fontSize: 56,
    fontWeight: '900',
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.5)',
  },
  languageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexGrow: 1,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1f',
    borderRadius: 12,
    padding: 4,
    marginTop: 20,
    marginBottom: 30,
    width: '100%',
    maxWidth: 300,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#ff7a1a',
  },
  modeButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#0b0b0e',
    fontWeight: '700',
  },
  form: {
    width: '100%',
    maxWidth: 400,
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
  loginButton: {
    backgroundColor: '#ff7a1a',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    marginBottom: 16,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '800',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  registerButton: {
    backgroundColor: '#ff7a1a',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    marginTop: 8,
  },
  registerButtonText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '800',
  },
  mainTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
  },
  accountCard: {
    width: '48%',
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.35)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 160,
  },
  cardEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  legalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  legalLink: {
    paddingVertical: 8,
  },
  legalText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginHorizontal: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1f',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.35)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#0b0b0e',
  },
  modalOptionSelected: {
    backgroundColor: '#ff7a1a',
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  modalOptionTextSelected: {
    color: '#0b0b0e',
    fontWeight: '700',
  },
});
