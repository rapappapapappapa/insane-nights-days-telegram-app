import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { NoxText, NoxCard, NoxButton, NoxBottomNav } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { AVAILABILITY_EVENTS, AVAILABILITY_STATUS } from './mockData';

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Grille Juin 2026 telle qu'affichée dans le design (jours du mois précédent/suivant grisés). */
const CALENDAR_ROWS = [
  [{ d: 28, muted: true }, { d: 29, muted: true }, { d: 30, muted: true }, { d: 31, muted: true }, { d: 1 }, { d: 2 }, { d: 3 }],
  [{ d: 4 }, { d: 5 }, { d: 6 }, { d: 7, status: 'off' }, { d: 8 }, { d: 9 }, { d: 10 }],
  [{ d: 11 }, { d: 12 }, { d: 13, status: 'booked' }, { d: 14 }, { d: 15 }, { d: 16 }, { d: 17 }],
  [{ d: 18 }, { d: 19 }, { d: 20 }, { d: 21, status: 'pending' }, { d: 22 }, { d: 23 }, { d: 24 }],
  [{ d: 25 }, { d: 26 }, { d: 27 }, { d: 28 }, { d: 29, status: 'available' }, { d: 30 }, { d: 1, muted: true }],
];

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

export default function LieuxAvailabilityPage() {
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <NoxText variant="title" style={styles.title}>
          Disponibilités
        </NoxText>

        {/* Légende */}
        <View style={styles.legend}>
          {LEGEND.map((l) => (
            <View key={l.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: AVAILABILITY_STATUS[l.key] }]} />
              <NoxText variant="secondary" style={styles.legendLabel}>
                {l.label}
              </NoxText>
            </View>
          ))}
        </View>

        {/* Calendrier */}
        <NoxCard style={styles.calendar}>
          <View style={styles.monthRow}>
            <TouchableOpacity hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color={Colors.text} />
            </TouchableOpacity>
            <NoxText variant="titleSecondary" style={styles.month}>
              Juin 2026
            </NoxText>
            <TouchableOpacity hitSlop={10}>
              <Ionicons name="chevron-forward" size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEK_DAYS.map((d, i) => (
              <View key={i} style={styles.dayCell}>
                <NoxText variant="secondary" style={styles.weekLabel}>
                  {d}
                </NoxText>
              </View>
            ))}
          </View>

          {CALENDAR_ROWS.map((row, i) => (
            <View key={i} style={styles.weekRow}>
              {row.map((item, j) => (
                <Day key={j} item={item} />
              ))}
            </View>
          ))}
        </NoxCard>

        {/* Événements */}
        {AVAILABILITY_EVENTS.map((ev) => (
          <NoxCard key={ev.id} style={styles.eventCard} padded={false}>
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
              <NoxText variant="secondary" style={styles.genre}>
                {ev.genre.toUpperCase()}
              </NoxText>
              <View style={styles.budgetRow}>
                <View style={styles.budgetBadge}>
                  <NoxText variant="secondary" style={styles.budgetText}>
                    Budget validé : {ev.budget}
                  </NoxText>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.seeBtn} onPress={() => navigate('lieuxRequestDetail')}>
              <NoxText variant="buttonSecondary" style={styles.seeBtnText}>
                Voir
              </NoxText>
            </TouchableOpacity>
          </NoxCard>
        ))}

        <View style={{ paddingHorizontal: Spacing.xl, marginTop: Spacing.lg }}>
          <NoxButton label="Bloquer des dates" onPress={() => {}} />
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
  title: { textAlign: 'center', marginBottom: Spacing.md },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12 },
  calendar: { marginHorizontal: Spacing.xl },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  month: { fontSize: 18 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  weekLabel: { fontSize: 12, color: Colors.textTertiary },
  dayInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 13, color: Colors.text },
  dayMuted: { color: Colors.textMuted },
  dayTextOnColor: { color: '#000', fontWeight: '700' },
  dayOff: { textDecorationLine: 'line-through' },
  eventCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.sm,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: { flex: 1 },
  eventName: { fontWeight: '700', marginBottom: 2 },
  genre: { color: Colors.primary, fontSize: 11, marginTop: 2 },
  budgetRow: { flexDirection: 'row', marginTop: Spacing.sm },
  budgetBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: primaryAlpha(0.12),
  },
  budgetText: { color: Colors.primaryLight, fontSize: 11 },
  seeBtn: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: primaryAlpha(0.45),
    backgroundColor: primaryAlpha(0.12),
  },
  seeBtnText: { color: Colors.primary },
});
