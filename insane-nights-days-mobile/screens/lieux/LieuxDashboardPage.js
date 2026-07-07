import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { NoxText, NoxCard, NoxBottomNav } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { VENUE, UPCOMING_EVENTS } from './mockData';

function EventThumb({ style }) {
  return (
    <View style={[styles.thumb, style]}>
      <Ionicons name="image-outline" size={20} color={primaryAlpha(0.6)} />
    </View>
  );
}

export default function LieuxDashboardPage() {
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
          <View style={styles.headerLeft}>
            <View style={styles.avatar} />
            <View>
              <NoxText variant="titleSecondary" style={styles.greeting}>
                Hello {VENUE.greetingName} !
              </NoxText>
              <NoxText variant="secondary">{VENUE.city}</NoxText>
            </View>
          </View>
          <TouchableOpacity style={styles.bell} onPress={() => navigate('notifications')} hitSlop={10}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Demandes en attente */}
        <TouchableOpacity
          style={styles.pending}
          activeOpacity={0.85}
          onPress={() => navigate('lieuxRequestDetail')}
        >
          <NoxText variant="button" style={styles.pendingLabel}>
            Demandes en attente ({VENUE.pendingRequests})
          </NoxText>
          <NoxText variant="secondary" style={styles.pendingHint}>
            Voir tout
          </NoxText>
        </TouchableOpacity>

        {/* Actions rapides */}
        <View style={styles.section}>
          <NoxText variant="titleSecondary" style={styles.sectionTitle}>
            Actions rapides
          </NoxText>
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickCard} activeOpacity={0.85}>
              <View style={styles.quickIcon}>
                <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
              </View>
              <NoxText variant="secondary" style={styles.quickLabel}>
                Créer un événement
              </NoxText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} activeOpacity={0.85}>
              <View style={styles.quickIcon}>
                <Ionicons name="qr-code-outline" size={22} color={Colors.primary} />
              </View>
              <NoxText variant="secondary" style={styles.quickLabel}>
                Scanner billets
              </NoxText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Événements à venir */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <NoxText variant="titleSecondary" style={styles.sectionTitle}>
              Événement à venir
            </NoxText>
            <TouchableOpacity onPress={() => navigate('lieuxAvailability')}>
              <NoxText variant="secondary" style={styles.link}>
                Voir plus
              </NoxText>
            </TouchableOpacity>
          </View>

          {UPCOMING_EVENTS.map((ev) => (
            <TouchableOpacity
              key={ev.id}
              activeOpacity={0.85}
              onPress={() => navigate('lieuxRequestDetail')}
            >
              <NoxCard style={styles.eventCard} padded={false}>
                <EventThumb />
                <View style={styles.eventInfo}>
                  <NoxText variant="form" style={styles.eventName}>
                    {ev.name}
                  </NoxText>
                  <NoxText variant="secondary">{ev.date}</NoxText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </NoxCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* Statistiques */}
        <View style={styles.section}>
          <NoxText variant="titleSecondary" style={styles.sectionTitle}>
            Statistiques du dernier événement
          </NoxText>
          <View style={styles.statRow}>
            <NoxCard style={styles.statCard}>
              <Ionicons name="ticket-outline" size={20} color={Colors.primary} />
              <NoxText variant="title" style={styles.statValue}>
                420
              </NoxText>
              <NoxText variant="secondary">Billets vendus</NoxText>
            </NoxCard>
            <NoxCard style={styles.statCard}>
              <Ionicons name="cash-outline" size={20} color={Colors.primary} />
              <NoxText variant="title" style={styles.statValue}>
                6 300€
              </NoxText>
              <NoxText variant="secondary">Recette</NoxText>
            </NoxCard>
          </View>
        </View>
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
  },
  eventInfo: { flex: 1 },
  eventName: { fontWeight: '700', marginBottom: 2 },
  statRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: { flex: 1, alignItems: 'flex-start', gap: Spacing.xs },
  statValue: { fontSize: 22 },
});
