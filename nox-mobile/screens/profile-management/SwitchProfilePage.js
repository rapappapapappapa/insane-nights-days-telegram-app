import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Layout, Radius, Spacing } from '../../constants/theme';
import { NoxText, NoxCard, NoxScreenHeader } from '../../components/nox';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { getHomeScreenForProfile } from '../../utils/noxRoleNavigation';

const profileTypes = [
  {
    type: 'COMMUNITY',
    icon: 'people',
    titleFr: 'Communauté',
    titleEn: 'Community',
    descriptionFr: 'Acheter des tickets et noter',
    descriptionEn: 'Buy tickets and rate',
    registerScreen: 'registerCommunity',
  },
  {
    type: 'DJ',
    icon: 'headset',
    titleFr: 'DJ',
    titleEn: 'DJ',
    descriptionFr: 'Créer et gérer tes événements',
    descriptionEn: 'Create and manage your events',
    registerScreen: 'registerDj',
  },
  {
    type: 'BOOKER',
    icon: 'calendar',
    titleFr: 'Organisateur',
    titleEn: 'Organizer',
    descriptionFr: 'Organiser des événements',
    descriptionEn: 'Organize events',
    registerScreen: 'registerBooker',
  },
  {
    type: 'VENUE',
    icon: 'business',
    titleFr: 'Lieu',
    titleEn: 'Venue',
    descriptionFr: 'Gérer ton établissement et les réservations',
    descriptionEn: 'Manage your venue and bookings',
    registerScreen: 'registerVenue',
  },
  {
    type: 'PRESTATAIRE',
    icon: 'construct',
    titleFr: 'Prestataire',
    titleEn: 'Service provider',
    descriptionFr: 'Photo, vidéo, technique événement',
    descriptionEn: 'Photo, video, event production',
    registerScreen: 'registerPrestataire',
  },
];

