import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { NoxText, NoxRoleCard } from '../../components/nox';
import Colors from '../../constants/colors';
import { ROLE_THEMES, styles } from './AccountTypePage.styles';

const accountTypes = [
  {
    id: 'dj',
    icon: 'musical-notes',
    titleFr: 'Artiste',
    titleEn: 'Artist',
    descriptionFr: 'DJ, producteur, live act…',
    descriptionEn: 'DJ, producer, live act…',
    wide: false,
  },
  {
    id: 'booker',
    icon: 'calendar',
    titleFr: 'Organisateur',
    titleEn: 'Organizer',
    descriptionFr: 'Crée et gère tes événements',
    descriptionEn: 'Create and manage your events',
    wide: false,
  },
  {
    id: 'venue',
    icon: 'business',
    titleFr: 'Lieu',
    titleEn: 'Venue',
    descriptionFr: 'Club, bar, salle, festival…',
    descriptionEn: 'Club, bar, venue, festival…',
    wide: false,
  },
  {
    id: 'community',
    icon: 'people',
    titleFr: 'Communauté',
    titleEn: 'Community',
    descriptionFr: 'Suis la scène et participe',
    descriptionEn: 'Follow the scene and engage',
    wide: false,
  },
  {
    id: 'prestataire',
    icon: 'construct',
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
            style={styles.backBtn}
            onPress={() => navigate('onboarding')}
            accessibilityRole="button"
            accessibilityLabel={language === 'fr' ? 'Retour' : 'Back'}
          >
            <Ionicons name="chevron-back" size={26} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <NoxText style={styles.title}>
              {language === 'fr' ? 'Choisis ton rôle' : 'Choose your role'}
            </NoxText>
            <NoxText variant="secondary" style={styles.subtitle}>
              {language === 'fr'
                ? 'Tu compléteras ton profil juste après l’inscription.'
                : 'You will complete your profile right after signing up.'}
            </NoxText>
          </View>

          <View style={styles.grid}>
            {accountTypes.map((type) => (
              <NoxRoleCard
                key={type.id}
                wide={type.wide}
                icon={type.icon}
                tintColor={ROLE_THEMES[type.id]}
                title={language === 'fr' ? type.titleFr : type.titleEn}
                description={language === 'fr' ? type.descriptionFr : type.descriptionEn}
                onPress={() => handleAccountTypeSelect(type.id)}
                accessibilityLabel={`${language === 'fr' ? type.titleFr : type.titleEn}. ${
                  language === 'fr' ? type.descriptionFr : type.descriptionEn
                }`}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
