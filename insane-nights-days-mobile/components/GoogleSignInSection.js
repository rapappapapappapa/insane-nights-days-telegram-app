import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Colors from '../constants/colors';

WebBrowser.maybeCompleteAuthSession();

/** True si le CLIENT_ID requis pour la plateforme courante est défini (`.env` / EAS). */
export function isGoogleOAuthConfigured() {
  const iosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const androidId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
  const webId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (Platform.OS === 'ios') return !!iosId;
  if (Platform.OS === 'android') return !!androidId;
  return !!webId;
}

/**
 * Connexion / inscription Google (id_token → backend).
 * En mode inscription : exiger date de naissance + cases (comme le formulaire classique).
 */
export default function GoogleSignInSection({
  language,
  mode,
  birthDate,
  certifiedMajor,
  acceptedCgu,
  username,
  loginWithGoogle,
  navigate,
  nextScreen,
  showSuccess,
  showError,
  formBusy,
}) {
  const iosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const androidId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
  const webId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

  const config = {};
  if (iosId) config.iosClientId = iosId;
  if (androidId) config.androidClientId = androidId;
  if (webId) config.webClientId = webId;

  const [, response, promptAsync] = Google.useIdTokenAuthRequest(config);

  const [googleBusy, setGoogleBusy] = useState(false);
  const handledResponseKey = useRef(null);

  useEffect(() => {
    if (!response) return;

    const key =
      response.type === 'success' && response.params?.id_token
        ? response.params.id_token
        : response.type === 'error'
          ? `err_${response.error?.message || 'e'}`
          : null;

    if (response.type === 'cancel' || response.type === 'dismiss') {
      return;
    }

    if (response.type === 'error') {
      showError(response.error?.message || (language === 'fr' ? 'Connexion Google annulée.' : 'Google sign-in cancelled.'));
      handledResponseKey.current = null;
      return;
    }

    if (response.type !== 'success' || !key) return;

    const idToken = response.params?.id_token;
    if (!idToken) {
      console.warn('[GoogleSignInSection] Succès OAuth sans id_token', response.params);
      showError(language === 'fr' ? 'Réponse Google incomplète. Réessaie.' : 'Incomplete Google response. Try again.');
      return;
    }

    if (handledResponseKey.current === key) return;
    handledResponseKey.current = key;

    (async () => {
      if (mode === 'register') {
        if (!birthDate || birthDate.replace(/\//g, '').length !== 8) {
          showError(language === 'fr'
            ? 'Pour t’inscrire avec Google, renseigne d’abord ta date de naissance (jj/mm/aaaa).'
            : 'To sign up with Google, fill in your birth date (dd/mm/yyyy) first.');
          handledResponseKey.current = null;
          return;
        }
        if (!certifiedMajor) {
          showError(language === 'fr'
            ? 'Coche « Je certifie avoir 18 ans ou plus » avant de continuer avec Google.'
            : 'Check « I certify I am 18 or older » before continuing with Google.');
          handledResponseKey.current = null;
          return;
        }
        if (!acceptedCgu) {
          showError(language === 'fr'
            ? 'Accepte les CGU avant de continuer avec Google.'
            : 'Accept the Terms before continuing with Google.');
          handledResponseKey.current = null;
          return;
        }
      }

      setGoogleBusy(true);
      try {
        const payload =
          mode === 'register'
            ? {
                idToken,
                birthDate,
                certifiedMajor: !!certifiedMajor,
                acceptedCgu: !!acceptedCgu,
                ...(username.trim() ? { username: username.trim() } : {}),
              }
            : { idToken };

        const result = await loginWithGoogle(payload);

        if (result.success) {
          showSuccess(language === 'fr' ? 'Connexion réussie !' : 'Logged in!');
          setTimeout(() => navigate(nextScreen || 'welcome'), 300);
        } else {
          showError(result.error || (language === 'fr' ? 'Erreur Google.' : 'Google error.'));
          handledResponseKey.current = null;
        }
      } catch (e) {
        showError(e?.message || (language === 'fr' ? 'Erreur Google.' : 'Google error.'));
        handledResponseKey.current = null;
      } finally {
        setGoogleBusy(false);
      }
    })();
  }, [
    response,
    mode,
    birthDate,
    certifiedMajor,
    acceptedCgu,
    username,
    loginWithGoogle,
    navigate,
    nextScreen,
    showSuccess,
    showError,
    language,
  ]);

  const busy = googleBusy || formBusy;
  const label =
    mode === 'register'
      ? language === 'fr'
        ? "S'inscrire avec Google"
        : 'Sign up with Google'
      : language === 'fr'
        ? 'Continuer avec Google'
        : 'Continue with Google';

  return (
    <>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{language === 'fr' ? 'ou' : 'or'}</Text>
        <View style={styles.dividerLine} />
      </View>
      <TouchableOpacity
        style={[styles.googleBtn, busy && styles.googleBtnDisabled]}
        onPress={async () => {
          if (busy) return;
          try {
            await promptAsync({ showInRecents: true });
          } catch (e) {
            showError(e?.message || (language === 'fr' ? 'Impossible d’ouvrir Google.' : 'Could not open Google.'));
          }
        }}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {googleBusy ? (
          <ActivityIndicator color="#1a1a1f" />
        ) : (
          <Text style={styles.googleBtnText}>{label}</Text>
        )}
      </TouchableOpacity>
      {mode === 'register' ? (
        <Text style={styles.googleHint}>
          {language === 'fr'
            ? 'Même inscription qu’avec l’email : date de naissance, majorité confirmée et acceptation des CGU.'
            : 'Same requirements as email sign-up: birth date, 18+ certification, and terms acceptance.'}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(26,26,31,0.08)',
  },
  googleBtnDisabled: {
    opacity: 0.65,
  },
  googleBtnText: {
    color: '#1a1a1f',
    fontSize: 15,
    fontWeight: '800',
  },
  googleHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
    textAlign: 'center',
  },
});
