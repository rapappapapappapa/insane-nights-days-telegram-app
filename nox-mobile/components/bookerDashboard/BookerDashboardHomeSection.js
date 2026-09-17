import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NoxText from '../nox/NoxText';
import NotificationBadge from '../NotificationBadge';
import Colors from '../../constants/colors';
import { Layout, Spacing } from '../../constants/theme';
import { normalizeMediaUrl } from '../../api/config';

function formatCompact(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '—';
  if (num >= 1000) {
    const k = num / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(Math.round(num));
}

function formatEventBadge(iso, language) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = d
      .toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' })
      .replace('.', '')
      .toUpperCase();
    return `${day} ${month}.`;
  } catch {
    return '';
  }
}

function bookerTypeLabel(type, fr) {
  const map = {
    INDEPENDENT: fr ? 'Indépendant' : 'Independent',
    Indépendant: fr ? 'Indépendant' : 'Independent',
    Agence: fr ? 'Agence' : 'Agency',
    Collectif: fr ? 'Collectif' : 'Collective',
    Label: 'Label',
    Promoteur: fr ? 'Promoteur' : 'Promoter',
    Autre: fr ? 'Autre' : 'Other',
  };
  return map[type] || type || (fr ? 'Organisateur' : 'Organizer');
}

export default function BookerDashboardHomeSection({
  language,
  styles,
  tiles,
  onSelectSection,
  unreadCount = 0,
  onNotificationsPress,
  displayName,
  orgName,
  bookerType,
  city,
  profileImage,
  bookerId,
  events = [],
  navigate,
}) {
  const fr = language === 'fr';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontalPad = Layout.screenPaddingHorizontal;
  const gap = Spacing.md;
  const toolWidth = (width - horizontalPad * 2 - gap) / 2;
  const eventCardWidth = Math.min(260, width * 0.68);

  const greeting = displayName
    ? fr
      ? `Salut ${displayName} !`
      : `Hi ${displayName}!`
    : fr
      ? 'Espace organisateur'
      : 'Organizer hub';

  const subtitle = fr
    ? 'Organise, développe, fais vivre tes événements.'
    : 'Plan, grow and run your events.';

  const avatarUri = profileImage ? normalizeMediaUrl(profileImage) : null;

  const upcoming = useMemo(() => {
    const now = Date.now();
    return (events || [])
      .filter((e) => e?.date)
      .filter((e) => {
        const t = new Date(e.date).getTime();
        return Number.isFinite(t) && t >= now - 12 * 60 * 60 * 1000;
      })
      .filter((e) => e.status !== 'FINISHED' && e.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 8);
  }, [events]);

  const eventsCount = (events || []).length;
  const ticketsSold = useMemo(
    () => (events || []).reduce((sum, e) => sum + (Number(e.sold) || 0), 0),
    [events],
  );
  const publishedCount = useMemo(
    () => (events || []).filter((e) => e.publishedOnFeed).length,
    [events],
  );

  const openPublicProfile = () => {
    if (!navigate || !bookerId) {
      onSelectSection('profil');
      return;
    }
    navigate('bookerProfile', { bookerId });
  };

  const openEvent = (event) => {
    if (!navigate || !event?.id) {
      onSelectSection('events');
      return;
    }
    navigate('eventDetail', { eventId: event.id });
  };

  const metaLine = [bookerTypeLabel(bookerType, fr), fr ? 'Événements' : 'Events', city]
    .filter(Boolean)
    .join(' • ');

  return (
    <ScrollView
      style={styles.hubScroll}
      contentContainerStyle={[
        styles.hubScrollContent,
        { paddingTop: (insets?.top ?? 0) + Spacing.sm },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hubTopRow}>
        <TouchableOpacity
          style={styles.hubTopAvatarWrap}
          onPress={openPublicProfile}
          activeOpacity={0.85}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.hubTopAvatar} />
          ) : (
            <View style={[styles.hubTopAvatar, styles.hubTopAvatarFallback]}>
              <Ionicons name="person" size={20} color={Colors.primary} />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.hubTopText}>
          <NoxText variant="title" style={styles.hubGreeting} numberOfLines={1}>
            {greeting}
          </NoxText>
          <NoxText variant="secondary" style={styles.hubSubtitle} numberOfLines={2}>
            {subtitle}
          </NoxText>
        </View>
        <TouchableOpacity
          style={styles.hubNotifBtn}
          onPress={onNotificationsPress}
          hitSlop={10}
          accessibilityRole="button"
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          {unreadCount > 0 ? (
            <View style={styles.hubNotifBadge}>
              <NotificationBadge count={unreadCount} />
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={styles.hubProfileCard}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.hubProfileBanner} blurRadius={8} />
        ) : (
          <View style={[styles.hubProfileBanner, styles.hubProfileBannerFallback]}>
            <Ionicons name="calendar-outline" size={36} color={Colors.primary} />
          </View>
        )}
        <View style={styles.hubProfileOverlay} />
        <View style={styles.hubOrgaBadge}>
          <Ionicons name="business-outline" size={12} color={Colors.text} />
          <NoxText style={styles.hubOrgaBadgeText}>
            {fr ? 'Profil organisateur' : 'Organizer profile'}
          </NoxText>
        </View>
        <TouchableOpacity style={styles.hubProfileViewBtn} onPress={openPublicProfile} activeOpacity={0.85}>
          <NoxText style={styles.hubProfileViewBtnText}>
            {fr ? 'Voir mon profil' : 'View my profile'}
          </NoxText>
          <Ionicons name="chevron-forward" size={14} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.hubProfileInfo}>
          <View style={styles.hubProfileNameRow}>
            <NoxText variant="title" style={styles.hubProfileName} numberOfLines={1}>
              {orgName || displayName || (fr ? 'Organisateur' : 'Organizer')}
            </NoxText>
            <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
          </View>
          {metaLine ? (
            <NoxText variant="secondary" style={styles.hubProfileMeta} numberOfLines={1}>
              {metaLine}
            </NoxText>
          ) : null}
          {city ? (
            <View style={styles.hubProfileLocRow}>
              <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
              <NoxText variant="secondary" style={styles.hubProfileLoc} numberOfLines={1}>
                {city}
              </NoxText>
            </View>
          ) : null}
          <View style={styles.hubProfileStats}>
            <View style={styles.hubProfileStat}>
              <NoxText style={styles.hubProfileStatValue}>{eventsCount || '—'}</NoxText>
              <NoxText variant="secondary" style={styles.hubProfileStatLabel}>
                {fr ? 'Événements organisés' : 'Events organized'}
              </NoxText>
            </View>
            <View style={styles.hubProfileStat}>
              <NoxText style={styles.hubProfileStatValue}>{formatCompact(ticketsSold)}</NoxText>
              <NoxText variant="secondary" style={styles.hubProfileStatLabel}>
                {fr ? 'Participants cumulés' : 'Total attendees'}
              </NoxText>
            </View>
            <View style={styles.hubProfileStat}>
              <NoxText style={styles.hubProfileStatValue}>{publishedCount || '—'}</NoxText>
              <NoxText variant="secondary" style={styles.hubProfileStatLabel}>
                {fr ? 'Sur le feed' : 'On the feed'}
              </NoxText>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.hubSectionHeader}>
        <NoxText variant="titleSecondary" style={styles.hubSectionTitleInline}>
          {fr ? 'Mes outils' : 'My tools'}
        </NoxText>
        <TouchableOpacity onPress={() => onSelectSection('events')} hitSlop={8}>
          <NoxText style={styles.hubSeeAll}>{fr ? 'Tout voir >' : 'See all >'}</NoxText>
        </TouchableOpacity>
      </View>
      <View style={styles.hubGrid}>
        {tiles.map((tile, index) => {
          const isLeftColumn = index % 2 === 0;
          return (
            <TouchableOpacity
              key={tile.id}
              style={[
                styles.hubToolCard,
                {
                  width: toolWidth,
                  marginRight: isLeftColumn ? gap : 0,
                },
              ]}
              onPress={() => onSelectSection(tile.id)}
              activeOpacity={0.85}
            >
              <View style={styles.hubToolRow}>
                <View style={[styles.hubTileIconWrap, { backgroundColor: tile.accentBg }]}>
                  <Ionicons name={tile.icon} size={22} color={tile.accentColor} />
                  {tile.id === 'events' && unreadCount > 0 ? (
                    <View style={styles.hubTileBadge}>
                      <NotificationBadge count={unreadCount} />
                    </View>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
              </View>
              <NoxText variant="buttonSecondary" style={styles.hubTileLabel} numberOfLines={1}>
                {tile.label}
              </NoxText>
              {tile.hint ? (
                <NoxText variant="secondary" style={styles.hubTileHint} numberOfLines={1}>
                  {tile.hint}
                </NoxText>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.hubSectionHeader}>
        <NoxText variant="titleSecondary" style={styles.hubSectionTitleInline}>
          {fr ? 'Mes prochains événements' : 'Upcoming events'}
        </NoxText>
        <TouchableOpacity onPress={() => onSelectSection('events')} hitSlop={8}>
          <NoxText style={styles.hubSeeAll}>{fr ? 'Tout voir >' : 'See all >'}</NoxText>
        </TouchableOpacity>
      </View>
      {upcoming.length === 0 ? (
        <View style={styles.hubEmptyEvents}>
          <NoxText variant="secondary" style={styles.hubEmptyEventsText}>
            {fr
              ? 'Aucun événement à venir. Crée-en un depuis Mes outils.'
              : 'No upcoming events. Create one from My tools.'}
          </NoxText>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hubEventsScroll}
        >
          {upcoming.map((event) => {
            const badge = formatEventBadge(event.date, language);
            const venueLine =
              event.venue?.venueName || event.location || (fr ? 'Lieu à confirmer' : 'Venue TBD');
            const cap =
              event.capacity != null
                ? `${event.sold ?? 0} / ${event.capacity}`
                : event.sold != null
                  ? String(event.sold)
                  : null;
            const published = !!event.publishedOnFeed;
            const imageUri = event.image ? normalizeMediaUrl(event.image) : null;
            return (
              <TouchableOpacity
                key={event.id}
                style={[styles.hubEventCard, { width: eventCardWidth }]}
                onPress={() => openEvent(event)}
                activeOpacity={0.9}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.hubEventImage} />
                ) : (
                  <View style={styles.hubEventImageFallback}>
                    <Ionicons name="calendar-outline" size={28} color={Colors.primary} />
                  </View>
                )}
                <View style={styles.hubEventOverlay} />
                {badge ? (
                  <View style={styles.hubEventBadge}>
                    <NoxText style={styles.hubEventBadgeText}>{badge}</NoxText>
                  </View>
                ) : null}
                <View style={styles.hubEventBottom}>
                  <View style={{ flex: 1 }}>
                    <NoxText style={styles.hubEventTitle} numberOfLines={1}>
                      {event.title || (fr ? 'Événement' : 'Event')}
                    </NoxText>
                    <View style={styles.hubProfileLocRow}>
                      <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                      <NoxText variant="secondary" style={styles.hubEventLoc} numberOfLines={1}>
                        {venueLine}
                      </NoxText>
                    </View>
                    <View style={styles.hubEventMetaRow}>
                      {cap ? (
                        <View style={styles.hubProfileLocRow}>
                          <Ionicons name="people-outline" size={12} color={Colors.textSecondary} />
                          <NoxText variant="secondary" style={styles.hubEventCap}>
                            {cap}
                          </NoxText>
                        </View>
                      ) : null}
                      <View
                        style={[
                          styles.hubEventStatus,
                          published ? styles.hubEventStatusPublished : styles.hubEventStatusDraft,
                        ]}
                      >
                        <NoxText
                          style={[
                            styles.hubEventStatusText,
                            published ? styles.hubEventStatusTextPublished : styles.hubEventStatusTextDraft,
                          ]}
                        >
                          {published ? (fr ? 'Publié' : 'Published') : fr ? 'Brouillon' : 'Draft'}
                        </NoxText>
                      </View>
                    </View>
                  </View>
                  <View style={styles.hubEventArrow}>
                    <Ionicons name="arrow-forward" size={16} color={Colors.text} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.hubSectionHeader}>
        <NoxText variant="titleSecondary" style={styles.hubSectionTitleInline}>
          {fr ? 'Statistiques' : 'Statistics'}
        </NoxText>
        <NoxText variant="secondary" style={styles.hubStatsPeriod}>
          {fr ? 'Aperçu' : 'Overview'}
        </NoxText>
      </View>
      <View style={styles.hubStatsGrid}>
        <View style={[styles.hubStatCard, { width: toolWidth, marginRight: gap }]}>
          <Ionicons name="people-outline" size={18} color={Colors.primaryLight} />
          <NoxText style={styles.hubStatValue}>{formatCompact(ticketsSold)}</NoxText>
          <NoxText variant="secondary" style={styles.hubStatLabel}>
            {fr ? 'Places vendues' : 'Tickets sold'}
          </NoxText>
        </View>
        <View style={[styles.hubStatCard, { width: toolWidth }]}>
          <Ionicons name="calendar-outline" size={18} color="#34D399" />
          <NoxText style={styles.hubStatValue}>{eventsCount}</NoxText>
          <NoxText variant="secondary" style={styles.hubStatLabel}>
            {fr ? 'Événements' : 'Events'}
          </NoxText>
        </View>
        <View style={[styles.hubStatCard, { width: toolWidth, marginRight: gap, marginTop: gap }]}>
          <Ionicons name="newspaper-outline" size={18} color="#F472B6" />
          <NoxText style={styles.hubStatValue}>{publishedCount}</NoxText>
          <NoxText variant="secondary" style={styles.hubStatLabel}>
            {fr ? 'Sur le feed' : 'On the feed'}
          </NoxText>
        </View>
        <View style={[styles.hubStatCard, { width: toolWidth, marginTop: gap }]}>
          <Ionicons name="chatbubbles-outline" size={18} color="#FBBF24" />
          <NoxText style={styles.hubStatValue}>{unreadCount || '—'}</NoxText>
          <NoxText variant="secondary" style={styles.hubStatLabel}>
            {fr ? 'Messages non lus' : 'Unread messages'}
          </NoxText>
        </View>
      </View>
    </ScrollView>
  );
}
