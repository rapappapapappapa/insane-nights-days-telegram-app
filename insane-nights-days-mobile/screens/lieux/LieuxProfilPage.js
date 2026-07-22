import React, { useState } from 'react';
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
import { formatEventDateLabel } from '../../utils/noxDiscoverUtils';

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

export default function LieuxProfilPage() {
  const { navigate } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const fr = language === 'fr';

  const { loading, refreshing, venueProfile, upcomingBookings, refresh } = useLieuxData(
    user?.token,
    language,
  );
  const [bannerBroken, setBannerBroken] = useState(false);

  const cityLabel = [venueProfile?.city, venueProfile?.country].filter(Boolean).join(', ');
  const genres = (venueProfile?.genres || '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);

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
          <View>
            <NoxText variant="title" style={styles.name}>
              {venueProfile?.venueName || (fr ? 'Mon lieu' : 'My venue')}
            </NoxText>
            <NoxText variant="secondary" style={styles.type}>
              {venueProfile?.companyName || (fr ? 'Lieu' : 'Venue')}
            </NoxText>
            <NoxText variant="secondary">{cityLabel || venueProfile?.address || ''}</NoxText>
          </View>
          <TouchableOpacity
            style={styles.gear}
            hitSlop={10}
            onPress={() => navigate('lieuxSettings')}
          >
            <Ionicons name="settings-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.banner}>
          {venueProfile?.bannerImage && !bannerBroken ? (
            <Image
              source={{ uri: normalizeMediaUrl(venueProfile.bannerImage) }}
              style={StyleSheet.absoluteFillObject}
              onError={() => setBannerBroken(true)}
            />
          ) : (
            <Ionicons name="images-outline" size={30} color={primaryAlpha(0.6)} />
          )}
        </View>

        <View style={styles.statsRow}>
          <Stat
            value={venueProfile?.maxCapacity ?? '—'}
            label={fr ? 'Capacité (pers.)' : 'Capacity'}
          />
          <Stat value={upcomingBookings.length} label={fr ? 'À venir' : 'Upcoming'} />
          <Stat value={venueProfile?.siret ? '✓' : '—'} label="SIRET" />
        </View>

        {genres.length > 0 ? (
          <View style={styles.genres}>
            {genres.map((g) => (
              <View key={g} style={styles.genreTag}>
                <NoxText variant="secondary" style={styles.genreText}>
                  {g}
                </NoxText>
              </View>
            ))}
          </View>
        ) : null}

        <NoxText variant="description" style={styles.description}>
          {venueProfile?.address ||
            (fr ? 'Complète ton profil lieu depuis les paramètres.' : 'Complete your venue profile in settings.')}
        </NoxText>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <NoxText variant="titleSecondary" style={styles.sectionTitle}>
              {fr ? 'Prochains événements' : 'Upcoming events'} ({upcomingBookings.length})
            </NoxText>
            <TouchableOpacity onPress={() => navigate('lieuxEvents')}>
              <NoxText variant="secondary" style={styles.link}>
                {fr ? 'Voir plus' : 'See more'}
              </NoxText>
            </TouchableOpacity>
          </View>

          {upcomingBookings.length === 0 ? (
            <NoxText variant="secondary">{fr ? 'Aucun événement confirmé.' : 'No confirmed events.'}</NoxText>
          ) : (
            upcomingBookings.map((ev) => (
              <TouchableOpacity
                key={ev.id}
                activeOpacity={0.85}
                onPress={() => navigate('lieuxEventDetail', { eventVenueId: ev.id })}
              >
                <NoxCard style={styles.eventCard} padded={false}>
                  <View style={styles.thumb}>
                    <Ionicons name="musical-notes-outline" size={20} color={primaryAlpha(0.6)} />
                  </View>
                  <View style={styles.eventInfo}>
                    <NoxText variant="form" style={styles.eventName}>
                      {ev.title}
                    </NoxText>
                    <NoxText variant="secondary">
                      {formatEventDateLabel(ev.date, language, { shortMonth: true, withYear: true })}
                      {ev.location ? ` • ${ev.location}` : ''}
                    </NoxText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                </NoxCard>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <NoxLieuxBottomNav active="profile" navigate={navigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  name: { fontSize: 24 },
  type: { marginTop: 2 },
  gear: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  banner: {
    height: 120,
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.card,
    backgroundColor: primaryAlpha(0.1),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: 11, textAlign: 'center' },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  genreTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: primaryAlpha(0.12),
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  genreText: { fontSize: 12 },
  description: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  section: { paddingHorizontal: Spacing.xl },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 17 },
  link: { color: Colors.primary },
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
  },
  eventInfo: { flex: 1 },
  eventName: { fontWeight: '700', marginBottom: 2 },
});