export default function SwitchProfilePage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { navigate, goBack } = useNavigation();
  const { user, updateUser, refreshCurrentUser } = useAuth();
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
      showError(fr ? 'Impossible de charger les profils' : 'Unable to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchProfile = async (profileType) => {
    if (!user?.token) {
      showError(fr ? 'Token manquant. Veuillez vous reconnecter.' : 'Missing token. Please log in again.');
      return;
    }

    const hasProfile = checkIfProfileExists(profileType);

    if (!hasProfile) {
      const profileTypeData = profileTypes.find((p) => p.type === profileType);
      if (profileTypeData) {
        showSuccess(
          fr
            ? `Aucun profil ${getProfileTitle(profileType)} trouvé. Création…`
            : `No ${getProfileTitle(profileType)} profile found. Creating…`
        );
        navigate(profileTypeData.registerScreen);
      }
      return;
    }

    setSwitching(true);
    try {
      const response = await api.switchProfile(user.token, profileType);
      if (response && response.success) {
        updateUser({ activeProfileType: profileType });
        await refreshCurrentUser();
        setProfiles((prev) => (prev ? { ...prev, activeProfileType: profileType } : prev));
        await fetchProfiles();
        showSuccess(
          fr
            ? `Profil basculé vers ${getProfileTitle(profileType)}`
            : `Profile switched to ${getProfileTitle(profileType)}`
        );
        setTimeout(() => navigate(getHomeScreenForProfile(profileType)), 1500);
      } else {
        showError(response?.message || (fr ? 'Impossible de basculer le profil' : 'Unable to switch profile'));
      }
    } catch (error) {
      console.error('Erreur bascule profil:', error);
      showError(
        error?.message ||
          (fr ? 'Impossible de basculer le profil' : 'Unable to switch profile')
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
    return profile ? (fr ? profile.titleFr : profile.titleEn) : profileType;
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
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <NoxScreenHeader
          title={fr ? 'Changer de profil' : 'Switch Profile'}
          onBack={goBack}
        />
        <View style={styles.content}>
          <NoxText variant="secondary" style={styles.errorText}>
            {fr
              ? 'Vous devez être connecté pour changer de profil.'
              : 'You must be logged in to switch profiles.'}
          </NoxText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <NoxScreenHeader
        title={fr ? 'Changer de profil' : 'Switch Profile'}
        subtitle={
          fr
            ? 'Sélectionne le profil que tu veux utiliser'
            : 'Select the profile you want to use'
        }
        onBack={goBack}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {user?.activeProfileType ? (
          <NoxText variant="form" style={styles.activeProfileText}>
            {fr ? 'Profil actif' : 'Active profile'}: {getProfileTitle(user.activeProfileType)}
          </NoxText>
        ) : null}

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
                  onPress={() => handleSwitchProfile(profileType.type)}
                  disabled={switching || isActive}
                  activeOpacity={0.85}
                >
                  <NoxCard
                    style={[
                      styles.profileCard,
                      isActive && styles.profileCardActive,
                      switching && styles.profileCardDisabled,
                    ]}
                  >
                    <View style={styles.profileCardHeader}>
                      <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                        <Ionicons
                          name={profileType.icon}
                          size={28}
                          color={isActive ? Colors.text : Colors.primary}
                        />
                      </View>
                      <View style={styles.profileCardInfo}>
                        <NoxText variant="form" style={styles.profileTitle}>
                          {fr ? profileType.titleFr : profileType.titleEn}
                        </NoxText>
                        {exists && profileData ? (
                          <NoxText variant="form" style={styles.profileName}>
                            {getProfileDisplayName(profileType.type, profileData)}
                          </NoxText>
                        ) : null}
                        <NoxText variant="secondary" style={styles.profileDescription}>
                          {fr ? profileType.descriptionFr : profileType.descriptionEn}
                        </NoxText>
                      </View>
                    </View>

                    <View style={styles.profileCardFooter}>
                      {isActive ? (
                        <View style={styles.activeBadge}>
                          <Ionicons name="checkmark" size={14} color={Colors.text} />
                          <NoxText variant="button" style={styles.activeBadgeText}>
                            {fr ? 'Actif' : 'Active'}
                          </NoxText>
                        </View>
                      ) : (
                        <View style={styles.actionRow}>
                          <NoxText
                            variant="form"
                            style={exists ? styles.switchText : styles.createText}
                          >
                            {exists
                              ? fr
                                ? 'Basculer'
                                : 'Switch'
                              : fr
                                ? 'Créer'
                                : 'Create'}
                          </NoxText>
                          <Ionicons
                            name="arrow-forward"
                            size={14}
                            color={exists ? Colors.primary : primaryAlpha(0.7)}
                          />
                        </View>
                      )}
                    </View>
                  </NoxCard>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.xxxl + Spacing.xl,
    paddingTop: Spacing.sm,
  },
  activeProfileText: {
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  loader: {
    marginVertical: Spacing.xxxl,
  },
  profilesContainer: {
    gap: Spacing.lg,
  },
  profileCard: {
    borderColor: primaryAlpha(0.3),
  },
  profileCardActive: {
    borderColor: Colors.primary,
    backgroundColor: primaryAlpha(0.1),
  },
  profileCardDisabled: {
    opacity: 0.6,
  },
  profileCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  iconWrapActive: {
    backgroundColor: Colors.primary,
  },
  profileCardInfo: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 18,
    marginBottom: Spacing.xs,
  },
  profileName: {
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  profileDescription: {
    lineHeight: 20,
  },
  profileCardFooter: {
    alignItems: 'flex-end',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  activeBadgeText: {
    color: Colors.text,
    fontSize: 14,
  },
  switchText: {
    color: Colors.primary,
  },
  createText: {
    color: primaryAlpha(0.7),
  },
  errorText: {
    textAlign: 'center',
    marginTop: Spacing.xxxl,
  },
});
