import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { NoxText } from '../../components/nox';
import { styles } from './AccountTypePage.styles';

const accountTypes = [
  {
    id: 'dj',
    emoji: '🎧',
    titleFr: 'Artiste',
    titleEn: 'Artist',
    descriptionFr: 'DJ, producteur, live act…',
    descriptionEn: 'DJ, producer, live act…',
    wide: false,
  },
  {
    id: 'booker',
    emoji: '📅',
    titleFr: 'Organisateur',
    titleEn: 'Organizer',
    descriptionFr: 'Crée et gère tes événements',
    descriptionEn: 'Create and manage your events',
    wide: false,
  },
  {
    id: 'venue',
    emoji: '🏢',
    titleFr: 'Lieu',
    titleEn: 'Venue',
    descriptionFr: 'Club, bar, salle, festival…',
    descriptionEn: 'Club, bar, venue, festival…',
    wide: false,
  },
  {
    id: 'community',
    emoji: '👥',
    titleFr: 'Communauté',
    titleEn: 'Community',
    descriptionFr: 'Suis la scène et participe',
    descriptionEn: 'Follow the scene and engage',
    wide: false,
  },
  {
    id: 'prestataire',
    emoji: '🛠️',
    titleFr: 'Prestataire',
    titleEn: 'Service provider',
    descriptionFr: 'Photo, vidéo, technique événementielle',
    descriptionEn: 'Photo, video, event production',
    wide: true,
  },
];

export default function AccountTypePage() {
  const { language } = useLanguage();
  const { navigate } = useNavigation();

  const handleAccountTypeSelect = (type) => {
    const nextScreen =
      type === 'community'
        ? 'registerCommunity'
        : type === 'dj'
          ? 'registerDj'
          : type === 'booker'
            ? 'registerBooker'
            : type === 'venue'
              ? 'registerVenue'
              : type === 'prestataire'
                ? 'registerPrestataire'
                : null;

    if (!nextScreen) return;
    navigate('login', { mode: 'register', nextScreen });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigate('onboarding')}
            accessibilityRole="button"
            accessibilityLabel={language === 'fr' ? 'Retour' : 'Back'}
          >
            <NoxText style={styles.backText}>← {language === 'fr' ? 'Retour' : 'Back'}</NoxText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <NoxText style={styles.title}>
              {language === 'fr' ? 'Choisis ton rôle' : 'Choose your role'}
            </NoxText>
            <NoxText variant="secondary" style={styles.subtitle}>
              {language === 'fr'
                ? 'Tu pourras compléter ton profil juste après l’inscription.'
                : 'You can complete your profile right after signing up.'}
            </NoxText>
          </View>

          <View style={styles.grid}>
            {accountTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.card, type.wide && styles.cardWide]}
                onPress={() => handleAccountTypeSelect(type.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${language === 'fr' ? type.titleFr : type.titleEn}. ${
                  language === 'fr' ? type.descriptionFr : type.descriptionEn
                }`}
              >
                <View style={styles.cardAccent} />
                <View style={styles.cardInner}>
                  <NoxText style={styles.cardEmoji}>{type.emoji}</NoxText>
                  <NoxText style={styles.cardTitle}>
                    {language === 'fr' ? type.titleFr : type.titleEn}
                  </NoxText>
                  <NoxText variant="secondary" style={styles.cardDesc}>
                    {language === 'fr' ? type.descriptionFr : type.descriptionEn}
                  </NoxText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
