import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { NoxText, NoxButton } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { EVENT_DETAIL } from './mockData';

function InfoLine({ label, value }) {
  return (
    <View style={styles.infoLine}>
      <NoxText variant="secondary" style={styles.infoLabel}>
        {label}
      </NoxText>
      <NoxText variant="form" style={styles.infoValue}>
        {value}
      </NoxText>
    </View>
  );
}

export default function CommunityEventDetailPage() {
  const { goBack, navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  const e = EVENT_DETAIL;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Hero */}
      <View style={styles.hero}>
        <Ionicons name="flame-outline" size={40} color={primaryAlpha(0.7)} />
        <View style={[styles.heroTop, { paddingTop: insets.top + Spacing.sm }]}>
          <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.heroBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={12} style={styles.heroBtn}>
            <Ionicons name="bookmark-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.heroInfo}>
          <NoxText variant="title" style={styles.heroTitle}>
            {e.name}
          </NoxText>
          <NoxText variant="secondary" style={styles.heroDate}>
            {e.date}
          </NoxText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Infos */}
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          Informations événement
        </NoxText>
        <InfoLine label="Nom" value={e.infos.nom} />
        <InfoLine label="Horaires" value={e.infos.horaires} />
        <InfoLine label="Participants attendus" value={e.infos.participants} />
        <InfoLine label="Style" value={e.infos.style} />
        <InfoLine label="Lieu" value={e.infos.lieu} />

        {/* Description */}
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          Description
        </NoxText>
        <NoxText variant="description">{e.description}</NoxText>

        {/* Line-up */}
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          Line-Up
        </NoxText>
        {e.lineup.map((dj) => (
          <View key={dj.name} style={styles.lineupRow}>
            <NoxText variant="form" style={styles.lineupName}>
              {dj.name}
            </NoxText>
            <NoxText variant="secondary">{dj.time}</NoxText>
          </View>
        ))}

        {/* Organisateur */}
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          Organisateur
        </NoxText>
        <View style={styles.orgRow}>
          <View style={styles.orgAvatar}>
            <Ionicons name="people-outline" size={22} color={primaryAlpha(0.6)} />
          </View>
          <View style={{ flex: 1 }}>
            <NoxText variant="form" style={styles.orgName}>
              {e.organizer.name}
            </NoxText>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color={Colors.primary} />
              <NoxText variant="secondary" style={styles.ratingText}>
                {e.organizer.rating} • {e.organizer.events} événements organisés
              </NoxText>
            </View>
          </View>
        </View>
        <NoxButton
          label="Voir le profil"
          variant="ghost"
          onPress={() => navigate('communityDiscover')}
          style={styles.profileBtn}
        />

        {/* Lieu */}
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          Lieu
        </NoxText>
        <View style={styles.orgRow}>
          <View style={styles.orgAvatar}>
            <Ionicons name="business-outline" size={22} color={primaryAlpha(0.6)} />
          </View>
          <View style={{ flex: 1 }}>
            <NoxText variant="form" style={styles.orgName}>
              {e.venue.name}
            </NoxText>
            <NoxText variant="secondary">{e.venue.events} événements organisés</NoxText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    height: 240,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.xl,
    right: Spacing.xl,
  },
  heroTitle: { fontSize: 26 },
  heroDate: { color: Colors.primary, marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  infoLabel: { flex: 1 },
  infoValue: { textAlign: 'right', fontWeight: '600', flex: 1 },
  lineupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  lineupName: { fontWeight: '700' },
  orgRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  orgAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: primaryAlpha(0.1),
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgName: { fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 12 },
  profileBtn: { marginTop: Spacing.md, alignSelf: 'flex-start', paddingHorizontal: 24 },
});
