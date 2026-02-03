import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import BackgroundVideo from '../components/BackgroundVideo';
import Logo from '../components/Logo';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

export default function LoginPage() {
  const { language, t } = useLanguage();
  const { user, login, register } = useAuth();
  const { navigate, routeParams } = useNavigation();
  const { toast, showError, showSuccess, hideToast } = useToast();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState(routeParams?.mode === 'register' ? 'register' : 'login'); // 'login'|'register'

  const nextScreen = routeParams?.nextScreen || null;

  // ✅ Si déjà connecté, rediriger (mais PAS pendant le render)
  useEffect(() => {
    if (user?.isAuthenticated) {
      navigate(nextScreen || 'welcome');
    }
  }, [user?.isAuthenticated, navigate, nextScreen]);

  if (user?.isAuthenticated) return null;

  const handleLogin = async () => {
    if (loading) return;
    if (!email || !password) {
      showError(language === 'fr' ? 'Merci de remplir email/pseudo et mot de passe.' : 'Please fill in email/username and password.');
      return;
    }

    setLoading(true);
    const result = await login({ email, password });
    setLoading(false);

    if (result.success) {
      setEmail('');
      setPassword('');
      showSuccess(language === 'fr' ? 'Connexion réussie !' : 'Login successful!');
      setTimeout(() => navigate(nextScreen || 'welcome'), 300);
    } else {
      showError(result.error ?? (language === 'fr' ? 'Erreur de connexion.' : 'Login error.'));
    }
  };

  const handleRegister = async () => {
    if (loading) return;
    if (!email || !username || !password || !confirmPassword) {
      showError(language === 'fr' ? 'Merci de remplir tous les champs.' : 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      showError(language === 'fr' ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      showError(language === 'fr' ? 'Mot de passe trop court (min 6).' : 'Password too short (min 6).');
      return;
    }

    setLoading(true);
    const result = await register({ email, username, password });
    setLoading(false);

    if (result.success) {
      showSuccess(language === 'fr' ? 'Compte créé !' : 'Account created!');
      setEmail('');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate(nextScreen || 'welcome'), 300);
    } else {
      showError(result.error ?? (language === 'fr' ? "Erreur d'inscription." : 'Registration error.'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundVideo />
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.header}>
            <Logo size={90} />
            <Text style={styles.title}>
              {mode === 'register'
                ? (language === 'fr' ? 'Inscription' : 'Sign up')
                : (language === 'fr' ? 'Connexion' : 'Login')}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'register'
                ? (language === 'fr' ? 'Crée ton compte' : 'Create your account')
                : (language === 'fr' ? 'Accède à ton compte' : 'Access your account')}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modePill, mode === 'login' && styles.modePillActive]}
                onPress={() => setMode('login')}
                disabled={loading}
              >
                <Text style={[styles.modePillText, mode === 'login' && styles.modePillTextActive]}>
                  {language === 'fr' ? 'Connexion' : 'Login'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modePill, mode === 'register' && styles.modePillActive]}
                onPress={() => setMode('register')}
                disabled={loading}
              >
                <Text style={[styles.modePillText, mode === 'register' && styles.modePillTextActive]}>
                  {language === 'fr' ? 'Inscription' : 'Sign up'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{language === 'fr' ? 'Email' : 'Email'}</Text>
            <TextInput
              style={styles.input}
              placeholder={language === 'fr' ? 'ton.email@example.com' : 'your.email@example.com'}
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />

            {mode === 'register' ? (
              <>
                <Text style={styles.label}>{language === 'fr' ? 'Pseudo' : 'Username'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'ton.pseudo' : 'your username'}
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={setUsername}
                />
              </>
            ) : null}

            <Text style={styles.label}>{t('password')}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder={language === 'fr' ? 'Mot de passe' : 'Password'}
                placeholderTextColor="rgba(255,255,255,0.45)"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>

            {mode === 'register' ? (
              <>
                <Text style={styles.label}>{language === 'fr' ? 'Confirmer le mot de passe' : 'Confirm password'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'Confirmer' : 'Confirm'}
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#0b0b0e" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {language === 'fr' ? 'Créer mon compte' : 'Create account'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#0b0b0e" /> : <Text style={styles.primaryButtonText}>{t('loginButton')}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => navigate('accountType')}>
                  <Text style={styles.secondaryButtonText}>
                    {language === 'fr' ? 'Créer un compte' : 'Create an account'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  content: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 28,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 12,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 6,
  },
  form: {
    backgroundColor: 'rgba(11,11,14,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.25)',
    borderRadius: 18,
    padding: 18,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  modePill: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modePillActive: {
    borderColor: 'rgba(255,23,68,0.45)',
    backgroundColor: 'rgba(255,23,68,0.18)',
  },
  modePillText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '800',
  },
  modePillTextActive: {
    color: '#fff',
  },
  label: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 44,
  },
  passwordToggle: {
    position: 'absolute',
    right: 10,
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: '#FF1744',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#0b0b0e',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});

