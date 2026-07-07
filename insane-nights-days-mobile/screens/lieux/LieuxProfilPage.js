import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { NoxText, NoxCard, NoxBottomNav } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { VENUE, VENUE_NEXT_EVENTS } from './mockData';

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
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <NoxText variant="title" style={styles.name}>
              {VENUE.name}
            </NoxText>
            <NoxText variant="secondary" style={styles.type}>
              {VENUE.type}
            </NoxText>
            <NoxText variant="secondary">{VENUE.city}</NoxText>
          </View>
          <TouchableOpacity style={styles.gear} hitSlop={10}>
            <Ionicons name="settings-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <Ionicons name="images-outline" size={30} color={primaryAlpha(0.6)} />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat value={VENUE.capacity} label="Capacité (pers.)" />
          <Stat value={VENUE.surface} label="Surface (m²)" />
          <Stat value="??" label="Sound system" />
        </View>

        {/* Genres */}
        <View style={styles.genres}>
          {VENUE.genres.map((g) => (
            <View key={g} style={styles.genreTag}>
              <NoxText variant="secondary" style={styles.genreText}>
                {g}
              </NoxText>
            </View>
          ))}
        </View>

        {/* Description */}
        <NoxText variant="description" style={styles.description}>
          {VENUE.description}
        </NoxText>

        {/* Prochains événements */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <NoxText variant="titleSecondary" style={styles.sectionTitle}>
              Prochains événements ({VENUE_NEXT_EVENTS.length})
            </NoxText>
            <TouchableOpacity onPress={() => navigate('lieuxAvailability')}>
              <NoxText variant="secondary" style={styles.link}>
                Voir plus
              </NoxText>
            </TouchableOpacity>
          </View>

          {VENUE_NEXT_EVENTS.map((ev) => (
            <TouchableOpacity key={ev.id} activeOpacity={0.85} onPress={() => navigate('lieuxRequestDetail')}>
              <NoxCard style={styles.eventCard} padded={false}>
                <View style={styles.thumb}>
                  <Ionicons name="musical-notes-outline" size={20} color={primaryAlpha(0.6)} />
                </View>
                <View style={styles.eventInfo}>
                  <NoxText variant="form" style={styles.eventName}>
                    {ev.name}
                  </NoxText>
                  <NoxText variant="secondary">
                    {ev.date} • {ev.city}
                  </NoxText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </NoxCard>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <NoxBottomNav
        active="profile"
        onHome={() => navigate('lieuxDashboard')}
        onProfile={() => navigate('lieuxProfil')}
        onCreate={() => navigate('lieuxMedia')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  name: { fontSize: 26 },
  type: { color: Colors.primary, marginTop: 2 },
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
    marginHorizontal: Spacing.xl,
    height: 150,
    borderRadius: Radius.card,
    backgroundColor: primaryAlpha(0.1),
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: Colors.primary, fontSize: 20 },
  statLabel: { textAlign: 'center', marginTop: 2 },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  genreTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: primaryAlpha(0.12),
    borderWidth: 1,
    borderColor: primaryAlpha(0.35),
  },
  genreText: { color: Colors.primaryLight },
  description: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  section: { paddingHorizontal: Spacing.xl, marginTop: Spacing.xxl },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 17, marginBottom: Spacing.md },
  link: { color: Colors.primary, marginBottom: Spacing.md },
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
