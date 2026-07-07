import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { NoxText, NoxSearchBar, NoxCard, NoxBottomNav } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { DISCOVER_EVENTS, DISCOVER_DJS } from './mockData';

const FILTERS = ['All', 'Techno', 'House', 'Rave', 'Trance'];

export default function CommunityDiscoverPage() {
  const { navigate, routeParams } = useNavigation();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState(routeParams?.tab === 'djs' ? 'djs' : 'events');
  const [filter, setFilter] = useState('All');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={{ paddingTop: insets.top + Spacing.md }}>
        {/* Search + segmented */}
        <View style={styles.searchRow}>
          <NoxSearchBar
            placeholder="Rechercher un événement, un artiste ou un lieu"
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'events' && styles.segmentBtnActive]}
            onPress={() => setMode('events')}
          >
            <NoxText
              variant="buttonSecondary"
              style={[styles.segmentText, mode === 'events' && styles.segmentTextActive]}
            >
              Événements
            </NoxText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'djs' && styles.segmentBtnActive]}
            onPress={() => setMode('djs')}
          >
            <NoxText
              variant="buttonSecondary"
              style={[styles.segmentText, mode === 'djs' && styles.segmentTextActive]}
            >
              DJs
            </NoxText>
          </TouchableOpacity>
        </View>

        {/* Filtres */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, filter === f && styles.chipActive]}
              onPress={() => setFilter(f)}
            >
              <NoxText
                variant="secondary"
                style={[styles.chipText, filter === f && styles.chipTextActive]}
              >
                {f}
              </NoxText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 140, paddingTop: Spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'events'
          ? DISCOVER_EVENTS.map((ev) => (
              <TouchableOpacity key={ev.id} activeOpacity={0.85} onPress={() => navigate('communityEventDetail')}>
                <NoxCard style={styles.eventCard} padded={false}>
                  <View style={styles.eventThumb}>
                    <Ionicons name="calendar-outline" size={20} color={primaryAlpha(0.6)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <NoxText variant="form" style={styles.itemName}>
                      {ev.name}
                    </NoxText>
                    <NoxText variant="secondary">
                      {ev.date} - {ev.city}
                    </NoxText>
                    <NoxText variant="secondary" style={styles.price}>
                      À partir de {ev.price}
                    </NoxText>
                  </View>
                  <Ionicons name="bookmark-outline" size={18} color={Colors.textTertiary} />
                </NoxCard>
              </TouchableOpacity>
            ))
          : DISCOVER_DJS.map((dj) => (
              <NoxCard key={dj.id} style={styles.eventCard} padded={false}>
                <View style={styles.djThumb}>
                  <Ionicons name="person" size={22} color={primaryAlpha(0.6)} />
                </View>
                <View style={{ flex: 1 }}>
                  <NoxText variant="form" style={styles.itemName}>
                    {dj.name}
                  </NoxText>
                  <NoxText variant="secondary">{dj.city}</NoxText>
                  <NoxText variant="secondary" style={styles.genre}>
                    {dj.genre}
                  </NoxText>
                </View>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color={Colors.primary} />
                  <NoxText variant="secondary" style={styles.ratingText}>
                    {dj.rating}
                  </NoxText>
                </View>
              </NoxCard>
            ))}
      </ScrollView>

      <NoxBottomNav
        active="home"
        onHome={() => navigate('communityHome')}
        onProfile={() => navigate('communityProfile')}
        onCreate={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  segment: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  segmentBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm },
  segmentBtnActive: { backgroundColor: primaryAlpha(0.18) },
  segmentText: { color: Colors.textTertiary },
  segmentTextActive: { color: Colors.text },
  filters: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundCard,
  },
  chipActive: { backgroundColor: primaryAlpha(0.15), borderColor: primaryAlpha(0.45) },
  chipText: { color: Colors.textTertiary },
  chipTextActive: { color: Colors.primary },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  eventThumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  djThumb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: { fontWeight: '700', marginBottom: 2 },
  price: { color: Colors.primary, marginTop: 2 },
  genre: { color: Colors.primary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: Colors.text },
});
