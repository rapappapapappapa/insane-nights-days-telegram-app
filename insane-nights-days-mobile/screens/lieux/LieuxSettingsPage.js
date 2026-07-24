import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { NoxText, NoxLieuxBottomNav } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';

function SettingsRow({ icon, label, subtitle, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={20} color={danger ? '#ef4444' : Colors.primary} />
      </View>
      <View style={styles.rowText}>
        <NoxText variant="form" style={danger && { color: '#ef4444' }}>
          {label}
        </NoxText>
        {subtitle ? (
          <NoxText variant="secondary" style={styles.rowSub}>
            {subtitle}
          </NoxText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      {title ? (
        <NoxText variant="secondary" style={styles.sectionTitle}>
          {title}
        </NoxText>
      ) : null}
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function LieuxSettingsPage() {
  const { goBack, navigate } = useNavigation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const fr = language === 'fr';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <NoxText variant="titleSecondary">{fr ? 'Réglages' : 'Settings'}</NoxText>
          <NoxText variant="secondary">
            {fr ? 'Gère ton compte et tes préférences.' : 'Manage your account and preferences.'}
          </NoxText>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 160, paddingTop: Spacing.md }}>
        <Section title={fr ? 'Compte' : 'Account'}>
          <SettingsRow
            icon="person-outline"
            label={fr ? 'Modifier le profil lieu' : 'Edit venue profile'}
            subtitle={fr ? 'Nom, adresse, photos, capacité' : 'Name, address, photos, capacity'}
            onPress={() => navigate('venueProfileEdit')}
          />
          <SettingsRow
            icon="swap-horizontal-outline"
            label={fr ? 'Changer de profil' : 'Switch profile'}
            onPress={() => navigate('switchProfile')}
          />
        </Section>

        <Section title={fr ? 'Bookings & événements' : 'Bookings & events'}>
          <SettingsRow
            icon="calendar-outline"
            label={fr ? 'Mes événements' : 'My events'}
            onPress={() => navigate('lieuxEvents')}
          />
          <SettingsRow
            icon="time-outline"
            label={fr ? 'Disponibilités' : 'Availability'}
            onPress={() => navigate('lieuxAvailability')}
          />
          <SettingsRow
            icon="images-outline"
            label={fr ? 'Médias' : 'Media'}
            onPress={() => navigate('lieuxMedia')}
          />
          <SettingsRow
            icon="newspaper-outline"
            label={fr ? 'Feed lieu' : 'Venue feed'}
            onPress={() => navigate('lieuxFeed')}
          />
        </Section>

        <Section title={fr ? 'Staff & accès' : 'Staff & access'}>
          <SettingsRow
            icon="people-outline"
            label={fr ? 'Gérer le staff' : 'Manage staff'}
            subtitle={fr ? 'Par événement + accès scanner' : 'Per event + scanner access'}
            onPress={() => navigate('lieuxStaff')}
          />
          <SettingsRow
            icon="qr-code-outline"
            label={fr ? 'Scanner billets' : 'Scan tickets'}
            subtitle={fr ? 'Accès réservé au staff autorisé' : 'Authorized staff only'}
            onPress={() => navigate('lieuxScanner')}
          />
        </Section>

        <Section title={fr ? 'Notifications' : 'Notifications'}>
          <SettingsRow
            icon="notifications-outline"
            label={fr ? 'Centre de notifications' : 'Notification center'}
            onPress={() => navigate('lieuxNotifications')}
          />
        </Section>

        <Section title={fr ? 'Support' : 'Support'}>
          <SettingsRow
            icon="document-text-outline"
            label={fr ? 'Informations légales' : 'Legal information'}
            onPress={() => navigate('legal')}
          />
        </Section>
      </ScrollView>

      <NoxLieuxBottomNav active={null} navigate={navigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  sectionTitle: {
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  sectionCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: 'rgba(239,68,68,0.12)' },
  rowText: { flex: 1 },
  rowSub: { fontSize: 12, marginTop: 2 },
});
