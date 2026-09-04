import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { api } from '../../api/config';
import { NoxButton, NoxInput } from '../../components/nox';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import Colors from '../../constants/colors';
import GoogleSignInSection, { isGoogleOAuthConfigured } from '../../components/GoogleSignInSection';
import AppleSignInSection from '../../components/AppleSignInSection';
import * as AppleAuthentication from 'expo-apple-authentication';
import { styles } from './LoginPage.styles';
import { resolvePostAuthNavigation } from '../../utils/noxRoleNavigation';
import { resolveApiErrorMessage } from '../../constants/networkErrors';

export default function LoginPage() {
  const { language, t } = useLanguage();
  const { user, login, register, loginWithGoogle, loginWithApple } = useAuth();
  const { navigate, routeParams } = useNavigation();
  const { toast, showError, showSuccess, hideToast } = useToast();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState(routeParams?.mode === 'register' ? 'register' : 'login'); // 'login'|'register'
  const [resetVisible, setResetVisible] = useState(false);
  const [resetStep, setResetStep] = useState('email'); // 'email' | 'code'
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [acceptedCgu, setAcceptedCgu] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [certifiedMajor, setCertifiedMajor] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  const nextScreen = routeParams?.nextScreen || null;

  useEffect(() => {
    if (nextScreen) setMode('register');
    else if (routeParams?.mode === 'login') setMode('login');
  }, [nextScreen, routeParams?.mode]);

  const handleBirthDateChange = (value) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    if (cleaned.length > 4) formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
    setBirthDate(formatted.length > 10 ? formatted.slice(0, 10) : formatted);
  };

  // ✅ Si déjà connecté, rediriger (mais PAS pendant le render)
  useEffect(() => {
    if (user?.isAuthenticated) {
      const { screen, params } = resolvePostAuthNavigation(user, nextScreen);
      navigate(screen, params);
    }
  }, [user?.isAuthenticated, user?.activeProfileType, user?.emailVerified, navigate, nextScreen]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setAppleAuthAvailable(false);
      return;
    }
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAuthAvailable)
      .catch(() => setAppleAuthAvailable(false));
  }, []);

  if (user?.isAuthenticated) return null;

  const showAppleAuth = Platform.OS === 'ios' && appleAuthAvailable;
  const showGoogleAuth = isGoogleOAuthConfigured();
  const showSocialDivider = showAppleAuth || showGoogleAuth;

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
      setTimeout(() => {
        const { screen, params } = resolvePostAuthNavigation(result.user, nextScreen);
        navigate(screen, params);
      }, 300);
    } else {
      showError(result.error || (language === 'fr' ? 'Erreur de connexion.' : 'Login error.'));
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
    if (!acceptedCgu) {
      showError(language === 'fr'
        ? 'Vous devez accepter les CGU et la politique de confidentialité.'
        : 'You must accept the Terms of Use and Privacy Policy.');
      return;
    }
    if (!birthDate || birthDate.replace(/\//g, '').length !== 8) {
      showError(language === 'fr'
        ? 'Date de naissance requise (format jj/mm/aaaa).'
        : 'Birth date required (dd/mm/yyyy format).');
      return;
    }
    if (!certifiedMajor) {
      showError(language === 'fr'
        ? 'Vous devez certifier avoir 18 ans ou plus.'
        : 'You must certify that you are 18 or older.');
      return;
    }

    setLoading(true);
    const result = await register({ email, username, password, birthDate, certifiedMajor });
    setLoading(false);

    if (result.success) {
      showSuccess(language === 'fr' ? 'Compte créé !' : 'Account created!');
      setEmail('');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setBirthDate('');
      setCertifiedMajor(false);
      setAcceptedCgu(false);
      setTimeout(() => {
        const { screen, params } = resolvePostAuthNavigation(result.user, nextScreen);
        navigate(screen, params);
      }, 300);
    } else {
      showError(result.error || (language === 'fr' ? "Erreur d'inscription." : 'Registration error.'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigate(nextScreen ? 'accountType' : 'onboarding')}
              accessibilityRole="button"
              accessibilityLabel={language === 'fr' ? 'Retour' : 'Back'}
            >
              <Ionicons name="chevron-back" size={26} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'register'
                ? (language === 'fr' ? 'Rejoins le réseau' : 'Join the network')
                : (language === 'fr' ? 'Accède au réseau' : 'Access the network')}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'register'
                ? (language === 'fr' ? 'Crée ton compte NOX en quelques secondes' : 'Create your NOX account in seconds')
                : (language === 'fr' ? 'Connecte-toi pour retrouver ta scène' : 'Log in to get back to your scene')}
            </Text>
          </View>

          <View style={styles.form}>
            {showSocialDivider && mode === 'login' ? (
              <>
                {showAppleAuth ? (
                  <AppleSignInSection
                    language={language}
                    mode={mode}
                    birthDate={birthDate}
                    certifiedMajor={certifiedMajor}
                    acceptedCgu={acceptedCgu}
                    username={username}
                    loginWithApple={loginWithApple}
                    navigate={navigate}
                    nextScreen={nextScreen}
                    showSuccess={showSuccess}
                    showError={showError}
                    formBusy={loading}
                    isAvailable={appleAuthAvailable}
                  />
                ) : null}

                {showGoogleAuth ? (
                  <GoogleSignInSection
                    language={language}
                    mode={mode}
                    birthDate={birthDate}
                    certifiedMajor={certifiedMajor}
                    acceptedCgu={acceptedCgu}
                    username={username}
                    loginWithGoogle={loginWithGoogle}
                    navigate={navigate}
                    nextScreen={nextScreen}
                    showSuccess={showSuccess}
                    showError={showError}
                    formBusy={loading}
                    showTopDivider={false}
                  />
                ) : null}

                <View style={styles.socialDividerRow}>
                  <View style={styles.socialDividerLine} />
                  <Text style={styles.socialDividerText}>{language === 'fr' ? 'ou' : 'or'}</Text>
                  <View style={styles.socialDividerLine} />
                </View>
              </>
            ) : null}

            <NoxInput
              label={language === 'fr' ? 'Email' : 'Email'}
              placeholder={language === 'fr' ? 'ton.email@example.com' : 'your.email@example.com'}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              icon={<Ionicons name="mail-outline" size={20} color={Colors.textTertiary} />}
            />

            {mode === 'register' ? (
              <NoxInput
                label={language === 'fr' ? 'Pseudo' : 'Username'}
                placeholder={language === 'fr' ? 'ton.pseudo' : 'your username'}
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
                icon={<Ionicons name="person-outline" size={20} color={Colors.textTertiary} />}
              />
            ) : null}

            <NoxInput
              label={t('password')}
              placeholder={language === 'fr' ? 'Mot de passe' : 'Password'}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              icon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textTertiary} />}
              rightSlot={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword
                      ? (language === 'fr' ? 'Masquer le mot de passe' : 'Hide password')
                      : (language === 'fr' ? 'Afficher le mot de passe' : 'Show password')
                  }
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.textTertiary}
                  />
                </TouchableOpacity>
              }
            />

            {mode === 'register' ? (
              <>
                <NoxInput
                  label={language === 'fr' ? 'Confirmer le mot de passe' : 'Confirm password'}
                  placeholder={language === 'fr' ? 'Confirmer' : 'Confirm'}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  icon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textTertiary} />}
                />
                <NoxInput
                  label={language === 'fr' ? 'Date de naissance' : 'Birth date'}
                  placeholder={language === 'fr' ? 'jj/mm/aaaa' : 'dd/mm/yyyy'}
                  keyboardType="number-pad"
                  value={birthDate}
                  onChangeText={handleBirthDateChange}
                  maxLength={10}
                  icon={<Ionicons name="calendar-outline" size={20} color={Colors.textTertiary} />}
                />
                <View style={styles.cguRow}>
                  <TouchableOpacity
                    style={[styles.checkbox, certifiedMajor && styles.checkboxChecked]}
                    onPress={() => setCertifiedMajor(!certifiedMajor)}
                    activeOpacity={0.7}
                  >
                    {certifiedMajor && <Ionicons name="checkmark" size={14} color={Colors.background} />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cguTextWrap} onPress={() => setCertifiedMajor(!certifiedMajor)} activeOpacity={0.7}>
                    <Text style={styles.cguText}>
                      {language === 'fr' ? 'Je certifie avoir 18 ans ou plus' : 'I certify that I am 18 or older'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.cguRow}>
                  <TouchableOpacity
                    style={[styles.checkbox, acceptedCgu && styles.checkboxChecked]}
                    onPress={() => setAcceptedCgu(!acceptedCgu)}
                    activeOpacity={0.7}
                  >
                    {acceptedCgu && <Ionicons name="checkmark" size={14} color={Colors.background} />}
                  </TouchableOpacity>
                  <View style={styles.cguTextWrap}>
                    <Text style={styles.cguText}>
                      {language === 'fr' ? "J'accepte les " : 'I accept the '}
                    </Text>
                    <TouchableOpacity onPress={() => navigate('legal', { type: 'cgu' })}>
                      <Text style={styles.cguLink}>{language === 'fr' ? 'CGU' : 'Terms of Use'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.cguText}>
                      {language === 'fr' ? ' et la ' : ' and '}
                    </Text>
                    <TouchableOpacity onPress={() => navigate('legal', { type: 'privacy' })}>
                      <Text style={styles.cguLink}>
                        {language === 'fr' ? 'politique de confidentialité' : 'Privacy Policy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <NoxButton
                  label={language === 'fr' ? 'Créer mon compte' : 'Create account'}
                  onPress={handleRegister}
                  loading={loading}
                  disabled={loading}
                  style={styles.noxButtonSpacing}
                />
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.forgotLink}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'fr' ? 'Mot de passe oublié' : 'Forgot password'}
                  onPress={() => {
                    setResetEmail(email || '');
                    setResetCode('');
                    setResetPassword('');
                    setResetConfirm('');
                    setResetStep('email');
                    setResetVisible(true);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.forgotLinkText}>
                    {language === 'fr' ? 'Mot de passe oublié ?' : 'Forgot password?'}
                  </Text>
                </TouchableOpacity>
                <NoxButton
                  label={t('loginButton')}
                  onPress={handleLogin}
                  loading={loading}
                  disabled={loading}
                  style={styles.noxButtonSpacing}
                />
              </>
            )}

            {!nextScreen ? (
              <View style={styles.modeSwitchRow}>
                <Text style={styles.modeSwitchText}>
                  {mode === 'register'
                    ? (language === 'fr' ? 'Déjà un compte ?' : 'Already have an account?')
                    : (language === 'fr' ? 'Pas encore de compte ?' : 'No account yet?')}
                </Text>
                <TouchableOpacity
                  onPress={() => setMode(mode === 'register' ? 'login' : 'register')}
                  disabled={loading}
                >
                  <Text style={styles.modeSwitchLink}>
                    {mode === 'register'
                      ? (language === 'fr' ? 'Se connecter' : 'Log in')
                      : (language === 'fr' ? 'Créer un compte' : 'Sign up')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
        duration={toast.type === 'error' ? 5000 : 3000}
      />

      <Modal visible={resetVisible} transparent animationType="fade" onRequestClose={() => setResetVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'fr' ? 'Réinitialiser le mot de passe' : 'Reset password'}
              </Text>
              <TouchableOpacity onPress={() => setResetVisible(false)}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>

            {resetStep === 'email' ? (
              <>
                <Text style={styles.modalLabel}>{language === 'fr' ? 'Email' : 'Email'}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="ton.email@example.com"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                />

                <TouchableOpacity
                  style={[styles.modalPrimaryButton, resetLoading && styles.primaryButtonDisabled]}
                  onPress={async () => {
                    if (resetLoading) return;
                    if (!resetEmail || !resetEmail.includes('@')) {
                      showError(language === 'fr' ? 'Email invalide.' : 'Invalid email.');
                      return;
                    }
                    setResetLoading(true);
                    try {
                      const res = await api.forgotPassword(resetEmail);
                      if (res?.success) {
                        showSuccess(language === 'fr' ? 'Si un compte existe, le code a été envoyé.' : 'If an account exists, the code was sent.');
                        setResetStep('code');
                      } else {
                        showError(resolveApiErrorMessage(res, language));
                      }
                    } catch (e) {
                      showError(resolveApiErrorMessage(e, language));
                    } finally {
                      setResetLoading(false);
                    }
                  }}
                  disabled={resetLoading}
                >
                  <Text style={styles.modalPrimaryButtonText}>
                    {resetLoading ? '...' : (language === 'fr' ? 'Envoyer le code' : 'Send code')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalLabel}>{language === 'fr' ? 'Code (6 chiffres)' : 'Code (6 digits)'}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="123456"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  keyboardType="number-pad"
                  value={resetCode}
                  onChangeText={setResetCode}
                  maxLength={6}
                />

                <Text style={styles.modalLabel}>{language === 'fr' ? 'Nouveau mot de passe' : 'New password'}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={language === 'fr' ? 'Nouveau mot de passe' : 'New password'}
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  secureTextEntry
                  value={resetPassword}
                  onChangeText={setResetPassword}
                />

                <Text style={styles.modalLabel}>{language === 'fr' ? 'Confirmer' : 'Confirm'}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={language === 'fr' ? 'Confirmer' : 'Confirm'}
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  secureTextEntry
                  value={resetConfirm}
                  onChangeText={setResetConfirm}
                />

                <TouchableOpacity
                  style={[styles.modalPrimaryButton, resetLoading && styles.primaryButtonDisabled]}
                  onPress={async () => {
                    if (resetLoading) return;
                    if (!resetCode || resetCode.trim().length !== 6) {
                      showError(language === 'fr' ? 'Code invalide.' : 'Invalid code.');
                      return;
                    }
                    if (!resetPassword || resetPassword.length < 6) {
                      showError(language === 'fr' ? 'Mot de passe trop court (min 6).' : 'Password too short (min 6).');
                      return;
                    }
                    if (resetPassword !== resetConfirm) {
                      showError(language === 'fr' ? 'La confirmation ne correspond pas.' : 'Confirmation does not match.');
                      return;
                    }
                    setResetLoading(true);
                    try {
                      const res = await api.resetPassword({
                        email: resetEmail,
                        code: resetCode,
                        newPassword: resetPassword,
                        confirmPassword: resetConfirm,
                      });
                      if (res?.success) {
                        showSuccess(language === 'fr' ? 'Mot de passe réinitialisé.' : 'Password reset.');
                        setResetVisible(false);
                      } else {
                        showError(resolveApiErrorMessage(res, language));
                      }
                    } catch (e) {
                      showError(resolveApiErrorMessage(e, language));
                    } finally {
                      setResetLoading(false);
                    }
                  }}
                  disabled={resetLoading}
                >
                  <Text style={styles.modalPrimaryButtonText}>
                    {resetLoading ? '...' : (language === 'fr' ? 'Valider' : 'Confirm')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalBackLink}
                  onPress={() => setResetStep('email')}
                  disabled={resetLoading}
                >
                  <Text style={styles.modalBackLinkText}>
                    {language === 'fr' ? 'Renvoyer un code' : 'Send again'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


