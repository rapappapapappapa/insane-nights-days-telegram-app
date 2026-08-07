import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normalizeMediaUrl } from '../../api/config';
import { NoxText, NoxCard, NoxTabs, NoxButton } from '../nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { formatEventDateLabel } from '../../utils/noxDiscoverUtils';
import { openEventPreview } from '../../utils/noxNavigation';
import ProfileWallStream from './ProfileWallStream';

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <NoxText variant="titleSecondary" style={styles.statValue}>
        {value}
      </NoxText>
      <NoxText variant="secondary" style={styles.statLabel}>
        {label}
      </NoxText>
    </View>
  );
}

function buildTabs(fr, ticketCount, friendCount, wallCount = null) {
  const wallLabel =
    wallCount != null && wallCount > 0
      ? fr
        ? `Mur (${wallCount})`
        : `Wall (${wallCount})`
      : fr
        ? 'Mur'
        : 'Wall';
  return [
    { id: 'overview', label: fr ? 'Aperçu' : 'Overview' },
    { id: 'events', label: fr ? `Events (${ticketCount})` : `Events (${ticketCount})` },
    { id: 'wall', label: wallLabel },
    { id: 'friends', label: fr ? `Amis (${friendCount})` : `Friends (${friendCount})` },
  ];
}

/**
 * Shell profil communauté NOX — onglets Figma (overview, events, wall, friends).
 */
