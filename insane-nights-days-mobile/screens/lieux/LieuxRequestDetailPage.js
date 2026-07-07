import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { NoxText } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { COLLAB_REQUEST } from './mockData';

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <NoxText variant="secondary" style={styles.infoLabel}>
        {label}
      </NoxText>
      <NoxText variant="form" style={styles.infoValue}>
        {value}
      </NoxText>
    </View>
  );
}

const DECISIONS = [
  { id: 'confirmed', label: 'Confirmé' },
  { id: 'negotiate', label: 'À négocier' },
  { id: 'refused', label: 'Refusé' },
];

export default function LieuxRequestDetailPage() {
  const { goBack } = useNavigation();
  const insets = useSafeAreaInsets();
  const [decision, setDecision] = useState(null);
  const r = COLLAB_REQUEST;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <NoxText variant="titleSecondary" style={styles.orgName}>
            {r.organizer}
          </NoxText>
          <NoxText variant="secondary" style={styles.eventDate}>
            {r.eventDate}
          </NoxText>
          <NoxText variant="secondary" style={styles.sentDate}>
            Demande envoyée le {r.sentDate}
          </NoxText>
        </View>
        <TouchableOpacity hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Statut */}
      <View style={styles.statusWrap}>
        <View style={styles.statusBadge}>
          <NoxText variant="secondary" style={styles.statusText}>
            {r.status}
          </NoxText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          Informations événement
        </NoxText>

        <InfoRow label="Date demandée" value={r.requestedDate} />
        <InfoRow label="Format" value={r.format} />
        <InfoRow label="Capacité prévue" value={r.capacity} />
        <InfoRow label="Proposition financière" value={r.budget} />
        <InfoRow label="Billeterie" value={r.ticketing} />
        <InfoRow label="Montage/Démontage" value={`${r.setup}  •  ${r.teardown}`} />

        <View style={styles.messageBlock}>
          <NoxText variant="secondary" style={styles.infoLabel}>
            Message
          </NoxText>
          <NoxText variant="description" style={styles.message}>
            {r.message}
          </NoxText>
        </View>

        {/* Décisions */}
        <View style={styles.decisionRow}>
          {DECISIONS.map((d) => {
            const active = decision === d.id;
            return (
              <TouchableOpacity
                key={d.id}
                style={[styles.decisionBtn, active && styles.decisionBtnActive]}
                onPress={() => setDecision(d.id)}
                activeOpacity={0.85}
              >
                <NoxText
                  variant="buttonSecondary"
                  style={[styles.decisionText, active && styles.decisionTextActive]}
                >
                  {d.label}
                </NoxText>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  orgName: { fontSize: 20, letterSpacing: 0.5 },
  eventDate: { color: Colors.primary, marginTop: 2 },
  sentDate: { color: Colors.textTertiary, fontSize: 12, marginTop: 2 },
  statusWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  statusBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: primaryAlpha(0.12),
    borderWidth: 1,
    borderColor: primaryAlpha(0.35),
  },
  statusText: { color: Colors.primaryLight },
  sectionTitle: {
    fontSize: 16,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  infoLabel: { flex: 1 },
  infoValue: { textAlign: 'right', fontWeight: '600' },
  messageBlock: { marginTop: Spacing.xl },
  message: { marginTop: Spacing.sm },
  decisionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.xxxl,
  },
  decisionBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
  },
  decisionBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: primaryAlpha(0.12),
  },
  decisionText: { color: Colors.textSecondary },
  decisionTextActive: { color: Colors.primary },
});
