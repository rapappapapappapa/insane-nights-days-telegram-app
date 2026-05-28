import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

const profileTypes = [
  {
    type: 'COMMUNITY',
    emoji: '👥',
    titleFr: 'Communauté',
    titleEn: 'Community',
    descriptionFr: 'Acheter des tickets et noter',
    descriptionEn: 'Buy tickets and rate',
    registerScreen: 'registerCommunity',
  },
  {
    type: 'DJ',
    emoji: '🎧',
    titleFr: 'DJ',
    titleEn: 'DJ',
    descriptionFr: 'Créer et gérer tes événements',
    descriptionEn: 'Create and manage your events',
    registerScreen: 'registerDj',
  },
  {
    type: 'BOOKER',
    emoji: '📅',
    titleFr: 'Organisateur',
    titleEn: 'Organizer',
    descriptionFr: 'Organiser des événements',
    descriptionEn: 'Organize events',
    registerScreen: 'registerBooker',
  },
  {
    type: 'VENUE',
    emoji: '🏢',
    titleFr: 'Lieu',
    titleEn: 'Venue',
    descriptionFr: 'Gérer ton établissement et les réservations',
    descriptionEn: 'Manage your venue and bookings',
    registerScreen: 'registerVenue',
  },
  {
    type: 'PRESTATAIRE',
    emoji: '🛠️',
    titleFr: 'Prestataire',
    titleEn: 'Service provider',
    descriptionFr: 'Photo, vidéo, technique événement',
    descriptionEn: 'Photo, video, event production',
    registerScreen: 'registerPrestataire',
  },
];

