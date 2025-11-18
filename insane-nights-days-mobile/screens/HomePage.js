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
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';

export default function HomePage() {
  const { language, changeLanguage, t } = useLanguage();
  const { user, login, register } = useAuth();
  const { navigate } = useNavigation();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' ou 'register'
  
  // État pour le formulaire de connexion
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // État pour le formulaire d'inscription
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const handleLogin = async () => {
    if (loginLoading) return;

    if (!loginEmail || !loginPassword) {
      Alert.alert(
        language === 'fr' ? 'Champs manquants' : 'Missing fields',
        language === 'fr' ? 'Merci de remplir email/pseudo et mot de passe.' : 'Please fill in email/username and password.',
      );
      return;
    }

    setLoginLoading(true);
    const result = await login({ email: loginEmail, password: loginPassword });
    setLoginLoading(false);

    if (result.success) {
      setLoginEmail('');
      setLoginPassword('');
      navigate('welcome');
    } else {
      Alert.alert(
        language === 'fr' ? 'Erreur de connexion' : 'Login error',
        result.error ?? (language === 'fr' ? 'Erreur de connexion.' : 'Login error.'),
      );
    }
  };

  const handleRegister = async () => {
    if (registerLoading) return;

    // Permettre d'utiliser soit email soit pseudo (ou les deux)
    if ((!registerEmail && !registerUsername) || !registerPassword) {
      Alert.alert(
        language === 'fr' ? 'Champs manquants' : 'Missing fields',
        language === 'fr' ? 'Merci de remplir au moins un pseudo ou un email, et un mot de passe.' : 'Please fill in at least a username or email, and a password.',
      );
      return;
    }

    if (registerPassword.length < 6) {
      Alert.alert(
        language === 'fr' ? 'Mot de passe trop court' : 'Password too short',
        language === 'fr' ? 'Le mot de passe doit contenir au moins 6 caractères.' : 'Password must be at least 6 characters.',
      );
      return;
    }

    setRegisterLoading(true);
    const result = await register({ 
      email: registerEmail || undefined, 
      username: registerUsername || undefined, 
      password: registerPassword 
    });
    setRegisterLoading(false);

    if (result.success) {
      setRegisterEmail('');
      setRegisterUsername('');
      setRegisterPassword('');

      Alert.alert(
        language === 'fr' ? 'Inscription réussie' : 'Registration successful',
        language === 'fr' ? 'Compte créé avec succès !' : 'Account created successfully!',
        [
          {
            text: language === 'fr' ? 'Continuer' : 'Continue',
            onPress: () => {
              // Navigue vers la page de choix de type de compte
              navigate('accountType');
            },
          },
        ],
      );
    } else {
      Alert.alert(
        language === 'fr' ? "Erreur d'inscription" : 'Registration error',
        result.error ?? (language === 'fr' ? "Erreur d'inscription." : 'Registration error.'),
      );
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
              <Text style={[styles.modeButtonText, mode === 'login' && styles.modeButtonTextActive]}>
                {t('login')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'register' && styles.modeButtonActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.modeButtonText, mode === 'register' && styles.modeButtonTextActive]}>
                {t('register')}
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'login' ? (
            <>
              {/* Formulaire de connexion */}
              <View style={styles.form}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Email ou Pseudo' : 'Email or Username'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'ton.email@example.com ou ton.pseudo' : 'your.email@example.com or your.username'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  autoCapitalize="none"
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
            </>
          ) : (
            <>
              {/* Formulaire d'inscription */}
              <Text style={styles.mainTitle}>{t('createAccount')}</Text>
              
              <View style={styles.form}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Pseudo (requis)' : 'Username (required)'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'Ton pseudo' : 'Your username'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  autoCapitalize="words"
                  value={registerUsername}
                  onChangeText={setRegisterUsername}
                />

                <Text style={styles.label}>
                  {language === 'fr' ? 'Email (optionnel)' : 'Email (optional)'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'ton.email@example.com (optionnel)' : 'your.email@example.com (optional)'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={registerEmail}
                  onChangeText={setRegisterEmail}
                />

                <Text style={styles.label}>{t('password')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'Choisis un mot de passe' : 'Choose a password'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  secureTextEntry
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                />
              </View>

              <TouchableOpacity
                style={[styles.registerButton, registerLoading && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={registerLoading}
              >
                {registerLoading ? (
                  <ActivityIndicator color="#0b0b0e" />
                ) : (
                  <Text style={styles.registerButtonText}>
                    {language === 'fr' ? 'Créer mon compte' : 'Create account'}
                  </Text>
                )}
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
  mainTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
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
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '800',
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
