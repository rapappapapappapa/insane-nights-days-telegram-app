import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';

const accountTypes = [
  {
    id: 'community',
    emoji: '👥',
    titleFr: 'Communauté',
    titleEn: 'Community',
    descriptionFr: 'Rejoignez la communauté',
    descriptionEn: 'Join the community',
  },
  {
    id: 'dj',
    emoji: '🎧',
    titleFr: 'DJ',
    titleEn: 'DJ',
    descriptionFr: 'Créez votre profil DJ',
    descriptionEn: 'Create your DJ profile',
  },
  {
    id: 'booker',
    emoji: '📅',
    titleFr: 'Organisateur',
    titleEn: 'Organizer',
    descriptionFr: 'Gérez vos événements',
    descriptionEn: 'Manage your events',
  },
  {
    id: 'venue',
    emoji: '🏢',
    titleFr: 'Lieu',
    titleEn: 'Venue',
    descriptionFr: 'Ajoutez votre lieu',
    descriptionEn: 'Add your venue',
  },
];

export default function AccountTypePage() {
  const { language, t } = useLanguage();
  const { navigate } = useNavigation();

  const handleAccountTypeSelect = (type) => {
    // ✅ IMPORTANT: créer/connexion compte d'abord, puis créer le profil.
    const nextScreen =
      type === 'community'
        ? 'registerCommunity'
        : type === 'dj'
          ? 'registerDj'
          : type === 'booker'
            ? 'registerBooker'
            : type === 'venue'
              ? 'registerVenue'
              : null;

    if (!nextScreen) return;
    navigate('login', { mode: 'register', nextScreen });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigate('home')}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('createAccount')}</Text>
          <Text style={styles.subtitle}>
            {language === 'fr' 
              ? 'Choisissez le type de compte qui vous correspond' 
              : 'Choose the account type that suits you'}
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          {accountTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={styles.accountCard}
              onPress={() => handleAccountTypeSelect(type.id)}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEmoji}>{type.emoji}</Text>
              <Text style={styles.cardTitle}>
                {language === 'fr' ? type.titleFr : type.titleEn}
              </Text>
              <Text style={styles.cardDescription}>
                {language === 'fr' ? type.descriptionFr : type.descriptionEn}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  accountCard: {
    width: '48%',
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.35)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 160,
  },
  cardEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

