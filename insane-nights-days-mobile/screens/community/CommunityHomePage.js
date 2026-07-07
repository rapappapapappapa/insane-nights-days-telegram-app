import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { NoxText, NoxSearchBar, NoxTabs, NoxBottomNav } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { FEATURED_EVENT, UPCOMING, SUGGESTED_DJS } from './mockData';

const TABS = [
  { id: 'events', label: 'Events feed' },
  { id: 'following', label: 'Following feed' },
];

export default function CommunityHomePage() {
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('events');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar} />
            <View>
              <NoxText variant="titleSecondary" style={styles.greeting}>
                Hello Clara !
              </NoxText>
              <NoxText variant="secondary">Découvre ton prochain événement</NoxText>
            </View>
          </View>
          <TouchableOpacity style={styles.bell} onPress={() => navigate('notifications')} hitSlop={10}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <NoxSearchBar
            placeholder="Rechercher un événement, un artiste ou un lieu"
            onPress={() => navigate('communityDiscover')}
          />
        </View>

        {/* Tabs */}
        <NoxTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} style={styles.tabs} />

        {/* Featured */}
        <TouchableOpacity
          style={styles.featured}
          activeOpacity={0.9}
          onPress={() => navigate('communityEventDetail')}
        >
          <View style={styles.featuredImage}>
            <Ionicons name="flame-outline" size={30} color={primaryAlpha(0.7)} />
          </View>
          <View style={styles.featuredOverlay}>
            <NoxText variant="titleSecondary" style={styles.featuredTitle}>
              {FEATURED_EVENT.name}
            </NoxText>
            <NoxText variant="secondary" style={styles.featuredMeta}>
              {FEATURED_EVENT.date}, {FEATURED_EVENT.time} • {FEATURED_EVENT.city}
            </NoxText>
          </View>
          <View style={styles.bookmark}>
            <Ionicons name="bookmark-outline" size={18} color={Colors.text} />
          </View>
        </TouchableOpacity>

        {/* Prochains événements */}
        <View style={styles.sectionHeaderRow}>
          <NoxText variant="titleSecondary" style={styles.sectionTitle}>
            Prochains événements
          </NoxText>
          <TouchableOpacity onPress={() => navigate('communityDiscover')}>
            <NoxText variant="secondary" style={styles.link}>
              Voir plus
            </NoxText>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScroll}
        >
          {UPCOMING.map((ev) => (
            <TouchableOpacity
              key={ev.id}
              style={styles.upcomingCard}
              activeOpacity={0.85}
              onPress={() => navigate('communityEventDetail')}
            >
              <View style={styles.upcomingImage}>
                <Ionicons name="calendar-outline" size={22} color={primaryAlpha(0.6)} />
              </View>
              <NoxText variant="secondary" style={styles.upcomingName} numberOfLines={1}>
                {ev.name}
              </NoxText>
              <NoxText variant="secondary" style={styles.upcomingMeta}>
                {ev.date} • {ev.city}
              </NoxText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Suggestions de DJs */}
        <View style={styles.sectionHeaderRow}>
          <NoxText variant="titleSecondary" style={styles.sectionTitle}>
            Suggestions de DJs
          </NoxText>
          <TouchableOpacity onPress={() => navigate('communityDiscover', { tab: 'djs' })}>
            <NoxText variant="secondary" style={styles.link}>
              Voir plus
            </NoxText>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScroll}
        >
          {SUGGESTED_DJS.map((dj) => (
            <View key={dj.id} style={styles.djCard}>
              <View style={styles.djAvatar}>
                <Ionicons name="person" size={26} color={primaryAlpha(0.6)} />
              </View>
              <NoxText variant="secondary" style={styles.djName} numberOfLines={1}>
                {dj.name}
              </NoxText>
              <NoxText variant="secondary" style={styles.djGenre} numberOfLines={1}>
                {dj.genre}
              </NoxText>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      <NoxBottomNav
        active="home"
        onHome={() => navigate('communityHome')}
        onProfile={() => navigate('communityProfile')}
        onCreate={() => navigate('communityDiscover')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
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
  },
  searchWrap: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  tabs: { marginBottom: Spacing.lg },
  featured: {
    marginHorizontal: Spacing.xl,
    height: 180,
    borderRadius: Radius.card,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  featuredImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredOverlay: {
    padding: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  featuredTitle: { fontSize: 20 },
  featuredMeta: { color: Colors.textSecondary, marginTop: 2 },
  bookmark: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 17 },
  link: { color: Colors.primary },
  hScroll: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  upcomingCard: { width: 130 },
  upcomingImage: {
    width: 130,
    height: 90,
    borderRadius: Radius.md,
    backgroundColor: primaryAlpha(0.1),
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  upcomingName: { color: Colors.text, fontWeight: '600' },
  upcomingMeta: { fontSize: 12 },
  djCard: { width: 84, alignItems: 'center' },
  djAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: primaryAlpha(0.1),
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  djName: { color: Colors.text, fontWeight: '600' },
  djGenre: { fontSize: 11 },
});
