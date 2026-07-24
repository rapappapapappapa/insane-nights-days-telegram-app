import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeMediaUrl } from '../../api/config';
import { useLieuxData } from '../../hooks/useLieuxData';
import { NoxText, NoxCard, NoxLieuxBottomNav } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { formatEventDateLabel, mapBookingStatusLabel } from '../../utils/noxDiscoverUtils';
import {
  getDashboardEventRows,
  getLastPastEvent,
  formatFillRate,
} from '../../utils/lieuxDashboardUtils';
import { isAcceptedBooking } from '../../utils/lieuxEventUtils';

function EventThumb({ uri, broken, onError }) {
  const normalized = uri ? normalizeMediaUrl(uri) : null;
  return (
    <View style={styles.thumb}>
      {normalized && !broken ? (
        <Image source={{ uri: normalized }} style={styles.thumbImage} onError={onError} />
      ) : (
        <Ionicons name="image-outline" size={20} color={primaryAlpha(0.6)} />
      )}
    </View>
  );
}

export default function LieuxDashboardPage() {
  const { navigate, routeParams } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const fr = language === 'fr';

  const {
    loading,
    refreshing,
    venueProfile,
    bookings,
    pendingBookings,
    refresh,
  } = useLieuxData(user?.token, language);

  const dashboardEvents = useMemo(() => getDashboardEventRows(bookings, 5), [bookings]);
  const lastPastEvent = useMemo(() => getLastPastEvent(bookings), [bookings]);
  const lastFillRate = useMemo(
    () => formatFillRate(lastPastEvent?.eventSold, lastPastEvent?.eventCapacity),
    [lastPastEvent],
  );

  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    if (routeParams?.openBookings) {
      navigate('lieuxAvailability', { focusPending: true });
    }
  }, [routeParams?.openBookings, navigate]);

  const openPendingList = () => {
    navigate('lieuxAvailability', { focusPending: true });
  };

  const greetingName = venueProfile?.venueName || (fr ? 'Lieu' : 'Venue');
  const cityLabel = [venueProfile?.city, venueProfile?.country].filter(Boolean).join(', ');

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              {venueProfile?.profileImage && !brokenImages.profile ? (
                <Image
                  source={{ uri: normalizeMediaUrl(venueProfile.profileImage) }}
                  style={styles.avatarImage}
                  onError={() => setBrokenImages((p) => ({ ...p, profile: true }))}
                />
              ) : null}
            </View>
            <View>
              <NoxText variant="titleSecondary" style={styles.greeting}>
                Hello {greetingName} !
              </NoxText>
              <NoxText variant="secondary">{cityLabel || venueProfile?.address || ''}</NoxText>
            </View>
          </View>
          <TouchableOpacity style={styles.bell} onPress={() => navigate('lieuxNotifications')} hitSlop={10}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
            {pendingBookings.length > 0 ? <View style={styles.bellDot} /> : null}
          </TouchableOpacity>
        </View>

        {pendingBookings.length > 0 ? (
          <TouchableOpacity
            style={styles.pending}
            activeOpacity={0.85}
              onPress={openPendingList}
          >
            <NoxText variant="button" style={styles.pendingLabel}>
              {fr ? 'Demandes en attente' : 'Pending requests'} ({pendingBookings.length})
            </NoxText>
            <NoxText variant="secondary" style={styles.pendingHint}>
              {fr ? 'Voir tout' : 'See all'}
            </NoxText>
          </TouchableOpacity>
        ) : null}

        <View style={styles.section}>
          <NoxText variant="titleSecondary" style={styles.sectionTitle}>
            {fr ? 'Actions rapides' : 'Quick actions'}
          </NoxText>
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickCard}
              activeOpacity={0.85}
              onPress={() => navigate('lieuxAvailability')}
            >
              <View style={styles.quickIcon}>
                <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
              </View>
              <NoxText variant="secondary" style={styles.quickLabel}>
                {fr ? 'Disponibilités' : 'Availability'}
              </NoxText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} activeOpacity={0.85} onPress={() => navigate('lieuxScanner')}>
              <View style={styles.quickIcon}>
                <Ionicons name="qr-code-outline" size={22} color={Colors.primary} />
              </View>
              <NoxText variant="secondary" style={styles.quickLabel}>
                {fr ? 'Scanner billets' : 'Scan tickets'}
              </NoxText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <NoxText variant="titleSecondary" style={styles.sectionTitle}>
              {fr ? 'Événements à venir' : 'Upcoming events'}
            </NoxText>
            <TouchableOpacity onPress={() => navigate('lieuxEvents')}>
              <NoxText variant="secondary" style={styles.link}>
                {fr ? 'Voir plus' : 'See more'}
              </NoxText>
            </TouchableOpacity>
          </View>

          {dashboardEvents.length === 0 ? (
            <NoxText variant="secondary">{fr ? 'Aucun événement à afficher.' : 'No events to show.'}</NoxText>
          ) : (
            dashboardEvents.map(({ booking, status }) => {
              const eventVenueId = booking.eventVenueId || booking.id;
              const pending = String(status || '').toUpperCase() === 'PENDING';
              return (
                <TouchableOpacity
                  key={eventVenueId}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigate(pending ? 'lieuxRequestDetail' : 'lieuxEventDetail', { eventVenueId })
                  }
                >
                  <NoxCard style={styles.eventCard} padded={false}>
                    <EventThumb
                      uri={null}
                      broken={brokenImages[`ev-${eventVenueId}`]}
                      onError={() => setBrokenImages((p) => ({ ...p, [`ev-${eventVenueId}`]: true }))}
                    />
                    <View style={styles.eventInfo}>
                      <NoxText variant="form" style={styles.eventName}>
                        {booking.eventTitle}
                      </NoxText>
                      <NoxText variant="secondary">
                        {formatEventDateLabel(booking.eventDate, language, { shortMonth: true, withYear: true })}
                        {booking.eventLocation ? ` • ${booking.eventLocation}` : ''}
                      </NoxText>
                      {booking.eventGenre ? (
                        <NoxText variant="secondary" style={styles.genreTag}>
                          {String(booking.eventGenre).toUpperCase()}
                        </NoxText>
                      ) : null}
                      <View style={[styles.statusPill, pending && styles.statusPillPending]}>
                        <NoxText variant="secondary" style={styles.statusPillText}>
                          {mapBookingStatusLabel(status, language)}
                        </NoxText>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                  </NoxCard>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {lastPastEvent ? (
          <View style={styles.section}>
            <NoxText variant="titleSecondary" style={styles.sectionTitle}>
              {fr ? 'Statistiques du dernier événement' : 'Last event statistics'}
            </NoxText>
            <NoxText variant="secondary" style={styles.lastEventName}>
              {lastPastEvent.eventTitle}
            </NoxText>
            <View style={styles.statRingRow}>
              <View style={styles.statRing}>
                <NoxText variant="titleSecondary" style={styles.ringValue}>
                  {lastPastEvent.eventSold ?? '—'}
                </NoxText>
                <NoxText variant="secondary" style={styles.ringLabel}>
                  {fr ? 'Billets vendus' : 'Tickets sold'}
                </NoxText>
              </View>
              <View style={styles.statRing}>
                <NoxText variant="titleSecondary" style={styles.ringValue}>
                  {lastFillRate != null ? `${lastFillRate}%` : '—'}
                </NoxText>
                <NoxText variant="secondary" style={styles.ringLabel}>
                  {fr ? 'Remplissage' : 'Fill rate'}
                </NoxText>
              </View>
              <View style={styles.statRing}>
                <NoxText variant="titleSecondary" style={styles.ringValue}>
                  {lastPastEvent.paymentAmount
                    ? `${Math.round(lastPastEvent.paymentAmount)}€`
                    : '—'}
                </NoxText>
                <NoxText variant="secondary" style={styles.ringLabel}>
                  {fr ? 'Budget' : 'Budget'}
                </NoxText>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <NoxText variant="titleSecondary" style={styles.sectionTitle}>
            {fr ? 'Mon lieu' : 'My venue'}
          </NoxText>
          <View style={styles.statRow}>
            <NoxCard style={styles.statCard}>
              <Ionicons name="people-outline" size={20} color={Colors.primary} />
              <NoxText variant="title" style={styles.statValue}>
                {venueProfile?.maxCapacity ?? '—'}
              </NoxText>
              <NoxText variant="secondary">{fr ? 'Capacité max.' : 'Max capacity'}</NoxText>
            </NoxCard>
            <NoxCard style={styles.statCard}>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              <NoxText variant="title" style={styles.statValue}>
                {dashboardEvents.filter((r) => isAcceptedBooking(r.booking)).length}
              </NoxText>
              <NoxText variant="secondary">{fr ? 'Confirmés' : 'Confirmed'}</NoxText>
            </NoxCard>
          </View>
        </View>
      </ScrollView>

      <NoxLieuxBottomNav active="home" navigate={navigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  greeting: { fontSize: 18 },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  pending: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.button,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pendingLabel: { color: '#000' },
  pendingHint: { color: 'rgba(0,0,0,0.6)', marginTop: 2 },
  section: { paddingHorizontal: Spacing.xl, marginTop: Spacing.xxl },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 17, marginBottom: Spacing.md },
  link: { color: Colors.primary, marginBottom: Spacing.md },
  quickRow: { flexDirection: 'row', gap: Spacing.md },
  quickCard: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { color: Colors.text, textAlign: 'center' },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  eventInfo: { flex: 1 },
  eventName: { fontWeight: '700', marginBottom: 2 },
  genreTag: { fontSize: 10, marginTop: 2, color: Colors.primary },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: primaryAlpha(0.15),
  },
  statusPillPending: { backgroundColor: 'rgba(245,158,11,0.2)' },
  statusPillText: { fontSize: 11, color: Colors.primary },
  lastEventName: { marginBottom: Spacing.md },
  statRingRow: { flexDirection: 'row', gap: Spacing.md },
  statRing: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.card,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  ringValue: { fontSize: 20, marginBottom: 4 },
  ringLabel: { fontSize: 10, textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: { flex: 1, alignItems: 'flex-start', gap: Spacing.xs },
  statValue: { fontSize: 22 },
});
