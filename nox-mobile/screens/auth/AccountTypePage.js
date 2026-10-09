import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { rememberPostAuthScreen } from '../../utils/noxRoleNavigation';
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

const NEXT_SCREEN_BY_TYPE = {
  community: 'registerCommunity',
  dj: 'registerDj',
  booker: 'registerBooker',
  venue: 'registerVenue',
  prestataire: 'registerPrestataire',
};

export default function AccountTypePage() {
  const { language } = useLanguage();
  const { navigate } = useNavigation();
  const { user } = useAuth();
  const loggedIn = !!user?.isAuthenticated;

  const handleAccountTypeSelect = (type) => {
    const nextScreen = NEXT_SCREEN_BY_TYPE[type];
    if (!nextScreen) return;
    rememberPostAuthScreen(nextScreen);
    // Déjà connecté (email validé, pas encore de profil) : le formulaire de profil.
    // Repasser par login renvoie ici tout de suite (garde App.js).
    if (loggedIn) {
      navigate(nextScreen);
      return;
    }
    navigate('login', { mode: 'register', nextScreen });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          {loggedIn ? (
            <View style={styles.backBtn} />
          ) : (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigate('onboarding')}
              accessibilityRole="button"
              accessibilityLabel={language === 'fr' ? 'Retour' : 'Back'}
            >
              <Ionicons name="chevron-back" size={26} color={Colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <NoxText style={styles.title}>
              {language === 'fr' ? 'Choisis ton rôle' : 'Choose your role'}
            </NoxText>
            <NoxText variant="secondary" style={styles.subtitle}>
              {loggedIn
                ? language === 'fr'
                  ? 'Ton compte est validé. Choisis un rôle pour compléter ton profil — ce n’est pas un second compte.'
                  : 'Your account is verified. Pick a role to complete your profile — not a second account.'
                : language === 'fr'
                  ? 'Étape suivante : créer ton compte, puis compléter ton profil métier (pas un second compte).'
                  : 'Next: create your account, then complete your role profile (not a second account).'}
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
