import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import { NoxText, NoxButton } from '../../components/nox';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import Colors from '../../constants/colors';
import { Spacing } from '../../constants/theme';
import { getPostAuthScreen, skipEmailVerificationForSession } from '../../utils/noxRoleNavigation';
import { styles } from './AuthVerifyEmailPage.styles';

export default function AuthVerifyEmailPage() {
  const { language } = useLanguage();
  const { navigate, routeParams } = useNavigation();
  const { user, refreshCurrentUser, logout } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const fr = language === 'fr';

  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [debugCode, setDebugCode] = useState(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const sentOnce = useRef(false);

  const nextScreen = routeParams?.nextScreen || null;

  const finish = () => {
    navigate(getPostAuthScreen(user?.activeProfileType, nextScreen));
  };

  const skipForNow = () => {
    skipEmailVerificationForSession();
    finish();
  };

  const logoutWrongEmail = async () => {
    await logout();
    navigate('login');
  };

  const submitNewEmail = async () => {
    const email = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      showError(fr ? 'Entre une adresse email valide.' : 'Enter a valid email address.');
      return;
    }
    setChangingEmail(true);
    try {
      const res = await api.changeUnverifiedEmail(user.token, email);
      if (res?.success) {
        await refreshCurrentUser();
        setEditingEmail(false);
        setNewEmail('');
        setCode('');
        showSuccess(fr ? 'Email mis à jour — nouveau code envoyé.' : 'Email updated — new code sent.');
        await sendCode();
      } else {
        showError(res?.message || (fr ? 'Modification impossible.' : 'Could not update email.'));
      }
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur.' : 'Error.'));
    } finally {
      setChangingEmail(false);
    }
  };

  useEffect(() => {
    if (user?.emailVerified) {
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.emailVerified]);

  const sendCode = async () => {
    if (!user?.token || sending) return;
    setSending(true);
    try {
      const res = await api.sendEmailVerificationCode(user.token);
      if (res?.success) {
        showSuccess(fr ? 'Code envoyé par email.' : 'Code sent by email.');
        if (res.debugCode) setDebugCode(String(res.debugCode));
      } else {
        showError(res?.message || (fr ? 'Envoi impossible.' : 'Could not send code.'));
      }
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur réseau.' : 'Network error.'));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!user?.token || user?.emailVerified || sentOnce.current) return;
    sentOnce.current = true;
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, user?.emailVerified]);

  const handleConfirm = async () => {
    if (!user?.token || confirming) return;
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      showError(fr ? 'Entre un code à 6 chiffres.' : 'Enter a 6-digit code.');
      return;
    }
    setConfirming(true);
    try {
      const res = await api.confirmEmailVerificationCode(user.token, trimmed);
      if (res?.success) {
        await refreshCurrentUser();
        showSuccess(fr ? 'Email vérifié !' : 'Email verified!');
        setTimeout(finish, 400);
      } else {
        showError(res?.message || (fr ? 'Code incorrect.' : 'Invalid code.'));
      }
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur.' : 'Error.'));
    } finally {
      setConfirming(false);
    }
  };

  if (!user?.isAuthenticated) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <NoxText variant="titleSecondary" style={styles.title}>
            {fr ? 'Vérifie ton email' : 'Verify your email'}
          </NoxText>
          <NoxText variant="secondary" style={styles.subtitle}>
            {fr
              ? `Nous avons envoyé un code à 6 chiffres à ${user.email || 'ton adresse'}.`
              : `We sent a 6-digit code to ${user.email || 'your address'}.`}
          </NoxText>

          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={Colors.textTertiary}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />

          {debugCode ? (
            <NoxText variant="secondary" style={styles.debug}>
              {fr ? 'Code dev (email non envoyé) :' : 'Dev code (email not sent):'} {debugCode}
            </NoxText>
          ) : null}

          <NoxButton
            label={fr ? 'Valider' : 'Confirm'}
            onPress={handleConfirm}
            loading={confirming}
            style={{ marginTop: Spacing.xl }}
          />

          <NoxButton
            label={fr ? 'Renvoyer le code' : 'Resend code'}
            variant="ghost"
            onPress={sendCode}
            loading={sending}
            style={{ marginTop: Spacing.md }}
          />

          <NoxButton
            label={fr ? 'Continuer sans valider' : 'Continue without verifying'}
            variant="secondary"
            onPress={skipForNow}
            style={{ marginTop: Spacing.md }}
          />
          <NoxText variant="secondary" style={styles.skipHint}>
            {fr
              ? 'Ton compte restera « non vérifié » — tu pourras valider plus tard depuis ton profil.'
              : 'Your account will stay unverified — you can verify later from your profile.'}
          </NoxText>

          {editingEmail ? (
            <View style={styles.emailEditBlock}>
              <TextInput
                style={styles.emailInput}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder={fr ? 'Nouvelle adresse email' : 'New email address'}
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
              />
              <NoxButton
                label={fr ? 'Mettre à jour et renvoyer un code' : 'Update and resend code'}
                onPress={submitNewEmail}
                loading={changingEmail}
                style={{ marginTop: Spacing.sm }}
              />
              <NoxButton
                label={fr ? 'Annuler' : 'Cancel'}
                variant="ghost"
                onPress={() => setEditingEmail(false)}
                style={{ marginTop: Spacing.sm }}
              />
            </View>
          ) : (
            <NoxButton
              label={fr ? 'Mauvais email ? Le corriger' : 'Wrong email? Fix it'}
              variant="ghost"
              onPress={() => setEditingEmail(true)}
              style={{ marginTop: Spacing.lg }}
            />
          )}

          <NoxButton
            label={fr ? 'Se déconnecter' : 'Log out'}
            variant="ghost"
            onPress={logoutWrongEmail}
            style={{ marginTop: Spacing.sm }}
          />

          {user?.emailVerified ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
        duration={toast.type === 'error' ? 5000 : 3000}
      />
    </SafeAreaView>
  );
}
