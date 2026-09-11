import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NoxText from '../nox/NoxText';
import NotificationBadge from '../NotificationBadge';
import Colors from '../../constants/colors';
import { Layout, Spacing } from '../../constants/theme';
import { normalizeMediaUrl } from '../../api/config';
import { isAcceptedBooking, isPendingBooking } from '../../utils/lieuxEventUtils';

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

function venueTypeLabel(type, fr) {
  const map = {
    CLUB: 'Club',
    Club: 'Club',
    BAR: 'Bar',
    Bar: 'Bar',
    SALLE: fr ? 'Salle' : 'Hall',
    FESTIVAL: 'Festival',
    OUTDOOR: fr ? 'Extérieur' : 'Outdoor',
  };
  return map[type] || type || (fr ? 'Lieu' : 'Venue');
}

export default function LieuxDashboardHomeSection({
  language,
  styles,
  tiles,
  onSelectTool,
  pendingCount = 0,
  displayName,
  venueName,
  venueType,
  city,
  country,
  bannerImage,
  profileImage,
  averageRating,
  venueId,
  bookings = [],
  realizedCount = 0,
  navigate,
  refreshing = false,
  onRefresh,
}) {
  const fr = language === 'fr';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontalPad = Layout.screenPaddingHorizontal;
  const gap = Spacing.md;
  const toolWidth = (width - horizontalPad * 2 - gap) / 2;
  const eventCardWidth = Math.min(260, width * 0.68);

  const greeting = displayName || venueName
    ? fr
      ? `Salut ${displayName || venueName} !`
      : `Hi ${displayName || venueName}!`
    : fr
      ? 'Espace lieu'
      : 'Venue hub';

  const subtitle = fr
    ? 'Gère ton lieu, tes événements et ta communauté.'
    : 'Manage your venue, events and community.';

  const bannerUri = bannerImage ? normalizeMediaUrl(bannerImage) : null;
  const avatarUri = profileImage ? normalizeMediaUrl(profileImage) : null;
  const heroUri = bannerUri || avatarUri;

  const upcoming = useMemo(() => {
    const now = Date.now() - 12 * 60 * 60 * 1000;
    return (bookings || [])
      .filter((b) => b?.eventDate && (isAcceptedBooking(b) || isPendingBooking(b)))
      .filter((b) => {
        const t = new Date(b.eventDate).getTime();
        return Number.isFinite(t) && t >= now;
      })
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
      .slice(0, 8);
  }, [bookings]);

  const ticketsSold = useMemo(
    () => (bookings || []).reduce((sum, b) => sum + (Number(b.eventSold) || 0), 0),
    [bookings],
  );

  const ratingLabel =
    averageRating != null && Number(averageRating) > 0
      ? Number(averageRating).toFixed(1)
      : '—';

  const cityLine = [city, country].filter(Boolean).join(', ');
  const metaLine = [venueTypeLabel(venueType, fr), fr ? 'Événements' : 'Events', city]
    .filter(Boolean)
    .join(' • ');

  const openPublicProfile = () => {
    if (!navigate) return;
    if (venueId) {
      navigate('venueProfile', { venueId });
      return;
    }
    navigate('lieuxProfil');
  };

  const openEvent = (booking) => {
    const eventVenueId = booking?.eventVenueId || booking?.id;
    if (!navigate || !eventVenueId) {
      onSelectTool('planning');
      return;
    }
    const pending = isPendingBooking(booking);
    navigate(pending ? 'lieuxRequestDetail' : 'lieuxEventDetail', { eventVenueId });
  };

  return (
    <ScrollView
      style={styles.hubScroll}
      contentContainerStyle={[
        styles.hubScrollContent,
        { paddingTop: (insets?.top ?? 0) + Spacing.sm, paddingBottom: 140 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        ) : undefined
      }
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
              <Ionicons name="business" size={20} color={Colors.primary} />
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
          onPress={() => navigate?.('lieuxNotifications')}
          hitSlop={10}
          accessibilityRole="button"
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          {pendingCount > 0 ? (
            <View style={styles.hubNotifBadge}>
              <NotificationBadge count={pendingCount} />
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={styles.hubProfileCard}>
        {heroUri ? (
          <Image source={{ uri: heroUri }} style={styles.hubProfileBanner} />
        ) : (
          <View style={[styles.hubProfileBanner, styles.hubProfileBannerFallback]}>
            <Ionicons name="business-outline" size={36} color={Colors.primary} />
          </View>
        )}
        <View style={styles.hubProfileOverlay} />
        <View style={styles.hubVenueBadge}>
          <Ionicons name="business-outline" size={12} color={Colors.text} />
          <NoxText style={styles.hubVenueBadgeText}>
            {fr ? 'Profil lieu' : 'Venue profile'}
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
              {venueName || displayName || (fr ? 'Mon lieu' : 'My venue')}
            </NoxText>
            <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
          </View>
          {metaLine ? (
            <NoxText variant="secondary" style={styles.hubProfileMeta} numberOfLines={1}>
              {metaLine}
            </NoxText>
          ) : null}
          {cityLine ? (
            <View style={styles.hubProfileLocRow}>
              <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
              <NoxText variant="secondary" style={styles.hubProfileLoc} numberOfLines={1}>
                {cityLine}
              </NoxText>
            </View>
          ) : null}
          <View style={styles.hubProfileStats}>
            <View style={styles.hubProfileStat}>
              <NoxText style={styles.hubProfileStatValue}>{realizedCount || '—'}</NoxText>
              <NoxText variant="secondary" style={styles.hubProfileStatLabel}>
                {fr ? 'Événements accueillis' : 'Events hosted'}
              </NoxText>
            </View>
            <View style={styles.hubProfileStat}>
              <NoxText style={styles.hubProfileStatValue}>
                {ratingLabel === '—' ? '—' : `${ratingLabel} ★`}
              </NoxText>
              <NoxText variant="secondary" style={styles.hubProfileStatLabel}>
                {fr ? 'Note moyenne' : 'Avg. rating'}
              </NoxText>
            </View>
            <View style={styles.hubProfileStat}>
              <NoxText style={styles.hubProfileStatValue}>{formatCompact(ticketsSold)}</NoxText>
              <NoxText variant="secondary" style={styles.hubProfileStatLabel}>
                {fr ? 'Places vendues' : 'Tickets sold'}
              </NoxText>
            </View>
          </View>
        </View>
      </View>

      {pendingCount > 0 ? (
        <TouchableOpacity
          style={styles.hubPendingBanner}
          onPress={() => onSelectTool('artistes')}
          activeOpacity={0.85}
        >
          <View style={styles.hubPendingLeft}>
            <Ionicons name="mail-unread-outline" size={18} color={Colors.text} />
            <NoxText style={styles.hubPendingLabel}>
              {fr
                ? `Demandes en attente (${pendingCount})`
                : `Pending requests (${pendingCount})`}
            </NoxText>
          </View>
          <NoxText style={styles.hubPendingLink}>{fr ? 'Voir' : 'View'}</NoxText>
        </TouchableOpacity>
      ) : null}

      <View style={styles.hubSectionHeader}>
        <NoxText variant="titleSecondary" style={styles.hubSectionTitleInline}>
          {fr ? 'Mes outils' : 'My tools'}
        </NoxText>
        <TouchableOpacity onPress={() => onSelectTool('planning')} hitSlop={8}>
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
              onPress={() => onSelectTool(tile.id)}
              activeOpacity={0.85}
            >
              <View style={styles.hubToolRow}>
                <View style={[styles.hubTileIconWrap, { backgroundColor: tile.accentBg }]}>
                  <Ionicons name={tile.icon} size={22} color={tile.accentColor} />
                  {tile.id === 'artistes' && pendingCount > 0 ? (
                    <View style={styles.hubTileBadge}>
                      <NotificationBadge count={pendingCount} />
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
          {fr ? 'Prochains événements' : 'Upcoming events'}
        </NoxText>
        <TouchableOpacity onPress={() => onSelectTool('planning')} hitSlop={8}>
          <NoxText style={styles.hubSeeAll}>{fr ? 'Voir plus >' : 'See more >'}</NoxText>
        </TouchableOpacity>
      </View>
      {upcoming.length === 0 ? (
        <View style={styles.hubEmptyEvents}>
          <NoxText variant="secondary" style={styles.hubEmptyEventsText}>
            {fr
              ? 'Aucun événement à venir. Les demandes apparaîtront ici.'
              : 'No upcoming events. Incoming requests will show here.'}
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
              booking.eventLocation ||
              venueName ||
              (fr ? 'Lieu' : 'Venue');
            const cap =
              booking.eventCapacity != null
                ? `${booking.eventSold ?? 0} / ${booking.eventCapacity}`
                : booking.eventSold != null
                  ? String(booking.eventSold)
                  : null;
            const pending = isPendingBooking(booking);
            const published = !pending && isAcceptedBooking(booking);
            const imageUri = booking.eventImage ? normalizeMediaUrl(booking.eventImage) : null;
            const key = booking.eventVenueId || booking.id;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.hubEventCard, { width: eventCardWidth }]}
                onPress={() => openEvent(booking)}
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
                      {booking.eventTitle || (fr ? 'Événement' : 'Event')}
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
                          pending
                            ? styles.hubEventStatusDraft
                            : published
                              ? styles.hubEventStatusPublished
                              : styles.hubEventStatusDraft,
                        ]}
                      >
                        <NoxText
                          style={[
                            styles.hubEventStatusText,
                            pending
                              ? styles.hubEventStatusTextDraft
                              : styles.hubEventStatusTextPublished,
                          ]}
                        >
                          {pending
                            ? fr
                              ? 'Demande'
                              : 'Request'
                            : fr
                              ? 'Confirmé'
                              : 'Confirmed'}
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
          <Ionicons name="calendar-outline" size={18} color={Colors.primaryLight} />
          <NoxText style={styles.hubStatValue}>{realizedCount || '—'}</NoxText>
          <NoxText variant="secondary" style={styles.hubStatLabel}>
            {fr ? 'Events réalisés' : 'Events hosted'}
          </NoxText>
        </View>
        <View style={[styles.hubStatCard, { width: toolWidth }]}>
          <Ionicons name="ticket-outline" size={18} color="#F472B6" />
          <NoxText style={styles.hubStatValue}>{formatCompact(ticketsSold)}</NoxText>
          <NoxText variant="secondary" style={styles.hubStatLabel}>
            {fr ? 'Places vendues' : 'Tickets sold'}
          </NoxText>
        </View>
        <View style={[styles.hubStatCard, { width: toolWidth, marginRight: gap, marginTop: gap }]}>
          <Ionicons name="star-outline" size={18} color="#FBBF24" />
          <NoxText style={styles.hubStatValue}>{ratingLabel}</NoxText>
          <NoxText variant="secondary" style={styles.hubStatLabel}>
            {fr ? 'Note moyenne' : 'Avg. rating'}
          </NoxText>
        </View>
        <View style={[styles.hubStatCard, { width: toolWidth, marginTop: gap }]}>
          <Ionicons name="mail-unread-outline" size={18} color="#34D399" />
          <NoxText style={styles.hubStatValue}>{pendingCount || '—'}</NoxText>
          <NoxText variant="secondary" style={styles.hubStatLabel}>
            {fr ? 'Demandes en attente' : 'Pending requests'}
          </NoxText>
        </View>
      </View>
    </ScrollView>
  );
}
