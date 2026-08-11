import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { resolvePostAuthNavigation } from '../utils/noxRoleNavigation';

/**
 * Connexion / inscription Apple (identityToken → backend).
 * iOS uniquement ; `isAvailable` doit être fourni (ex. `AppleAuthentication.isAvailableAsync()`).
 */
export default function AppleSignInSection({
  language,
  mode,
  birthDate,
  certifiedMajor,
  acceptedCgu,
  username,
  loginWithApple,
  navigate,
  nextScreen,
  showSuccess,
  showError,
  formBusy,
  isAvailable,
}) {
  const [appleBusy, setAppleBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    busyRef.current = appleBusy || formBusy;
  }, [appleBusy, formBusy]);

  if (Platform.OS !== 'ios' || !isAvailable) {
    return null;
  }

  const busy = appleBusy || formBusy;
  const buttonType =
    mode === 'register'
      ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
      : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN;

  const runSignIn = async () => {
    if (busyRef.current) return;

    if (mode === 'register') {
      if (!birthDate || birthDate.replace(/\//g, '').length !== 8) {
        showError(
          language === 'fr'
            ? 'Pour t’inscrire avec Apple, renseigne d’abord ta date de naissance (jj/mm/aaaa).'
            : 'To sign up with Apple, fill in your birth date (dd/mm/yyyy) first.'
        );
        return;
      }
      if (!certifiedMajor) {
        showError(
          language === 'fr'
            ? 'Coche « Je certifie avoir 18 ans ou plus » avant de continuer avec Apple.'
            : 'Check « I certify I am 18 or older » before continuing with Apple.'
        );
        return;
      }
      if (!acceptedCgu) {
        showError(
          language === 'fr'
            ? 'Accepte les CGU avant de continuer avec Apple.'
            : 'Accept the Terms before continuing with Apple.'
        );
        return;
      }
    }

    try {
      setAppleBusy(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const identityToken = credential.identityToken;
      if (!identityToken) {
        showError(
          language === 'fr'
            ? 'Réponse Apple incomplète (pas de jeton). Réessaie.'
            : 'Incomplete Apple response (no token). Try again.'
        );
        setAppleBusy(false);
        return;
      }

      const payload =
        mode === 'register'
          ? {
              identityToken,
              birthDate,
              certifiedMajor: !!certifiedMajor,
              acceptedCgu: !!acceptedCgu,
              ...(username.trim() ? { username: username.trim() } : {}),
            }
          : { identityToken };

      const result = await loginWithApple(payload);

      if (result.success) {
        showSuccess(language === 'fr' ? 'Connexion réussie !' : 'Logged in!');
        setTimeout(() => {
          const { screen, params } = resolvePostAuthNavigation(result.user, nextScreen);
          navigate(screen, params);
        }, 300);
      } else {
        showError(result.error || (language === 'fr' ? 'Erreur Apple.' : 'Apple error.'));
      }
    } catch (e) {
      if (e?.code === 'ERR_REQUEST_CANCELED' || e?.code === 'ERR_CANCELED') {
        // utilisateur a fermé la feuille — silence
      } else {
        showError(
          e?.message || (language === 'fr' ? 'Connexion Apple impossible.' : 'Apple sign-in failed.')
        );
      }
    } finally {
      setAppleBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {appleBusy ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={buttonType}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={14}
          style={styles.appleBtn}
          onPress={() => runSignIn()}
        />
      )}
      {mode === 'register' ? (
        <Text style={styles.appleHint}>
          {language === 'fr'
            ? 'Même inscription qu’avec l’email : date de naissance, majorité et CGU. La première fois, choisis « Partager mon email » si Apple le propose.'
            : 'Same as email sign-up: birth date, 18+, and terms. On first sign-in, choose “Share My Email” if Apple asks.'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
    width: '100%',
    alignSelf: 'stretch',
  },
  appleBtn: {
    width: '100%',
    height: 48,
  },
  loadingBox: {
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
    textAlign: 'center',
  },
});
