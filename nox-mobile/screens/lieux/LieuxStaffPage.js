import React, { useMemo, useState } from 'react';
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
import { NoxText, NoxCard, NoxTabs, NoxButton, NoxLieuxBottomNav } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { formatEventDateLabel } from '../../utils/noxDiscoverUtils';
import { isAcceptedBooking } from '../../utils/lieuxEventUtils';

function EventStaffRow({ booking, fr, language, onManage, onScanner }) {
  return (
    <NoxCard style={styles.row} padded={false}>
      <View style={styles.thumb}>
        <Ionicons name="people-outline" size={22} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <NoxText variant="form" style={styles.eventName} numberOfLines={2}>
          {booking.eventTitle}
        </NoxText>
        <NoxText variant="secondary">
          {formatEventDateLabel(booking.eventDate, language, { shortMonth: true, withYear: true })}
        </NoxText>
      </View>
      <View style={styles.rowActions}>
        <NoxButton
          label={fr ? 'Staff' : 'Staff'}
          variant="ghost"
          onPress={onManage}
          style={styles.smallBtn}
        />
        <TouchableOpacity style={styles.scanIcon} onPress={onScanner} hitSlop={8}>
          <Ionicons name="qr-code-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </NoxCard>
  );
}

export default function LieuxStaffPage() {
  const { goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const fr = language === 'fr';
  const [tab, setTab] = useState('staff');

  const { loading, refreshing, bookings, refresh } = useLieuxData(user?.token, language);

  const staffEvents = useMemo(
    () => bookings.filter((b) => isAcceptedBooking(b) && b.eventId),
    [bookings],
  );

  const tabs = [
    { id: 'staff', label: fr ? 'Staff événements' : 'Event staff' },
    { id: 'scanner', label: fr ? 'Accès scanner' : 'Scanner access' },
  ];

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
          <NoxText variant="titleSecondary">{fr ? 'Staff' : 'Staff'}</NoxText>
          <NoxText variant="secondary">
            {fr ? 'Équipe & scan billets' : 'Team & ticket scanning'}
          </NoxText>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <NoxTabs tabs={tabs} activeId={tab} onChange={setTab} style={styles.tabs} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: Spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />
        }
      >
        {tab === 'staff' ? (
          staffEvents.length === 0 ? (
            <NoxText variant="secondary" style={styles.empty}>
              {fr
                ? 'Aucun événement confirmé avec staff pour le moment.'
                : 'No confirmed events with staff yet.'}
            </NoxText>
          ) : (
            staffEvents.map((booking) => (
              <EventStaffRow
                key={booking.eventVenueId || booking.id}
                booking={booking}
                fr={fr}
                language={language}
                onManage={() =>
                  navigate('eventStaff', {
                    eventId: booking.eventId,
                    eventTitle: booking.eventTitle,
                  })
                }
                onScanner={() =>
                  navigate('lieuxScanner', { eventId: booking.eventId })
                }
              />
            ))
          )
        ) : (
          <View style={styles.scannerBlock}>
            <View style={styles.scannerIconWrap}>
              <Ionicons name="qr-code-outline" size={48} color={Colors.primary} />
            </View>
            <NoxText variant="titleSecondary" style={styles.scannerTitle}>
              {fr ? 'Scanner les billets' : 'Scan tickets'}
            </NoxText>
            <NoxText variant="secondary" style={styles.scannerSub}>
              {fr
                ? 'Accès réservé au staff autorisé sur les événements confirmés.'
                : 'Access for authorized staff on confirmed events only.'}
            </NoxText>
            <NoxButton
              label={fr ? 'Ouvrir le scanner' : 'Open scanner'}
              onPress={() => navigate('lieuxScanner')}
              style={{ marginTop: Spacing.xl, alignSelf: 'stretch' }}
            />
          </View>
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
  tabs: { marginHorizontal: Spacing.xl, marginVertical: Spacing.lg },
  empty: { textAlign: 'center', marginTop: Spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventName: { fontWeight: '700', marginBottom: 2 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  smallBtn: { paddingHorizontal: Spacing.sm },
  scanIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: primaryAlpha(0.1),
  },
  scannerBlock: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  scannerIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  scannerTitle: { textAlign: 'center', marginBottom: Spacing.sm },
  scannerSub: { textAlign: 'center', lineHeight: 20 },
});
