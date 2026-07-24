import React, { useCallback, useMemo, useState } from 'react';
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
import { NoxText, NoxCard, NoxLieuxBottomNav } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { formatEventDateLabel } from '../../utils/noxDiscoverUtils';
import { isAcceptedBooking } from '../../utils/lieuxEventUtils';

function FeedItem({ booking, fr, language, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <NoxCard style={styles.card} padded={false}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Ionicons name="business-outline" size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <NoxText variant="form" style={styles.cardTitle}>
              {fr ? 'Événement au lieu' : 'Venue event'}
            </NoxText>
            <NoxText variant="secondary" style={styles.cardMeta}>
              {formatEventDateLabel(booking.eventDate, language, { shortMonth: true, withYear: true })}
            </NoxText>
          </View>
        </View>
        <NoxText variant="form" style={styles.eventName}>
          {booking.eventTitle}
        </NoxText>
        {booking.eventLocation ? (
          <NoxText variant="secondary">{booking.eventLocation}</NoxText>
        ) : null}
        {booking.booker?.name ? (
          <NoxText variant="secondary" style={styles.orga}>
            {fr ? 'Organisateur' : 'Organizer'} · {booking.booker.name}
          </NoxText>
        ) : null}
      </NoxCard>
    </TouchableOpacity>
  );
}

export default function LieuxFeedPage() {
  const { goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const fr = language === 'fr';

  const { loading, refreshing, bookings, venueProfile, refresh } = useLieuxData(
    user?.token,
    language,
  );

  const feedItems = useMemo(
    () =>
      bookings
        .filter((b) => isAcceptedBooking(b))
        .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()),
    [bookings],
  );

  const onRefresh = useCallback(() => refresh(), [refresh]);

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

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <NoxText variant="titleSecondary">{fr ? 'Feed lieu' : 'Venue feed'}</NoxText>
          <NoxText variant="secondary">
            {venueProfile?.venueName || (fr ? 'Publications' : 'Publications')}
          </NoxText>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 160, paddingTop: Spacing.md }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <NoxCard style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
          <NoxText variant="secondary" style={styles.infoText}>
            {fr
              ? 'Les événements confirmés apparaissent ici. Les posts texte/image pour les lieux arriveront avec une prochaine mise à jour API.'
              : 'Confirmed events appear here. Text/image posts for venues will come in a future API update.'}
          </NoxText>
        </NoxCard>

        {feedItems.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="newspaper-outline" size={40} color={primaryAlpha(0.5)} />
            <NoxText variant="titleSecondary" style={styles.emptyTitle}>
              {fr ? 'Aucune publication' : 'No posts yet'}
            </NoxText>
            <NoxText variant="secondary" style={styles.emptySub}>
              {fr
                ? 'Confirme des événements pour alimenter ton feed.'
                : 'Confirm events to populate your feed.'}
            </NoxText>
          </View>
        ) : (
          feedItems.map((booking) => (
            <FeedItem
              key={booking.eventVenueId || booking.id}
              booking={booking}
              fr={fr}
              language={language}
              onPress={() =>
                navigate('lieuxEventDetail', {
                  eventVenueId: booking.eventVenueId || booking.id,
                })
              }
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  infoCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  empty: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyTitle: { marginTop: Spacing.md },
  emptySub: { textAlign: 'center' },
  card: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  cardHeader: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontWeight: '700' },
  cardMeta: { fontSize: 12 },
  eventName: { fontWeight: '700', marginBottom: 4 },
  orga: { marginTop: 4, fontSize: 12 },
});
