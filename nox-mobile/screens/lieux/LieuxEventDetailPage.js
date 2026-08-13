import React, { useEffect, useMemo, useState } from 'react';
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
import { api } from '../../api/config';
import { useLieuxData } from '../../hooks/useLieuxData';
import { NoxText, NoxButton } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import {
  formatEventDateLabel,
  formatEventTimeLabel,
} from '../../utils/noxDiscoverUtils';
import { findBookingByEventVenueId } from '../../utils/lieuxEventUtils';

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <NoxText variant="secondary">{label}</NoxText>
      <NoxText variant="form" style={styles.infoValue}>
        {value || '—'}
      </NoxText>
    </View>
  );
}

const formatTimeRange = (time, durationHours) => {
  if (!time) return '—';
  if (!durationHours) return formatEventTimeLabel(time);
  const normalized = String(time).replace(/[hH]/g, ':');
  const parts = normalized.split(':').map((p) => parseInt(p, 10));
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const endH = (h + Number(durationHours)) % 24;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}h${pad(m)} → ${pad(endH)}h${pad(m)}`;
};

export default function LieuxEventDetailPage() {
  const { goBack, navigate, routeParams } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const fr = language === 'fr';

  const eventVenueId = routeParams?.eventVenueId;
  const { loading: bookingsLoading, bookings, statusLabel } = useLieuxData(user?.token, language);
  const booking = findBookingByEventVenueId(bookings, eventVenueId);

  const [eventLoading, setEventLoading] = useState(false);
  const [event, setEvent] = useState(null);
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    if (!booking?.eventId) return;
    let cancelled = false;
    (async () => {
      setEventLoading(true);
      try {
        const [eventRes, staffRes] = await Promise.all([
          api.getEventById(booking.eventId),
          user?.token ? api.getEventStaff(user.token, booking.eventId).catch(() => null) : null,
        ]);
        if (!cancelled && eventRes?.success && eventRes.event) {
          setEvent(eventRes.event);
        }
        if (!cancelled && staffRes?.success && Array.isArray(staffRes.staff)) {
          setStaff(staffRes.staff);
        }
      } finally {
        if (!cancelled) setEventLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [booking?.eventId, user?.token]);

  const lineup = useMemo(() => {
    const djs = event?.djs || [];
    return djs.map((dj) => ({
      name: dj.artistName || dj.name || 'DJ',
      time: dj.setTime || '',
    }));
  }, [event]);

  if (!eventVenueId) {
    return (
      <View style={[styles.container, styles.centered]}>
        <NoxText variant="secondary">{fr ? 'Événement introuvable.' : 'Event not found.'}</NoxText>
      </View>
    );
  }

  if (bookingsLoading || !booking) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const invitationLabel = statusLabel(booking.invitationStatus);
  const schedule = formatTimeRange(booking.eventTime || event?.time, event?.durationHours);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <NoxText variant="titleSecondary" style={styles.headerTitle}>
            {booking.eventTitle}
          </NoxText>
          <NoxText variant="secondary">
            {formatEventDateLabel(booking.eventDate, language, { withYear: true })}
          </NoxText>
          <NoxText variant="secondary" style={styles.schedule}>
            {schedule}
          </NoxText>
          <NoxText variant="secondary">{invitationLabel}</NoxText>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() =>
            navigate('lieuxBookingChat', {
              eventVenueId,
              eventTitle: booking?.eventTitle,
              eventDate: booking?.eventDate,
              eventLocation: booking?.eventLocation,
            })
          }
          hitSlop={12}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 40 }}>
        {eventLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
        ) : null}

        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          {fr ? 'Informations événement' : 'Event information'}
        </NoxText>
        <InfoRow label={fr ? 'Nom' : 'Name'} value={booking.eventTitle} />
        <InfoRow label={fr ? 'Horaires' : 'Schedule'} value={schedule} />
        <InfoRow
          label={fr ? 'Participants attendus' : 'Expected attendees'}
          value={event?.expectedAttendees || event?.capacity || event?.maxCapacity}
        />
        <InfoRow label={fr ? 'Style' : 'Genre'} value={event?.genre} />
        <InfoRow label={fr ? 'Lieu' : 'Venue'} value={booking.eventLocation} />

        {booking.booker ? (
          <>
            <NoxText variant="titleSecondary" style={styles.sectionTitle}>
              {fr ? 'Organisateur' : 'Organizer'}
            </NoxText>
            <View style={styles.orgRow}>
              <View style={styles.orgAvatar}>
                <Ionicons name="people-outline" size={22} color={primaryAlpha(0.6)} />
              </View>
              <View style={{ flex: 1 }}>
                <NoxText variant="form" style={styles.orgName}>
                  {booking.booker.name}
                </NoxText>
                <NoxText variant="secondary">{booking.booker.type}</NoxText>
              </View>
            </View>
            {booking.booker.id ? (
              <NoxButton
                label={fr ? 'Voir le profil' : 'View profile'}
                variant="ghost"
                onPress={() => navigate('bookerProfile', { bookerId: booking.booker.id })}
                style={styles.profileBtn}
              />
            ) : null}
          </>
        ) : null}

        {lineup.length > 0 ? (
          <>
            <NoxText variant="titleSecondary" style={styles.sectionTitle}>
              Line-Up
            </NoxText>
            {lineup.map((row) => (
              <View key={`${row.name}-${row.time}`} style={styles.lineupRow}>
                <NoxText variant="form" style={styles.lineupName}>
                  {row.name}
                </NoxText>
                <NoxText variant="secondary">{row.time || '—'}</NoxText>
              </View>
            ))}
          </>
        ) : null}

        {staff.length > 0 ? (
          <>
            <NoxText variant="titleSecondary" style={styles.sectionTitle}>
              Staff
            </NoxText>
            {staff.map((member) => (
              <View key={member.id || member.userId} style={styles.lineupRow}>
                <NoxText variant="form" style={styles.lineupName}>
                  {member.name || member.username || 'Staff'}
                </NoxText>
                <NoxText variant="secondary">{member.role || member.staffRole || '—'}</NoxText>
              </View>
            ))}
            <NoxButton
              label={fr ? 'Gérer le staff' : 'Manage staff'}
              variant="ghost"
              onPress={() =>
                navigate('eventStaff', {
                  eventId: booking.eventId,
                  eventTitle: booking.eventTitle,
                })
              }
              style={styles.profileBtn}
            />
          </>
        ) : null}

        {event?.description ? (
          <>
            <NoxText variant="titleSecondary" style={styles.sectionTitle}>
              {fr ? 'Description' : 'Description'}
            </NoxText>
            <NoxText variant="description">{event.description}</NoxText>
          </>
        ) : null}
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
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.sm },
  headerTitle: { fontSize: 18, textAlign: 'center' },
  schedule: { color: Colors.primary, marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    marginTop: Spacing.xxl,
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
  infoValue: { textAlign: 'right', fontWeight: '600', flex: 1 },
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
  profileBtn: { marginTop: Spacing.md, alignSelf: 'flex-start', paddingHorizontal: 24 },
  lineupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  lineupName: { fontWeight: '700' },
});
