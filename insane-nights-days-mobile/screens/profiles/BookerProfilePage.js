import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const getBookerPlaceholderImage = (name) => {
  const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const images = [
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop',
  ];
  return images[hash % images.length];
};

export default function BookerProfilePage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { routeParams, goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { bookerId } = routeParams || {};

  const [booker, setBooker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  useEffect(() => {
    if (bookerId) {
      fetchBookerProfile();
    }
  }, [bookerId]);

  useEffect(() => {
    if (!user?.token || !booker?.id || booker.userId === user?.id) return;
    let mounted = true;
    (async () => {
      try {
        const res = await api.getFollowStatus(user.token, { bookerId: booker.id });
        if (mounted && res?.success) setFollowing(!!res.following);
      } catch {
        if (mounted) setFollowing(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.token, user?.id, booker?.id, booker?.userId]);

  const fetchBookerProfile = async () => {
    setLoading(true);
    try {
      const res = await api.getBookerProfileById(bookerId);
      if (res?.success && res.booker) {
        setBooker(res.booker);
      } else {
        setBooker(null);
      }
    } catch (error) {
      console.error('Erreur récupération profil Organisateur:', error);
      showError(language === 'fr' ? 'Impossible de charger le profil.' : 'Unable to load profile.');
      setBooker(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user?.token || !booker?.id || loadingFollow) return;
    if (booker.userId === user?.id) return;
    setLoadingFollow(true);
    try {
      if (following) {
        await api.unfollowBooker(user.token, booker.id);
        setFollowing(false);
        showSuccess(language === 'fr' ? 'Abonnement retiré.' : 'Unfollowed.');
      } else {
        await api.followBooker(user.token, booker.id);
        setFollowing(true);
        showSuccess(language === 'fr' ? 'Vous suivez cet organisateur.' : 'You now follow this organizer.');
      }
    } catch (e) {
      showError(e?.message || (language === 'fr' ? 'Erreur.' : 'Error.'));
    } finally {
      setLoadingFollow(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {language === 'fr' ? 'Chargement...' : 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  if (!booker) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <TouchableOpacity style={[styles.backButton, { top: (insets?.top ?? 0) + 10 }]} onPress={goBack}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {language === 'fr' ? 'Profil non trouvé' : 'Profile not found'}
          </Text>
        </View>
      </View>
    );
  }

  const displayName = booker.name || booker.pseudo || `${booker.nom || ''} ${booker.prenom || ''}`.trim() || 'Organisateur';
  const avatarUri = normalizeMediaUrl(booker.profileImage);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar style="light" />

      <TouchableOpacity style={[styles.backButton, { top: (insets?.top ?? 0) + 10 }]} onPress={goBack}>
        <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
      </TouchableOpacity>

      <View style={[styles.header, { paddingTop: (insets?.top ?? 0) + 70 }]}>
        <View style={styles.backgroundImage}>
          <Image
            source={{ uri: getBookerPlaceholderImage(displayName) }}
            style={styles.backgroundImageContent}
            blurRadius={3}
          />
        </View>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImage, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{displayName?.charAt(0)?.toUpperCase() || 'B'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.bookerName}>{displayName}</Text>
          {booker.bookerType ? (
            <View style={styles.badgeRow}>
              <View style={styles.badgeBooker}>
                <Ionicons name="calendar-outline" size={14} color="#fff" />
                <Text style={styles.badgeText}>{booker.bookerType}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatPill}>
              <Text style={styles.quickStatLabel}>{language === 'fr' ? 'Événements' : 'Events'}</Text>
              <Text style={styles.quickStatValue}>{booker.eventsCount ?? 0}</Text>
            </View>
            <View style={styles.quickStatPill}>
              <Text style={styles.quickStatLabel}>{language === 'fr' ? 'Posts' : 'Posts'}</Text>
              <Text style={styles.quickStatValue}>{booker.postsCount ?? 0}</Text>
            </View>
          </View>

          {user?.token && booker.userId === user?.id ? (
            <TouchableOpacity
              style={styles.followButton}
              onPress={() => navigate('bookerDashboard', { openSection: 'profil' })}
            >
              <Text style={styles.followButtonText}>
                {language === 'fr' ? 'Modifier mon profil' : 'Edit my profile'}
              </Text>
            </TouchableOpacity>
          ) : user?.token && booker.userId !== user?.id ? (
            <TouchableOpacity
              style={[styles.followButton, following && styles.followButtonActive]}
              onPress={handleFollowToggle}
              disabled={loadingFollow}
            >
              {loadingFollow ? (
                <Text style={styles.followButtonText}>...</Text>
              ) : (
                <Text style={[styles.followButtonText, following && styles.followButtonTextActive]}>
                  {following ? (language === 'fr' ? 'Abonné ✓' : 'Following ✓') : (language === 'fr' ? 'Suivre' : 'Follow')}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    paddingBottom: 24,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    overflow: 'hidden',
  },
  backgroundImageContent: {
    width: '100%',
    height: '100%',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    marginBottom: 12,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  bookerName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badgeBooker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 23, 68, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickStatPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 90,
  },
  quickStatLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  quickStatValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  followButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  followButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  followButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  followButtonTextActive: {
    color: '#fff',
  },
});
