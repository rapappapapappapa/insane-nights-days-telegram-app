import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StatusBar, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import Logo from '../../components/Logo';
import { NoxText, NoxButton } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing } from '../../constants/theme';

const AUTO_MS = 2200;

export default function SplashPage() {
  const { navigate } = useNavigation();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const glow = useRef(new Animated.Value(0.35)).current;
  const timerRef = useRef(null);

  const goOnboarding = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    navigate('onboarding');
  };

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.85, duration: 1400, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.35, duration: 1400, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    timerRef.current = setTimeout(goOnboarding, AUTO_MS);
    return () => {
      pulse.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={goOnboarding}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Animated.View style={[styles.glow, { opacity: glow }]} />
          <Logo size={120} />
          <NoxText variant="title" style={styles.brand}>
            NOX
          </NoxText>
          <NoxText variant="secondary" style={styles.tagline}>
            {fr ? 'La scène, structurée.' : 'The scene, structured.'}
          </NoxText>
        </View>
        <NoxButton
          label={fr ? 'Continuer' : 'Continue'}
          onPress={goOnboarding}
          style={styles.cta}
        />
      </SafeAreaView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    paddingBottom: Spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: primaryAlpha(0.45),
    shadowColor: Colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 48,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  brand: {
    marginTop: Spacing.xl,
    fontSize: 36,
    letterSpacing: 4,
  },
  tagline: {
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  cta: {
    marginTop: Spacing.xl,
  },
});