export default function CommunityProfileShell({
  profile,
  loading,
  isOwnProfile = false,
  friends = [],
  tickets = [],
  followingCount = 0,
  language = 'fr',
  navigate,
  goBack,
  onEdit,
  initialTab = 'overview',
  /** Compte utilisateur — posts DJ/booker publiés sous ce compte */
  wallUserId = null,
  wallDjId = null,
  wallBookerId = null,
}) {
  const insets = useSafeAreaInsets();
  const fr = language === 'fr';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [eventsSubTab, setEventsSubTab] = useState('attending');
  const [bannerBroken, setBannerBroken] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [wallPostCount, setWallPostCount] = useState(null);

  const wallFilter = useMemo(() => {
    if (wallUserId) return { userId: wallUserId };
    if (wallDjId) return { djId: wallDjId };
    if (wallBookerId) return { bookerId: wallBookerId };
    return null;
  }, [wallUserId, wallDjId, wallBookerId]);

  const upcomingTickets = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tickets.filter((t) => {
      const d = t.eventDate ? new Date(`${t.eventDate}T12:00:00`) : null;
      return d && !Number.isNaN(d.getTime()) && d >= today;
    });
  }, [tickets]);

  const pastTickets = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tickets.filter((t) => {
      const d = t.eventDate ? new Date(`${t.eventDate}T12:00:00`) : null;
      return d && !Number.isNaN(d.getTime()) && d < today;
    });
  }, [tickets]);

  const tabs = useMemo(
    () => buildTabs(fr, tickets.length, friends.length, wallPostCount),
    [fr, tickets.length, friends.length, wallPostCount],
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <NoxText variant="secondary">{fr ? 'Profil introuvable.' : 'Profile not found.'}</NoxText>
        <NoxButton label={fr ? 'Retour' : 'Back'} onPress={goBack} style={{ marginTop: Spacing.lg }} />
      </View>
    );
  }

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsRow}>
        <Stat value={tickets.length} label={fr ? 'Events' : 'Events'} />
        <Stat value={followingCount} label={fr ? 'Abonnements' : 'Following'} />
        <Stat value={friends.length} label={fr ? 'Amis' : 'Friends'} />
      </View>

      {profile.genres ? (
        <View style={styles.genresBlock}>
          <NoxText variant="secondary" style={styles.sectionLabel}>
            {fr ? 'Styles écoutés' : 'Music tastes'}
          </NoxText>
          <NoxText variant="form">{profile.genres}</NoxText>
        </View>
      ) : null}

      {isOwnProfile ? (
        <NoxButton
          label={fr ? 'Modifier mon profil' : 'Edit profile'}
          onPress={onEdit}
          style={{ marginTop: Spacing.lg }}
        />
      ) : null}
    </View>
  );

  const renderEvents = () => {
    const eventTabs = [
      { id: 'attending', label: fr ? 'À venir' : 'Attending' },
      { id: 'attended', label: fr ? 'Passés' : 'Attended' },
      { id: 'will', label: fr ? 'Prévus' : 'Will attend' },
    ];
    const willTickets = [];
    const list =
      eventsSubTab === 'attended'
        ? pastTickets
        : eventsSubTab === 'will'
          ? willTickets
          : upcomingTickets;

    return (
      <View style={styles.tabContent}>
        {!isOwnProfile ? (
          <NoxText variant="secondary" style={styles.empty}>
            {fr
              ? 'Les événements de cet ami ne sont pas publics pour le moment.'
              : 'This friend’s events are not public yet.'}
          </NoxText>
        ) : (
          <>
            <NoxTabs tabs={eventTabs} activeId={eventsSubTab} onChange={setEventsSubTab} style={styles.subTabs} />
            {list.length === 0 ? (
              <NoxText variant="secondary" style={styles.empty}>
                {eventsSubTab === 'will'
                  ? fr
                    ? 'La liste « Prévus » sera disponible prochainement.'
                    : 'The “Will attend” list will be available soon.'
                  : fr
                    ? 'Aucun événement dans cette catégorie.'
                    : 'No events in this category.'}
              </NoxText>
            ) : (
              list.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (t.eventId) openEventPreview(navigate, 'COMMUNITY', t.eventId);
                    else navigate('tickets');
                  }}
                >
                  <NoxCard style={styles.listCard} padded={false}>
                    <Ionicons name="ticket-outline" size={22} color={Colors.primary} />
                    <View style={{ flex: 1 }}>
                      <NoxText variant="form">{t.eventTitle || 'Event'}</NoxText>
                      <NoxText variant="secondary">
                        {formatEventDateLabel(t.eventDate, language, { shortMonth: true })}
                      </NoxText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                  </NoxCard>
                </TouchableOpacity>
              ))
            )}
            <NoxButton
              label={fr ? 'Mes billets (QR)' : 'My tickets (QR)'}
              variant="secondary"
              onPress={() => navigate('tickets')}
              style={{ marginTop: Spacing.lg }}
            />
          </>
        )}
      </View>
    );
  };

  const renderWall = () => (
    <View style={styles.tabContent}>
      <ProfileWallStream
        wallFilter={wallFilter}
        isOwnProfile={isOwnProfile}
        enabled={activeTab === 'wall'}
        onTotalChange={setWallPostCount}
      />
    </View>
  );

  const renderFriends = () => (
    <View style={styles.tabContent}>
      {friends.length === 0 ? (
        <NoxText variant="secondary" style={styles.empty}>
          {fr ? 'Aucun ami pour le moment.' : 'No friends yet.'}
        </NoxText>
      ) : (
        friends.slice(0, 8).map((f) => {
          const id = f.communityId || f.id;
          const name = f.pseudo || f.username || '?';
          return (
            <TouchableOpacity
              key={id}
              activeOpacity={0.85}
              onPress={() => id && navigate('communityProfile', { communityId: id })}
            >
              <NoxCard style={styles.listCard} padded={false}>
                <View style={styles.friendAvatar}>
                  {f.profileImage ? (
                    <Image source={{ uri: normalizeMediaUrl(f.profileImage) }} style={styles.friendAvatarImg} />
                  ) : (
                    <NoxText variant="form">{name.charAt(0).toUpperCase()}</NoxText>
                  )}
                </View>
                <NoxText variant="form" style={{ flex: 1 }}>
                  {name}
                </NoxText>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
              </NoxCard>
            </TouchableOpacity>
          );
        })
      )}
      {isOwnProfile ? (
        <NoxButton
          label={fr ? 'Gérer mes amis' : 'Manage friends'}
          onPress={() => navigate('communityFriends')}
          style={{ marginTop: Spacing.lg }}
        />
      ) : null}
    </View>
  );

  const tabBody =
    activeTab === 'events'
      ? renderEvents()
      : activeTab === 'wall'
        ? renderWall()
        : activeTab === 'friends'
          ? renderFriends()
          : renderOverview();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <NoxText variant="titleSecondary">{profile.pseudo || (fr ? 'Profil' : 'Profile')}</NoxText>
            {isOwnProfile ? (
              <NoxText variant="secondary">{fr ? 'Mon profil communauté' : 'My community profile'}</NoxText>
            ) : null}
          </View>
          {isOwnProfile ? (
            <TouchableOpacity onPress={onEdit} hitSlop={12} style={styles.headerBtn}>
              <Ionicons name="create-outline" size={22} color={Colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>

        <View style={styles.profileHero}>
          <View style={styles.banner}>
            {profile.bannerImage && !bannerBroken ? (
              <Image
                source={{ uri: normalizeMediaUrl(profile.bannerImage) }}
                style={StyleSheet.absoluteFillObject}
                onError={() => setBannerBroken(true)}
              />
            ) : (
              <Ionicons name="image-outline" size={32} color={primaryAlpha(0.5)} />
            )}
          </View>
          <View style={styles.avatarWrap}>
            {profile.profileImage && !avatarBroken ? (
              <Image
                source={{ uri: normalizeMediaUrl(profile.profileImage) }}
                style={styles.avatar}
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <NoxText variant="title">{profile.pseudo?.charAt(0)?.toUpperCase() || '?'}</NoxText>
              </View>
            )}
          </View>
        </View>

        <NoxTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} style={styles.tabs} />
        {tabBody}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  profileHero: { marginBottom: Spacing.lg },
  banner: {
    height: 120,
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.card,
    backgroundColor: primaryAlpha(0.1),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarWrap: { alignItems: 'center', marginTop: -40 },
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
  tabs: { marginBottom: Spacing.lg, paddingHorizontal: Spacing.sm },
  tabContent: { paddingHorizontal: Spacing.xl },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xl,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 11, marginTop: 2 },
  genresBlock: { marginBottom: Spacing.lg },
  sectionLabel: { marginBottom: Spacing.xs, textTransform: 'uppercase', fontSize: 11 },
  subSection: { marginBottom: Spacing.md, marginTop: Spacing.sm },
  subTabs: { marginBottom: Spacing.lg },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: primaryAlpha(0.15),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  friendAvatarImg: { width: '100%', height: '100%' },
  infoCard: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xxl },
  empty: { textAlign: 'center', marginTop: Spacing.xxl },
});