export default function SwitchProfilePage() {
  const { language } = useLanguage();
  const { navigate, goBack } = useNavigation();
  const { user, updateUser, refreshCurrentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { toast, showError, showSuccess, hideToast } = useToast();
  
  const [profiles, setProfiles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (user?.isAuthenticated && user?.token) {
      fetchProfiles();
    } else {
      setLoading(false);
    }
  }, [user?.isAuthenticated, user?.token]);

  const fetchProfiles = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const response = await api.getUserProfiles(user.token);
      if (response && response.success) {
        setProfiles(response);
      }
    } catch (error) {
      console.error('Erreur récupération profils:', error);
      showError(language === 'fr' ? 'Impossible de charger les profils' : 'Unable to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchProfile = async (profileType) => {
    if (!user?.token) {
      showError(language === 'fr' ? 'Token manquant. Veuillez vous reconnecter.' : 'Missing token. Please log in again.');
      return;
    }
    
    // Vérifier si le profil existe
    const hasProfile = checkIfProfileExists(profileType);
    
    if (!hasProfile) {
      // Rediriger vers le formulaire de création
      const profileTypeData = profileTypes.find((p) => p.type === profileType);
      if (profileTypeData) {
        showSuccess(
          language === 'fr'
            ? `Aucun profil ${getProfileTitle(profileType)} trouvé. Création…`
            : `No ${getProfileTitle(profileType)} profile found. Creating…`
        );
        navigate(profileTypeData.registerScreen);
      }
      return;
    }

    // Basculer vers le profil existant
    setSwitching(true);
    try {
      const response = await api.switchProfile(user.token, profileType);
      if (response && response.success) {
        updateUser({ activeProfileType: profileType });
        await refreshCurrentUser();
        // ✅ Mettre à jour l'UI immédiatement (le refresh API peut être en retard)
        setProfiles((prev) => (prev ? { ...prev, activeProfileType: profileType } : prev));
        await fetchProfiles();
        showSuccess(language === 'fr' 
          ? `Profil basculé vers ${getProfileTitle(profileType)}` 
          : `Profile switched to ${getProfileTitle(profileType)}`);
        setTimeout(() => goBack(), 1500);
      } else {
        showError(response?.message || (language === 'fr' ? 'Impossible de basculer le profil' : 'Unable to switch profile'));
      }
    } catch (error) {
      console.error('Erreur bascule profil:', error);
      showError(
        error?.message ||
          (language === 'fr' ? 'Impossible de basculer le profil' : 'Unable to switch profile')
      );
    } finally {
      setSwitching(false);
    }
  };

  const checkIfProfileExists = (profileType) => {
    if (!profiles?.profiles) return false;
    
    switch (profileType) {
      case 'COMMUNITY':
        return profiles.profiles.community && profiles.profiles.community.length > 0;
      case 'DJ':
        return profiles.profiles.dj && profiles.profiles.dj.length > 0;
      case 'BOOKER':
        return profiles.profiles.booker && profiles.profiles.booker.length > 0;
      case 'VENUE':
        return profiles.profiles.venue && profiles.profiles.venue.length > 0;
      case 'PRESTATAIRE':
        return profiles.profiles.prestataire && profiles.profiles.prestataire.length > 0;
      default:
        return false;
    }
  };

  const getProfileTitle = (profileType) => {
    const profile = profileTypes.find((p) => p.type === profileType);
    return profile ? (language === 'fr' ? profile.titleFr : profile.titleEn) : profileType;
  };

  const getProfileDisplayName = (profileType, profileData) => {
    switch (profileType) {
      case 'COMMUNITY':
        return `${profileData.prenom} ${profileData.nom}`;
      case 'DJ':
        return profileData.artistName;
      case 'BOOKER':
        return `${profileData.prenom} ${profileData.nom}`;
      case 'VENUE':
        return profileData.venueName;
      case 'PRESTATAIRE': {
        const genres =
          profileData.prestationGenres && profileData.prestationGenres.length > 0
            ? profileData.prestationGenres.join(', ')
            : '';
        return [profileData.businessName, genres].filter(Boolean).join(' · ');
      }
      default:
        return '';
    }
  };

  if (!user?.isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Text style={styles.errorText}>
            {language === 'fr' ? 'Vous devez être connecté pour changer de profil.' : 'You must be logged in to switch profiles.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 56 },
        ]}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {language === 'fr' ? 'Changer de profil' : 'Switch Profile'}
          </Text>
          <Text style={styles.subtitle}>
            {language === 'fr' 
              ? 'Sélectionne le profil que tu veux utiliser' 
              : 'Select the profile you want to use'}
          </Text>
          {user?.activeProfileType && (
            <Text style={styles.activeProfileText}>
              {language === 'fr' ? 'Profil actif' : 'Active profile'}: {getProfileTitle(user.activeProfileType)}
            </Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
        ) : (
          <View style={styles.profilesContainer}>
            {profileTypes.map((profileType) => {
              const exists = checkIfProfileExists(profileType.type);
              const isActive = user?.activeProfileType === profileType.type;
              const profileData = exists
                ? profiles.profiles[profileType.type.toLowerCase()]?.[0]
                : null;

              return (
                <TouchableOpacity
                  key={profileType.type}
                  style={[
                    styles.profileCard,
                    isActive && styles.profileCardActive,
                    switching && styles.profileCardDisabled,
                  ]}
                  onPress={() => handleSwitchProfile(profileType.type)}
                  disabled={switching || isActive}
                >
                  <View style={styles.profileCardHeader}>
                    <Text style={styles.profileEmoji}>{profileType.emoji}</Text>
                    <View style={styles.profileCardInfo}>
                      <Text style={styles.profileTitle}>
                        {language === 'fr' ? profileType.titleFr : profileType.titleEn}
                      </Text>
                      {exists && profileData && (
                        <Text style={styles.profileName}>
                          {getProfileDisplayName(profileType.type, profileData)}
                        </Text>
                      )}
                      <Text style={styles.profileDescription}>
                        {language === 'fr' ? profileType.descriptionFr : profileType.descriptionEn}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.profileCardFooter}>
                    {isActive ? (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>
                          ✓ {language === 'fr' ? 'Actif' : 'Active'}
                        </Text>
                      </View>
                    ) : exists ? (
                      <Text style={styles.switchText}>
                        {language === 'fr' ? 'Basculer →' : 'Switch →'}
                      </Text>
                    ) : (
                      <Text style={styles.createText}>
                        {language === 'fr' ? 'Créer →' : 'Create →'}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Toast pour les notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  activeProfileText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  loader: {
    marginVertical: 40,
  },
  profilesContainer: {
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 18,
    padding: 20,
  },
  profileCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,23,68,0.1)',
  },
  profileCardDisabled: {
    opacity: 0.6,
  },
  profileCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  profileEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  profileCardInfo: {
    flex: 1,
  },
  profileTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileName: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  profileDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
  },
  profileCardFooter: {
    alignItems: 'flex-end',
  },
  activeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeBadgeText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  switchText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  createText: {
    color: 'rgba(255,23,68,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});


