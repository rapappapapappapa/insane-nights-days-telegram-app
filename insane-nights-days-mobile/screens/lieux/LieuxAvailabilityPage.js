import React from 'react';
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
import { NoxText, NoxCard, NoxButton, NoxBottomNav } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { AVAILABILITY_STATUS } from './mockData';
import { formatEventDateLabel } from '../../utils/noxDiscoverUtils';

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const LEGEND = [
  { key: 'available', label: 'Disponible' },
  { key: 'booked', label: 'Réservé' },
  { key: 'pending', label: 'En attente' },
  { key: 'off', label: 'Pas dispo (perso)' },
];

function Day({ item }) {
  const color = item.status ? AVAILABILITY_STATUS[item.status] : null;
  return (
    <View style={styles.dayCell}>
      <View style={[styles.dayInner, color && { backgroundColor: color }]}>
        <NoxText
          variant="secondary"
          style={[
            styles.dayText,
            item.muted && styles.dayMuted,
            color && styles.dayTextOnColor,
            item.status === 'off' && styles.dayOff,
          ]}
        >
          {item.d}
        </NoxText>
      </View>
    </View>
  );
}

/** Calendrier visuel (design) — les demandes réelles viennent de l’API ci-dessous. */
function buildCalendarRows() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows = [];
  let day = 1 - startOffset;
  for (let r = 0; r < 6; r += 1) {
    const row = [];
    for (let c = 0; c < 7; c += 1) {
      const muted = day < 1 || day > daysInMonth;
      row.push({ d: muted ? ((day - 1 + daysInMonth) % daysInMonth) + 1 : day, muted });
      day += 1;
    }
    rows.push(row);
  }
  return rows;
}

export default function LieuxAvailabilityPage() {
  const { navigate } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const fr = language === 'fr';

  const { loading, refreshing, bookings, pendingBookings, refresh, statusLabel } = useLieuxData(
    user?.token,
    language,
  );

  const calendarRows = buildCalendarRows();
  const monthLabel = new Date().toLocaleDateString(fr ? 'fr-FR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

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
          <NoxText variant="titleSecondary" style={styles.monthLabel}>
            {monthLabel}
          </NoxText>
          <View style={styles.weekRow}>
            {WEEK_DAYS.map((d, i) => (
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

        <NoxText variant="titleSecondary" style={styles.listTitle}>
          {fr ? 'Demandes & réservations' : 'Requests & bookings'}
        </NoxText>

        {bookings.length === 0 ? (
          <NoxText variant="secondary" style={{ paddingHorizontal: Spacing.xl }}>
            {fr ? 'Aucune demande pour le moment.' : 'No requests yet.'}
          </NoxText>
        ) : (
          bookings.map((booking) => (
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

      <NoxBottomNav
        active="home"
        onHome={() => navigate('lieuxDashboard')}
        onProfile={() => navigate('lieuxProfil')}
        onCreate={() => navigate('lieuxMedia')}
      />
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
  monthLabel: { textAlign: 'center', marginBottom: Spacing.md, textTransform: 'capitalize' },
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
  dayText: { fontSize: 12 },
  dayMuted: { opacity: 0.35 },
  dayTextOnColor: { color: '#000', fontWeight: '700' },
  dayOff: { textDecorationLine: 'line-through' },
  listTitle: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
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
