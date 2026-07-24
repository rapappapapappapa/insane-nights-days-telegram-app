import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLieuxData } from '../../hooks/useLieuxData';
import { NoxText, NoxCard, NoxTabs, NoxLieuxBottomNav, NoxButton } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { formatEventDateLabel, mapBookingStatusLabel } from '../../utils/noxDiscoverUtils';
import { categorizeVenueBookings, isPendingBooking } from '../../utils/lieuxEventUtils';

function EventCard({ booking, fr, language, onDetails, onChat }) {
  const pending = isPendingBooking(booking);
  const status =
    pending
      ? mapBookingStatusLabel(booking.invitationStatus, language)
      : booking.eventStatus === 'FINISHED'
        ? fr
          ? 'Terminé'
          : 'Finished'
        : booking.eventStatus === 'DRAFT'
          ? fr
            ? 'Brouillon orga'
            : 'Organizer draft'
          : mapBookingStatusLabel(booking.invitationStatus, language);

  return (
    <NoxCard style={styles.eventCard} padded={false}>
      <View style={styles.thumb}>
        <Ionicons name="calendar-outline" size={22} color={primaryAlpha(0.7)} />
      </View>
      <View style={styles.eventBody}>
        <NoxText variant="form" style={styles.eventTitle} numberOfLines={2}>
          {booking.eventTitle}
        </NoxText>
        <NoxText variant="secondary">
          {formatEventDateLabel(booking.eventDate, language, { shortMonth: true, withYear: true })}
          {booking.eventLocation ? ` • ${booking.eventLocation}` : ''}
        </NoxText>
        {booking.booker?.name ? (
          <NoxText variant="secondary" style={styles.orga}>
            {fr ? 'Organisateur' : 'Organizer'} · {booking.booker.name}
          </NoxText>
        ) : null}
        <View style={[styles.badge, pending && styles.badgePending]}>
          <NoxText variant="secondary" style={styles.badgeText}>
            {status}
          </NoxText>
        </View>
      </View>
      <View style={styles.actions}>
        {pending ? (
          <TouchableOpacity style={styles.iconBtn} onPress={onChat} hitSlop={8}>
            <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        ) : null}
        <NoxButton label={fr ? 'Détails' : 'Details'} onPress={onDetails} style={styles.detailsBtn} />
      </View>
    </NoxCard>
  );
}

export default function LieuxEventsPage() {
  const { navigate, routeParams } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const fr = language === 'fr';

  const initialTab = routeParams?.tab || 'upcoming';
  const [activeTab, setActiveTab] = useState(initialTab);

  React.useEffect(() => {
    if (routeParams?.tab) setActiveTab(routeParams.tab);
  }, [routeParams?.tab]);

  const { loading, refreshing, bookings, refresh } = useLieuxData(user?.token, language);

  const { upcoming, past, drafts } = useMemo(
    () => categorizeVenueBookings(bookings),
    [bookings],
  );

  const tabs = useMemo(
    () => [
      { id: 'upcoming', label: fr ? `À venir (${upcoming.length})` : `Upcoming (${upcoming.length})` },
      { id: 'past', label: fr ? `Passés (${past.length})` : `Past (${past.length})` },
      { id: 'drafts', label: fr ? `Brouillons orga (${drafts.length})` : `Organizer drafts (${drafts.length})` },
    ],
    [fr, upcoming.length, past.length, drafts.length],
  );

  const list =
    activeTab === 'past' ? past : activeTab === 'drafts' ? drafts : upcoming;

  const openDetails = (booking) => {
    const eventVenueId = booking.eventVenueId || booking.id;
    if (isPendingBooking(booking)) {
      navigate('lieuxRequestDetail', { eventVenueId });
      return;
    }
    navigate('lieuxEventDetail', { eventVenueId });
  };

  const openChat = (booking) => {
    navigate('lieuxBookingChat', { eventVenueId: booking.eventVenueId || booking.id });
  };

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

      <View style={{ paddingTop: insets.top + Spacing.md }}>
        <NoxText variant="title" style={styles.pageTitle}>
          {fr ? 'Événements' : 'Events'}
        </NoxText>
        <NoxText variant="secondary" style={styles.subtitle}>
          {fr
            ? 'Les organisateurs créent les événements et te sollicitent pour ton lieu.'
            : 'Organizers create events and invite your venue.'}
        </NoxText>
        <NoxTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} style={styles.tabs} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: Spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />
        }
      >
        {list.length === 0 ? (
          <NoxText variant="secondary" style={styles.empty}>
            {activeTab === 'drafts'
              ? fr
                ? 'Aucun brouillon d’organisateur pour le moment.'
                : 'No organizer drafts yet.'
              : fr
                ? 'Aucun événement dans cette catégorie.'
                : 'No events in this category.'}
          </NoxText>
        ) : (
          list.map((booking) => (
            <EventCard
              key={booking.eventVenueId || booking.id}
              booking={booking}
              fr={fr}
              language={language}
              onDetails={() => openDetails(booking)}
              onChat={() => openChat(booking)}
            />
          ))
        )}
      </ScrollView>

      <NoxLieuxBottomNav active={null} navigate={navigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  pageTitle: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
  subtitle: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  tabs: { marginBottom: Spacing.lg },
  empty: { marginTop: Spacing.xxl, textAlign: 'center' },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  },
  eventBody: { flex: 1 },
  eventTitle: { fontWeight: '700', marginBottom: 4 },
  orga: { fontSize: 12, marginTop: 2 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: primaryAlpha(0.15),
  },
  badgePending: { backgroundColor: 'rgba(245,158,11,0.2)' },
  badgeText: { fontSize: 11, color: Colors.primary },
  actions: { alignItems: 'flex-end', gap: Spacing.sm },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtn: { paddingHorizontal: Spacing.lg, minHeight: 36 },
});
