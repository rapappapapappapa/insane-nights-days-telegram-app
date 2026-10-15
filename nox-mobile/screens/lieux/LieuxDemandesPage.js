import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLieuxData } from '../../hooks/useLieuxData';
import {
  NoxText,
  NoxCard,
  NoxScreenHeader,
  NoxLieuxBottomNav,
} from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { formatEventDateLabel } from '../../utils/noxDiscoverUtils';
import {
  DEMAND_FILTERS,
  filterBookingsByDemandFilter,
  countBookingsByDemandFilter,
  getDemandFilterForBooking,
  getDemandFilterLabel,
  getDemandFilterPillStyle,
} from '../../utils/lieuxDemandesUtils';

function FilterPill({ filter, active, count, label, onPress }) {
  const colors = getDemandFilterPillStyle(filter);
  return (
    <TouchableOpacity
      style={[
        styles.pill,
        { backgroundColor: colors.bg, borderColor: colors.border },
        active && styles.pillActive,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <NoxText variant="form" style={[styles.pillLabel, { color: active ? colors.text : Colors.text }]}>
        {label}
        {count > 0 ? ` (${count})` : ''}
      </NoxText>
    </TouchableOpacity>
  );
}

function DemandCard({ booking, language, fr, onPress, onChat }) {
  const filter = getDemandFilterForBooking(booking);
  const colors = getDemandFilterPillStyle(filter);
  const organizer = booking.booker?.name || (fr ? 'Organisateur' : 'Organizer');
  const payment =
    booking.paymentAmount != null
      ? `${booking.paymentAmount}${booking.paymentCurrency === 'eur' ? '€' : ` ${booking.paymentCurrency}`}`
      : null;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <NoxCard style={styles.card} padded={false}>
        <View style={styles.thumb}>
          <Ionicons name="people-outline" size={22} color={primaryAlpha(0.7)} />
        </View>
        <View style={styles.cardBody}>
          <NoxText variant="form" style={styles.orgName} numberOfLines={1}>
            {organizer}
          </NoxText>
          <NoxText variant="secondary" numberOfLines={2}>
            {booking.eventTitle}
          </NoxText>
          <NoxText variant="secondary" style={styles.dateLine}>
            {formatEventDateLabel(booking.eventDate, language, { shortMonth: true, withYear: true })}
            {booking.eventLocation ? ` • ${booking.eventLocation}` : ''}
          </NoxText>
          {payment ? (
            <NoxText variant="secondary" style={styles.budget}>
              {fr ? 'Budget' : 'Budget'} · {payment}
            </NoxText>
          ) : null}
          <View style={[styles.statusPill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <NoxText variant="secondary" style={[styles.statusText, { color: colors.text }]}>
              {getDemandFilterLabel(filter, language)}
            </NoxText>
          </View>
        </View>
        <View style={styles.cardActions}>
          {filter === 'pending' || filter === 'negotiate' ? (
            <TouchableOpacity style={styles.chatBtn} onPress={onChat} hitSlop={8}>
              <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </View>
      </NoxCard>
    </TouchableOpacity>
  );
}

export default function LieuxDemandesPage() {
  const { goBack, navigate, routeParams } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const fr = language === 'fr';

  const initialFilter = DEMAND_FILTERS.includes(routeParams?.filter) ? routeParams.filter : 'pending';
  const [activeFilter, setActiveFilter] = useState(initialFilter);

  useEffect(() => {
    if (DEMAND_FILTERS.includes(routeParams?.filter)) {
      setActiveFilter(routeParams.filter);
    }
  }, [routeParams?.filter]);

  const { loading, refreshing, bookings, refresh } = useLieuxData(user?.token, language);

  const counts = useMemo(() => countBookingsByDemandFilter(bookings), [bookings]);

  const filtered = useMemo(
    () => filterBookingsByDemandFilter(bookings, activeFilter),
    [bookings, activeFilter],
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const da = new Date(a.eventDate).getTime() || 0;
      const db = new Date(b.eventDate).getTime() || 0;
      return db - da;
    });
  }, [filtered]);

  const openDetail = (booking) => {
    const id = booking.eventVenueId || booking.id;
    const filter = getDemandFilterForBooking(booking);
    if (filter === 'confirmed') {
      navigate('lieuxEventDetail', { eventVenueId: id });
      return;
    }
    navigate('lieuxRequestDetail', { eventVenueId: id });
  };

  const openChat = (booking) => {
    navigate('lieuxBookingChat', {
      eventVenueId: booking.eventVenueId || booking.id,
      eventTitle: booking.eventTitle,
      eventDate: booking.eventDate,
      eventLocation: booking.eventLocation,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <NoxScreenHeader
        title={fr ? 'Demandes' : 'Requests'}
        subtitle={fr ? 'Propositions et collaborations' : 'Proposals and collaborations'}
        onBack={goBack}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
        style={styles.pillsScroll}
      >
        {DEMAND_FILTERS.map((filter) => (
          <FilterPill
            key={filter}
            filter={filter}
            active={activeFilter === filter}
            count={counts[filter]}
            label={getDemandFilterLabel(filter, language)}
            onPress={() => setActiveFilter(filter)}
          />
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {sorted.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="mail-open-outline" size={36} color={primaryAlpha(0.5)} />
              <NoxText variant="titleSecondary" style={styles.emptyTitle}>
                {fr ? 'Aucune demande' : 'No requests'}
              </NoxText>
              <NoxText variant="secondary" style={styles.emptyBody}>
                {fr
                  ? 'Les propositions des organisateurs apparaîtront ici.'
                  : 'Organizer proposals will appear here.'}
              </NoxText>
            </View>
          ) : (
            sorted.map((booking) => (
              <DemandCard
                key={booking.eventVenueId || booking.id}
                booking={booking}
                language={language}
                fr={fr}
                onPress={() => openDetail(booking)}
                onChat={() => openChat(booking)}
              />
            ))
          )}
        </ScrollView>
      )}

      <NoxLieuxBottomNav active={null} navigate={navigate} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pillsScroll: { flexGrow: 0, marginBottom: Spacing.md },
  pillsRow: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  pillActive: {
    borderWidth: 2,
  },
  pillLabel: { fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 140, gap: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  orgName: { fontWeight: '700', marginBottom: 2 },
  dateLine: { marginTop: 2 },
  budget: { marginTop: 2, fontSize: 12 },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  statusText: { fontSize: 11 },
  cardActions: { alignItems: 'center', gap: Spacing.sm },
  chatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: { textAlign: 'center' },
  emptyBody: { textAlign: 'center', lineHeight: 20 },
});
