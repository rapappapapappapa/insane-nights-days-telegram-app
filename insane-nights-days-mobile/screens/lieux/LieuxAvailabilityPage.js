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
import { NoxText, NoxCard, NoxButton, NoxLieuxBottomNav } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { AVAILABILITY_STATUS } from './mockData';
import { formatEventDateLabel } from '../../utils/noxDiscoverUtils';
import {
  buildCalendarRowsFromBookings,
  calendarStatusColor,
} from '../../utils/lieuxEventUtils';

const LEGEND = [
  { key: 'available', label: 'Disponible' },
  { key: 'booked', label: 'Réservé' },
  { key: 'pending', label: 'En attente' },
  { key: 'off', label: 'Pas dispo (perso)' },
];

function Day({ item }) {
  const color = item.status ? calendarStatusColor(item.status) : null;
  return (
    <View style={styles.dayCell}>
      <View
        style={[
          styles.dayInner,
          color && item.status === 'booked' && { backgroundColor: color },
          item.status === 'pending' && styles.dayPending,
        ]}
      >
        <NoxText
          variant="secondary"
          style={[
            styles.dayText,
            item.muted && styles.dayMuted,
            color && item.status === 'booked' && styles.dayTextOnColor,
            item.status === 'off' && styles.dayOff,
          ]}
        >
          {item.d}
        </NoxText>
      </View>
    </View>
  );
}

export default function LieuxAvailabilityPage() {
  const { navigate, routeParams } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const fr = language === 'fr';

  const focusPending = !!routeParams?.focusPending;
  const [viewMonth, setViewMonth] = useState(() => new Date());

  const { loading, refreshing, bookings, pendingBookings, refresh, statusLabel } = useLieuxData(
    user?.token,
    language,
  );

  const { rows: calendarRows, weekDays } = useMemo(
    () => buildCalendarRowsFromBookings(viewMonth, bookings),
    [viewMonth, bookings],
  );

  const monthLabel = viewMonth.toLocaleDateString(fr ? 'fr-FR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  const shiftMonth = (delta) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const sortedBookings = useMemo(() => {
    if (!focusPending) return bookings;
    return [...bookings].sort((a, b) => {
      const aPending = String(a.invitationStatus || '').toUpperCase() === 'PENDING';
      const bPending = String(b.invitationStatus || '').toUpperCase() === 'PENDING';
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return 0;
    });
  }, [bookings, focusPending]);

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
        contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />
        }
      >
        <NoxText variant="title" style={styles.title}>
          {fr ? 'Disponibilités' : 'Availability'}
        </NoxText>

        <View style={styles.legend}>
          {LEGEND.map((l) => (
            <View key={l.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: AVAILABILITY_STATUS[l.key] }]} />
              <NoxText variant="secondary" style={styles.legendLabel}>
                {fr ? l.label : l.key}
              </NoxText>
            </View>
          ))}
        </View>

        <NoxCard style={styles.calendar}>
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={12}>
              <Ionicons name="chevron-back" size={20} color={Colors.text} />
            </TouchableOpacity>
            <NoxText variant="titleSecondary" style={styles.monthLabel}>
              {monthLabel}
            </NoxText>
            <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={12}>
              <Ionicons name="chevron-forward" size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {weekDays.map((d, i) => (
              <NoxText key={`${d}-${i}`} variant="secondary" style={styles.weekDay}>
                {d}
              </NoxText>
            ))}
          </View>
          {calendarRows.map((row, ri) => (
            <View key={ri} style={styles.weekRow}>
              {row.map((item, ci) => (
                <Day key={`${ri}-${ci}`} item={item} />
              ))}
            </View>
          ))}
        </NoxCard>

        <NoxText variant="titleSecondary" style={[styles.listTitle, focusPending && styles.listTitleFocus]}>
          {focusPending && pendingBookings.length > 0
            ? fr
              ? `Demandes en attente (${pendingBookings.length})`
              : `Pending requests (${pendingBookings.length})`
            : fr
              ? 'Demandes & réservations'
              : 'Requests & bookings'}
        </NoxText>

        {sortedBookings.length === 0 ? (
          <NoxText variant="secondary" style={{ paddingHorizontal: Spacing.xl }}>
            {fr ? 'Aucune demande pour le moment.' : 'No requests yet.'}
          </NoxText>
        ) : (
          sortedBookings.map((booking) => (
            <TouchableOpacity
              key={booking.eventVenueId || booking.id}
              activeOpacity={0.85}
              onPress={() =>
                navigate('lieuxRequestDetail', {
                  eventVenueId: booking.eventVenueId || booking.id,
                })
              }
            >
              <NoxCard style={styles.requestCard} padded={false}>
                <View style={styles.thumb}>
                  <Ionicons name="calendar-outline" size={20} color={primaryAlpha(0.6)} />
                </View>
                <View style={{ flex: 1 }}>
                  <NoxText variant="form" style={styles.eventName}>
                    {booking.eventTitle}
                  </NoxText>
                  <NoxText variant="secondary">
                    {formatEventDateLabel(booking.eventDate, language, { shortMonth: true, withYear: true })}
                    {booking.eventLocation ? ` • ${booking.eventLocation}` : ''}
                  </NoxText>
                  <NoxText variant="secondary" style={styles.status}>
                    {statusLabel(booking.invitationStatus)}
                  </NoxText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
              </NoxCard>
            </TouchableOpacity>
          ))
        )}

        {pendingBookings.length > 0 ? (
          <NoxButton
            label={fr ? 'Traiter les demandes en attente' : 'Handle pending requests'}
            onPress={() =>
              navigate('lieuxRequestDetail', {
                eventVenueId: pendingBookings[0].eventVenueId || pendingBookings[0].id,
              })
            }
            style={{ marginHorizontal: Spacing.xl, marginTop: Spacing.lg }}
          />
        ) : null}
      </ScrollView>

      <NoxLieuxBottomNav active={null} navigate={navigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  title: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  legend: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12 },
  calendar: { marginHorizontal: Spacing.xl, padding: Spacing.lg, marginBottom: Spacing.xxl },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  monthLabel: { textTransform: 'capitalize', flex: 1, textAlign: 'center' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  weekDay: { width: 36, textAlign: 'center', fontSize: 11 },
  dayCell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dayInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPending: {
    borderWidth: 2,
    borderColor: AVAILABILITY_STATUS.pending,
  },
  dayText: { fontSize: 12 },
  dayMuted: { opacity: 0.35 },
  dayTextOnColor: { color: '#000', fontWeight: '700' },
  dayOff: { textDecorationLine: 'line-through' },
  listTitle: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  listTitleFocus: { color: Colors.primary },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventName: { fontWeight: '700', marginBottom: 2 },
  status: { color: Colors.primary, marginTop: 2 },
});
