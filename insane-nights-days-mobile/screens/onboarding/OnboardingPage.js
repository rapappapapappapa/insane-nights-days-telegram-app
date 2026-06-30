import React, { useState } from 'react';
import { View, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import Logo from '../../components/Logo';
import { NoxText, NoxButton } from '../../components/nox';
import Colors from '../../constants/colors';
import { styles } from './OnboardingPage.styles';

const SLIDES = [
  {
    id: 'problem',
    fr: 'Le talent existe déjà. Ce qu\'il manque, c\'est une structure.',
    en: 'Talent already exists. What\'s missing is structure.',
  },
  {
    id: 'solution',
    fr: 'Un réseau. Une plateforme. Un écosystème.',
    en: 'A network. A platform. An ecosystem.',
  },
  {
    id: 'audience',
    fr: 'Pensé pour toute la scène. Artistes, organisateurs, lieux et communautés.',
    en: 'Built for the whole scene. Artists, organizers, venues and communities.',
  },
];

export default function OnboardingPage() {
  const { language } = useLanguage();
  const { navigate } = useNavigation();
  const [step, setStep] = useState(0);

  const isLast = step >= SLIDES.length - 1;
  const slide = SLIDES[step];

  const goNext = () => {
    if (isLast) {
      navigate('accountType');
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          {step > 0 ? (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setStep((s) => Math.max(0, s - 1))}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={language === 'fr' ? 'Retour' : 'Back'}
            >
              <Ionicons name="chevron-back" size={26} color={Colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
          <NoxText variant="secondary" style={styles.stepLabel}>
            {step + 1}/{SLIDES.length}
          </NoxText>
        </View>

        <View style={styles.main}>
          <View style={styles.logoWrap}>
            <Logo size={56} />
          </View>
          <NoxText style={styles.headline}>
            {language === 'fr' ? slide.fr : slide.en}
          </NoxText>
        </View>

        <View style={styles.bottomDock}>
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View key={s.id} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <NoxButton
            label={
              isLast
                ? language === 'fr'
                  ? 'Terminer'
                  : 'Finish'
                : language === 'fr'
                  ? 'Continuer'
                  : 'Continue'
            }
            onPress={goNext}
          />

          <TouchableOpacity style={styles.skipLink} onPress={() => navigate('login')}>
            <NoxText variant="secondary" style={styles.skipText}>
              {language === 'fr' ? 'J\'ai déjà un compte' : 'I already have an account'}
            </NoxText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
