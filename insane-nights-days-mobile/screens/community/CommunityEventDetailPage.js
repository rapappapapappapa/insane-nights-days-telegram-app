import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { api, normalizeMediaUrl } from '../../api/config';
import { NoxText, NoxButton } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { getEventPurchaseScreen } from '../../utils/noxNavigation';
import { formatEventDateLabel, formatEventTimeLabel } from '../../utils/noxDiscoverUtils';

function InfoLine({ label, value }) {
  return (
    <View style={styles.infoLine}>
      <NoxText variant="secondary" style={styles.infoLabel}>
        {label}
      </NoxText>
      <NoxText variant="form" style={styles.infoValue}>
        {value || '—'}
      </NoxText>
    </View>
  );
}

const formatTimeRange = (time, durationHours) => {
  if (!time) return '';
  if (!durationHours) return formatEventTimeLabel(time);
  const normalized = String(time).replace(/[hH]/g, ':');
  const parts = normalized.split(':').map((p) => parseInt(p, 10));
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const endH = (h + Number(durationHours)) % 24;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}h${pad(m)} → ${pad(endH)}h${pad(m)}`;
};

export default function CommunityEventDetailPage() {
  const { goBack, navigate, routeParams } = useNavigation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const fr = language === 'fr';

  const eventId = routeParams?.eventId;
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [imageBroken, setImageBroken] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.getEventById(eventId);
        if (!cancelled && data?.success && data.event) {
          setEvent(data.event);
        } else if (!cancelled) {
          setEvent(null);
        }
      } catch {
        if (!cancelled) setEvent(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const lineup = useMemo(() => {
    const djs = event?.djs || [];
    return djs.map((dj) => ({
      name: dj.artistName || dj.name || 'DJ',
      time: dj.setTime || '',
    }));
  }, [event]);

  const venueLabel = useMemo(() => {
    if (event?.venueName && event?.location) return `${event.venueName} - ${event.location}`;
    return event?.venueName || event?.location || '';
  }, [event]);

  const organizerName = event?.booker?.name || event?.bookerName || '';

  if (!eventId) {
    return (
      <View style={[styles.container, styles.centered]}>
        <NoxText variant="secondary">{fr ? 'Événement introuvable.' : 'Event not found.'}</NoxText>
        <NoxButton label={fr ? 'Retour' : 'Back'} onPress={goBack} style={{ marginTop: Spacing.lg }} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.centered]}>
        <NoxText variant="secondary">{fr ? 'Impossible de charger cet événement.' : 'Unable to load this event.'}</NoxText>
        <NoxButton label={fr ? 'Retour' : 'Back'} onPress={goBack} style={{ marginTop: Spacing.lg }} />
      </View>
    );
  }

  const heroImage = event.image ? normalizeMediaUrl(event.image) : null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.hero}>
        {heroImage && !imageBroken ? (
          <Image
            source={{ uri: heroImage }}
            style={StyleSheet.absoluteFillObject}
            onError={() => setImageBroken(true)}
          />
        ) : (
          <Ionicons name="flame-outline" size={40} color={primaryAlpha(0.7)} />
        )}
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
            {event.title}
          </NoxText>
          <NoxText variant="secondary" style={styles.heroDate}>
            {formatEventDateLabel(event.date, language)}
            {event.time ? ` • ${formatEventTimeLabel(event.time)}` : ''}
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
        <InfoLine label={fr ? 'Nom' : 'Name'} value={event.title} />
        <InfoLine
          label={fr ? 'Horaires' : 'Schedule'}
          value={formatTimeRange(event.time, event.durationHours)}
        />
        <InfoLine
          label={fr ? 'Participants attendus' : 'Expected attendees'}
          value={event.expectedAttendees || event.capacity || event.maxCapacity}
        />
        <InfoLine label={fr ? 'Style' : 'Genre'} value={event.genre} />
        <InfoLine label={fr ? 'Lieu' : 'Venue'} value={venueLabel} />

        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          {fr ? 'Description' : 'Description'}
        </NoxText>
        <NoxText variant="description">{event.description || (fr ? 'Pas de description.' : 'No description.')}</NoxText>

        {lineup.length > 0 ? (
          <>
            <NoxText variant="titleSecondary" style={styles.sectionTitle}>
              Line-Up
            </NoxText>
            {lineup.map((dj) => (
              <View key={`${dj.name}-${dj.time}`} style={styles.lineupRow}>
                <NoxText variant="form" style={styles.lineupName}>
                  {dj.name}
                </NoxText>
                <NoxText variant="secondary">{dj.time || '—'}</NoxText>
              </View>
            ))}
          </>
        ) : null}

        {organizerName ? (
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
                  {organizerName}
                </NoxText>
              </View>
            </View>
            {event.booker?.id ? (
              <NoxButton
                label={fr ? 'Voir le profil' : 'View profile'}
                variant="ghost"
                onPress={() => navigate('bookerProfile', { bookerId: event.booker.id })}
                style={styles.profileBtn}
              />
            ) : null}
          </>
        ) : null}

        <NoxButton
          label={fr ? 'Acheter des billets' : 'Buy tickets'}
          onPress={() => navigate(getEventPurchaseScreen(), { eventId: event.id })}
          style={{ marginTop: Spacing.xxl }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  hero: {
    height: 240,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: Spacing.md,
    borderRadius: Radius.md,
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
  profileBtn: { marginTop: Spacing.md, alignSelf: 'flex-start', paddingHorizontal: 24 },
});
