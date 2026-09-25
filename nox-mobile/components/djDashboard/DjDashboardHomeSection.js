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

export default function DjDashboardHomeSection({
  language,
  styles,
  tiles,
  onSelectSection,
  unreadCount = 0,
  onNotificationsPress,
  displayName,
  artistName,
  genre,
  city,
  bannerImage,
  profileImage,
  averageRating,
  bookings = [],
  navigate,
  userId,
  djId,
}) {
  const fr = language === 'fr';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontalPad = Layout.screenPaddingHorizontal;
  const gap = Spacing.md;
  const toolWidth = (width - horizontalPad * 2 - gap) / 2;
  const eventCardWidth = Math.min(260, width * 0.68);

  const greeting = displayName || artistName
    ? fr
      ? `Salut ${displayName || artistName} !`
      : `Hi ${displayName || artistName}!`
    : fr
      ? 'Ton espace pro'
      : 'Your pro hub';

  const subtitle = fr
    ? 'Gère ton profil, tes bookings et ta visibilité.'
    : 'Manage your profile, bookings and visibility.';

  const bannerUri = bannerImage ? normalizeMediaUrl(bannerImage) : null;
  const avatarUri = profileImage ? normalizeMediaUrl(profileImage) : null;

  const upcoming = useMemo(() => {
    const now = Date.now();
    return (bookings || [])
      .filter((b) => b.invitationStatus === 'ACCEPTED' && b.eventDate)
      .filter((b) => {
        const t = new Date(b.eventDate).getTime();
        return Number.isFinite(t) && t >= now - 12 * 60 * 60 * 1000;
      })
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
      .slice(0, 8);
  }, [bookings]);

  const pendingCount = useMemo(
    () => (bookings || []).filter((b) => b.invitationStatus === 'PENDING').length,
    [bookings],
  );

  const eventsCount = useMemo(
    () => (bookings || []).filter((b) => b.invitationStatus === 'ACCEPTED').length,
    [bookings],
  );

  const ratingLabel =
    averageRating != null && Number(averageRating) > 0
      ? Number(averageRating).toFixed(1)
      : '—';

  const openPublicProfile = () => {
    if (!navigate) return;
    navigate('djProfile', {
      djId: djId || undefined,
      djUserId: userId || undefined,
    });
  };

  const openEvent = (booking) => {
    if (!navigate || !booking?.eventId) {
      onSelectSection('bookings');
      return;
    }
    navigate('eventDetail', { eventId: booking.eventId });
  };

  return (
    <ScrollView
      style={styles.hubScroll}
      contentContainerStyle={[
        styles.hubScrollContent,
        { paddingTop: (insets?.top ?? 0) + Spacing.sm },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top : avatar + salutation + cloche */}
      <View style={styles.hubTopRow}>
        <TouchableOpacity
          style={styles.hubTopAvatarWrap}
          onPress={openPublicProfile}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={fr ? 'Voir mon profil' : 'View my profile'}
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
          accessibilityLabel={fr ? 'Notifications' : 'Notifications'}
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          {unreadCount > 0 ? (
            <View style={styles.hubNotifBadge}>
              <NotificationBadge count={unreadCount} />
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Carte profil hero */}
      <View style={styles.hubProfileCard}>
        {bannerUri ? (
          <Image source={{ uri: bannerUri }} style={styles.hubProfileBanner} />
        ) : (
          <View style={[styles.hubProfileBanner, styles.hubProfileBannerFallback]}>
            <Ionicons name="musical-notes-outline" size={36} color={Colors.primary} />
          </View>
        )}
        <View style={styles.hubProfileOverlay} />
        <TouchableOpacity
          style={styles.hubProfileViewBtn}
          onPress={openPublicProfile}
          activeOpacity={0.85}
        >
          <NoxText style={styles.hubProfileViewBtnText}>
            {fr ? 'Voir mon profil' : 'View my profile'}
          </NoxText>
          <Ionicons name="chevron-forward" size={14} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.hubProfileInfo}>
          <View style={styles.hubProfileNameRow}>
            <NoxText variant="title" style={styles.hubProfileName} numberOfLines={1}>
              {artistName || displayName || 'DJ'}
            </NoxText>
            <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
          </View>
          {genre ? (
            <NoxText variant="secondary" style={styles.hubProfileMeta} numberOfLines={1}>
              {genre}
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
              <NoxText style={styles.hubProfileStatValue}>{formatCompact(eventsCount)}</NoxText>
              <NoxText variant="secondary" style={styles.hubProfileStatLabel}>
                {fr ? 'Événements' : 'Events'}
              </NoxText>
            </View>
            <View style={styles.hubProfileStat}>
              <NoxText style={styles.hubProfileStatValue}>{ratingLabel}</NoxText>
              <NoxText variant="secondary" style={styles.hubProfileStatLabel}>
                {fr ? 'Note moyenne' : 'Avg rating'}
              </NoxText>
            </View>
            <View style={styles.hubProfileStat}>
              <NoxText style={styles.hubProfileStatValue}>{pendingCount || '—'}</NoxText>
              <NoxText variant="secondary" style={styles.hubProfileStatLabel}>
                {fr ? 'Demandes' : 'Requests'}
              </NoxText>
            </View>
          </View>
        </View>
      </View>

      {/* Mes outils */}
      <NoxText variant="titleSecondary" style={styles.hubSectionTitle}>
        {fr ? 'Mes outils' : 'My tools'}
      </NoxText>
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
                  {tile.id === 'bookings' && unreadCount > 0 ? (
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

      {/* Prochains événements */}
      <View style={styles.hubSectionHeader}>
        <NoxText variant="titleSecondary" style={styles.hubSectionTitleInline}>
          {fr ? 'Prochains événements' : 'Upcoming events'}
        </NoxText>
        <TouchableOpacity onPress={() => onSelectSection('bookings')} hitSlop={8}>
          <NoxText style={styles.hubSeeAll}>{fr ? 'Tout voir >' : 'See all >'}</NoxText>
        </TouchableOpacity>
      </View>
      {upcoming.length === 0 ? (
        <View style={styles.hubEmptyEvents}>
          <NoxText variant="secondary" style={styles.hubEmptyEventsText}>
            {fr
              ? 'Aucun booking à venir. Les invitations acceptées apparaîtront ici.'
              : 'No upcoming bookings. Accepted invites will show here.'}
          </NoxText>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hubEventsScroll}
        >
          {upcoming.map((booking) => {
            const badge = formatEventBadge(booking.eventDate, language);
            const venueLine =
              booking.venue?.name ||
              booking.eventLocation ||
              (fr ? 'Lieu à confirmer' : 'Venue TBD');
            return (
              <TouchableOpacity
                key={booking.id}
                style={[styles.hubEventCard, { width: eventCardWidth }]}
                onPress={() => openEvent(booking)}
                activeOpacity={0.9}
              >
                <View style={styles.hubEventImageFallback}>
                  <Ionicons name="calendar-outline" size={28} color={Colors.primary} />
                </View>
                <View style={styles.hubEventOverlay} />
                {badge ? (
                  <View style={styles.hubEventBadge}>
                    <NoxText style={styles.hubEventBadgeText}>{badge}</NoxText>
                  </View>
                ) : null}
                <View style={styles.hubEventBottom}>
                  <View style={{ flex: 1 }}>
                    <NoxText style={styles.hubEventTitle} numberOfLines={1}>
                      {booking.eventTitle || (fr ? 'Événement' : 'Event')}
                    </NoxText>
                    <View style={styles.hubProfileLocRow}>
                      <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                      <NoxText variant="secondary" style={styles.hubEventLoc} numberOfLines={1}>
                        {venueLine}
                      </NoxText>
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

      {/* Statistiques (données réelles, sans faux % tendances) */}
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
          <Ionicons name="calendar-outline" size={18} color={Colors.primaryLight} />
          <NoxText style={styles.hubStatValue}>{pendingCount}</NoxText>
          <NoxText variant="secondary" style={styles.hubStatLabel}>
            {fr ? 'Demandes de booking' : 'Booking requests'}
          </NoxText>
        </View>
        <View style={[styles.hubStatCard, { width: toolWidth }]}>
          <Ionicons name="checkmark-done-outline" size={18} color="#34D399" />
          <NoxText style={styles.hubStatValue}>{eventsCount}</NoxText>
          <NoxText variant="secondary" style={styles.hubStatLabel}>
            {fr ? 'Bookings acceptés' : 'Accepted bookings'}
          </NoxText>
        </View>
        <View style={[styles.hubStatCard, { width: toolWidth, marginRight: gap, marginTop: gap }]}>
          <Ionicons name="star" size={18} color="#FCD34D" />
          <NoxText style={styles.hubStatValue}>{ratingLabel}</NoxText>
          <NoxText variant="secondary" style={styles.hubStatLabel}>
            {fr ? 'Note moyenne' : 'Avg rating'}
          </NoxText>
        </View>
        <View style={[styles.hubStatCard, { width: toolWidth, marginTop: gap }]}>
          <Ionicons name="chatbubbles-outline" size={18} color="#F472B6" />
          <NoxText style={styles.hubStatValue}>{unreadCount || '—'}</NoxText>
          <NoxText variant="secondary" style={styles.hubStatLabel}>
            {fr ? 'Messages non lus' : 'Unread messages'}
          </NoxText>
        </View>
      </View>
    </ScrollView>
  );
}
