import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLieuxData } from '../../hooks/useLieuxData';
import { NoxText, NoxButton } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { formatEventDateLabel } from '../../utils/noxDiscoverUtils';

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <NoxText variant="secondary" style={styles.infoLabel}>
        {label}
      </NoxText>
      <NoxText variant="form" style={styles.infoValue}>
        {value || '—'}
      </NoxText>
    </View>
  );
}

const DECISIONS = [
  { id: 'accept', labelFr: 'Confirmé', labelEn: 'Confirmed' },
  { id: 'negotiate', labelFr: 'À négocier', labelEn: 'To negotiate' },
  { id: 'reject', labelFr: 'Refusé', labelEn: 'Refused' },
];

export default function LieuxRequestDetailPage() {
  const { goBack, navigate, routeParams } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const fr = language === 'fr';

  const eventVenueId = routeParams?.eventVenueId;
  const [decision, setDecision] = useState(null);
  const [processing, setProcessing] = useState(false);

  const { loading, bookings, respondToBooking, statusLabel, refresh } = useLieuxData(
    user?.token,
    language,
  );

  const booking = useMemo(
    () =>
      bookings.find(
        (b) => String(b.eventVenueId || b.id) === String(eventVenueId),
      ) || bookings[0],
    [bookings, eventVenueId],
  );

  const openBookingChat = () => {
    const id = booking?.eventVenueId || booking?.id;
    if (!id) return;
    // Repli legacy temporaire — Phase B1 : lieuxBookingChat
    navigate('venueDashboard', { openChatEventVenueId: id });
  };

  const handleDecision = async (decisionId) => {
    if (!booking || processing) return;
    setDecision(decisionId);

    if (decisionId === 'negotiate') {
      openBookingChat();
      return;
    }

    setProcessing(true);
    try {
      if (decisionId === 'accept') {
        await respondToBooking(booking.eventVenueId || booking.id, 'accept');
      } else if (decisionId === 'reject') {
        await respondToBooking(booking.eventVenueId || booking.id, 'reject');
      }
      await refresh();
      goBack();
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.container, styles.centered]}>
        <NoxText variant="secondary">{fr ? 'Demande introuvable.' : 'Request not found.'}</NoxText>
        <NoxButton label={fr ? 'Retour' : 'Back'} onPress={goBack} style={{ marginTop: Spacing.lg }} />
      </View>
    );
  }

  const organizer = booking.booker?.name || (fr ? 'Organisateur' : 'Organizer');
  const payment =
    booking.paymentAmount != null
      ? `${booking.paymentAmount}${booking.paymentCurrency === 'eur' ? '€' : ` ${booking.paymentCurrency}`}`
      : '—';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <NoxText variant="titleSecondary" style={styles.orgName}>
            {organizer}
          </NoxText>
          <NoxText variant="secondary" style={styles.eventDate}>
            {formatEventDateLabel(booking.eventDate, language, { withYear: true })}
          </NoxText>
          <NoxText variant="secondary" style={styles.sentDate}>
            {booking.eventTitle}
          </NoxText>
        </View>
        <TouchableOpacity hitSlop={12} style={styles.headerBtn} onPress={openBookingChat}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.statusWrap}>
        <View style={styles.statusBadge}>
          <NoxText variant="secondary" style={styles.statusText}>
            {statusLabel(booking.invitationStatus)}
          </NoxText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          {fr ? 'Informations événement' : 'Event information'}
        </NoxText>

        <InfoRow
          label={fr ? 'Date' : 'Date'}
          value={formatEventDateLabel(booking.eventDate, language, { withYear: true })}
        />
        <InfoRow label={fr ? 'Lieu' : 'Location'} value={booking.eventLocation} />
        <InfoRow label={fr ? 'Budget / paiement' : 'Budget / payment'} value={payment} />
        <InfoRow label={fr ? 'Statut événement' : 'Event status'} value={booking.eventStatus} />

        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          {fr ? 'Décision' : 'Decision'}
        </NoxText>

        {DECISIONS.map((d) => (
          <TouchableOpacity
            key={d.id}
            style={[styles.decisionRow, decision === d.id && styles.decisionRowActive]}
            onPress={() => handleDecision(d.id)}
            disabled={processing}
          >
            <NoxText variant="form">{fr ? d.labelFr : d.labelEn}</NoxText>
            <View style={[styles.radio, decision === d.id && styles.radioSelected]}>
              {decision === d.id ? <View style={styles.radioDot} /> : null}
            </View>
          </TouchableOpacity>
        ))}

        {String(booking.invitationStatus).toUpperCase() === 'PENDING' ? (
          <NoxButton
            label={fr ? 'Accepter la demande' : 'Accept request'}
            onPress={() => handleDecision('accept')}
            loading={processing}
            style={{ marginTop: Spacing.xl }}
          />
        ) : (
          <NoxButton
            label={fr ? 'Retour aux disponibilités' : 'Back to availability'}
            variant="ghost"
            onPress={() => navigate('lieuxAvailability', { focusPending: true })}
            style={{ marginTop: Spacing.xl }}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundCard,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  orgName: { fontSize: 18, textAlign: 'center' },
  eventDate: { marginTop: 2 },
  sentDate: { marginTop: 2, textAlign: 'center' },
  statusWrap: { alignItems: 'center', marginVertical: Spacing.lg },
  statusBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: primaryAlpha(0.15),
    borderWidth: 1,
    borderColor: primaryAlpha(0.35),
  },
  statusText: { color: Colors.primary },
  sectionTitle: {
    fontSize: 16,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  infoLabel: { flex: 1 },
  infoValue: { flex: 1, textAlign: 'right', fontWeight: '600' },
  decisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  decisionRowActive: { backgroundColor: primaryAlpha(0.06) },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
});
