import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';
import { NoxText, NoxButton } from '../../components/nox';

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
  const [bannerBroken, setBannerBroken] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

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
    return () => {
      mounted = false;
    };
  }, [user?.token, user?.id, booker?.id, booker?.userId]);

  const fetchBookerProfile = async () => {
    setLoading(true);
    setBannerBroken(false);
    setAvatarBroken(false);
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
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <NoxText variant="secondary" style={{ marginTop: Spacing.md }}>
            {language === 'fr' ? 'Chargement...' : 'Loading...'}
          </NoxText>
        </View>
      </View>
    );
  }

  if (!booker) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={[styles.topBar, { paddingTop: (insets?.top ?? 0) + Spacing.sm }]}>
          <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.topBarBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <NoxText variant="titleSecondary">
              {language === 'fr' ? 'Organisateur' : 'Organizer'}
            </NoxText>
          </View>
          <View style={styles.topBarBtn} />
        </View>
        <View style={styles.centered}>
          <NoxText variant="secondary">
            {language === 'fr' ? 'Profil non trouvé' : 'Profile not found'}
          </NoxText>
          <NoxButton
            label={language === 'fr' ? 'Retour' : 'Back'}
            onPress={goBack}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      </View>
    );
  }

  const displayName =
    booker.name ||
    booker.pseudo ||
    `${booker.nom || ''} ${booker.prenom || ''}`.trim() ||
    (language === 'fr' ? 'Organisateur' : 'Organizer');
  const avatarUri = normalizeMediaUrl(booker.profileImage);
  const bannerUri = normalizeMediaUrl(booker.bannerImage || booker.coverImage);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style="light" />

      <View style={[styles.topBar, { paddingTop: (insets?.top ?? 0) + Spacing.sm }]}>
        <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.topBarBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <NoxText variant="titleSecondary">{displayName}</NoxText>
          <NoxText variant="secondary">
            {language === 'fr' ? 'Organisateur' : 'Organizer'}
          </NoxText>
        </View>
        <View style={styles.topBarBtn} />
      </View>

      <View style={styles.profileHero}>
        <View style={styles.banner}>
          {bannerUri && !bannerBroken ? (
            <Image
              source={{ uri: bannerUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              onError={() => setBannerBroken(true)}
            />
          ) : (
            <Ionicons name="calendar-outline" size={32} color={primaryAlpha(0.45)} />
          )}
        </View>
        <View style={styles.avatarWrap}>
          {avatarUri && !avatarBroken ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatar}
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <NoxText variant="title">{displayName?.charAt(0)?.toUpperCase() || 'B'}</NoxText>
            </View>
          )}
        </View>
      </View>

      <View style={styles.identityBlock}>
        <NoxText variant="title" style={styles.bookerName}>
          {displayName}
        </NoxText>

        {booker.bookerType ? (
          <View style={styles.badge}>
            <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
            <NoxText variant="secondary">{booker.bookerType}</NoxText>
          </View>
        ) : null}

        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatPill}>
            <NoxText variant="secondary" style={styles.quickStatLabel}>
              {language === 'fr' ? 'Événements' : 'Events'}
            </NoxText>
            <NoxText variant="titleSecondary" style={styles.quickStatValue}>
              {booker.eventsCount ?? 0}
            </NoxText>
          </View>
          <View style={styles.quickStatPill}>
            <NoxText variant="secondary" style={styles.quickStatLabel}>
              {language === 'fr' ? 'Posts' : 'Posts'}
            </NoxText>
            <NoxText variant="titleSecondary" style={styles.quickStatValue}>
              {booker.postsCount ?? 0}
            </NoxText>
          </View>
        </View>

        {user?.token && booker.userId === user?.id ? (
          <NoxButton
            label={language === 'fr' ? 'Modifier mon profil' : 'Edit my profile'}
            style={{ marginTop: Spacing.lg, alignSelf: 'stretch' }}
            onPress={() => navigate('bookerDashboard', { openSection: 'profil' })}
          />
        ) : user?.token && booker.userId !== user?.id ? (
          <NoxButton
            label={
              loadingFollow
                ? '…'
                : following
                  ? language === 'fr'
                    ? 'Abonné'
                    : 'Following'
                  : language === 'fr'
                    ? 'Suivre'
                    : 'Follow'
            }
            variant={following ? 'secondary' : 'primary'}
            disabled={loadingFollow}
            style={{ marginTop: Spacing.lg, alignSelf: 'stretch' }}
            onPress={handleFollowToggle}
          />
        ) : null}
      </View>

      {toast.visible ? (
        <Toast message={toast.message} type={toast.type} onHide={hideToast} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  profileHero: {
    marginBottom: Spacing.lg,
  },
  banner: {
    height: 120,
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.card,
    backgroundColor: primaryAlpha(0.1),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarWrap: {
    alignItems: 'center',
    marginTop: -40,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: Colors.background,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: primaryAlpha(0.2),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  identityBlock: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  bookerName: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: primaryAlpha(0.16),
    borderWidth: 1,
    borderColor: primaryAlpha(0.28),
    marginBottom: Spacing.md,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignSelf: 'stretch',
  },
  quickStatPill: {
    flex: 1,
    backgroundColor: Colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  quickStatLabel: {
    textTransform: 'uppercase',
    fontSize: 11,
    marginBottom: Spacing.xs,
  },
  quickStatValue: {
    color: Colors.primary,
  },
});
