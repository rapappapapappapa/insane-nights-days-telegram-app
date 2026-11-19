import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import { normalizeMediaUrl } from '../../api/normalizeMediaUrl';
import { openEventPreview } from '../../utils/noxNavigation';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Radius, Spacing } from '../../constants/theme';
import { NoxText } from '../../components/nox';

const WEEKDAYS_FR = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
const WEEKDAYS_EN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function dayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseEventDate(value) {
  const [y, m, d] = String(value || '').split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** 6 semaines max, commençant le lundi précédant le 1er du mois. */
function buildMonthGrid(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const lastOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const totalCells = Math.ceil((offset + lastOfMonth.getDate()) / 7) * 7;
  return Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function eventAddress(event) {
  const venueLine = [event.address, event.city].filter(Boolean).join(', ');
  return venueLine || event.location || event.venueName || '';
}

export default function CommunityAgendaPage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const locale = fr ? 'fr-FR' : 'en-US';
  const { navigate } = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [participating, setParticipating] = useState([]);
  const [interested, setInterested] = useState([]);
  const [tab, setTab] = useState('participant');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(null);

  const load = useCallback(async () => {
    if (!user?.token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await api.getMyAgenda(user.token);
      setParticipating(Array.isArray(res?.participating) ? res.participating : []);
      setInterested(Array.isArray(res?.interested) ? res.interested : []);
    } catch (e) {
      console.error('[CommunityAgendaPage] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.token]);

  useEffect(() => {
    load();
  }, [load]);

  const marksByDay = useMemo(() => {
    const map = new Map();
    const mark = (list, kind) =>
      list.forEach((ev) => {
        const d = parseEventDate(ev.date);
        if (!d) return;
        const key = dayKey(d);
        if (map.get(key) !== 'participant') map.set(key, kind);
      });
    mark(interested, 'interested');
    mark(participating, 'participant');
    return map;
  }, [participating, interested]);

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const todayKey = dayKey(new Date());

  const list = useMemo(() => {
    const source = tab === 'participant' ? participating : interested;
    if (!selectedDay) return source;
    return source.filter((ev) => {
      const d = parseEventDate(ev.date);
      return d && dayKey(d) === selectedDay;
    });
  }, [tab, participating, interested, selectedDay]);

  const shiftMonth = (delta) => {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    setSelectedDay(null);
  };

  const onDayPress = (d) => {
    const key = dayKey(d);
    if (selectedDay === key) {
      setSelectedDay(null);
      return;
    }
    setSelectedDay(key);
    const kind = marksByDay.get(key);
    if (kind) setTab(kind);
  };

  const monthLabel = month.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const weekdays = fr ? WEEKDAYS_FR : WEEKDAYS_EN;

  const renderDay = (d) => {
    const key = dayKey(d);
    const inMonth = d.getMonth() === month.getMonth();
    const kind = inMonth ? marksByDay.get(key) : null;
    const selected = selectedDay === key;
    return (
      <TouchableOpacity
        key={key}
        style={styles.dayCell}
        onPress={() => onDayPress(d)}
        disabled={!inMonth}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.dayCircle,
            kind === 'participant' && styles.dayParticipant,
            kind === 'interested' && styles.dayInterested,
            selected && !kind && styles.daySelected,
          ]}
        >
          <NoxText
            style={[
              styles.dayText,
              !inMonth && styles.dayTextOut,
              kind === 'participant' && styles.dayTextStrong,
            ]}
          >
            {d.getDate()}
          </NoxText>
        </View>
        {inMonth && (key === todayKey || selected) ? <View style={styles.dayDot} /> : <View style={styles.dayDotSpacer} />}
      </TouchableOpacity>
    );
  };

  const renderEvent = (ev, kind) => {
    const d = parseEventDate(ev.date);
    const dateLabel = d
      ? d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    const image = normalizeMediaUrl(ev.image);
    const address = eventAddress(ev);
    return (
      <TouchableOpacity
        key={ev.id}
        style={styles.eventCard}
        activeOpacity={0.85}
        onPress={() => openEventPreview(navigate, user?.activeProfileType, ev.id)}
      >
        {image ? (
          <Image source={{ uri: image }} style={styles.eventImage} />
        ) : (
          <View style={[styles.eventImage, styles.eventImagePlaceholder]}>
            <Ionicons name="musical-notes-outline" size={28} color={Colors.textTertiary} />
          </View>
        )}
        <View style={styles.eventBody}>
          <NoxText style={styles.eventTitle} numberOfLines={1}>
            {ev.title}
          </NoxText>
          {dateLabel ? (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
              <NoxText style={styles.metaText} numberOfLines={1}>
                {dateLabel}
              </NoxText>
            </View>
          ) : null}
          {address ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
              <NoxText style={styles.metaText} numberOfLines={1}>
                {address}
              </NoxText>
            </View>
          ) : null}
          <View style={styles.badge}>
            <Ionicons
              name={kind === 'participant' ? 'ticket' : 'ellipse-outline'}
              size={12}
              color={Colors.primaryLight}
            />
            <NoxText style={styles.badgeText}>
              {kind === 'participant'
                ? fr ? 'Billet confirmé' : 'Ticket confirmed'
                : fr ? 'Intéressé' : 'Interested'}
            </NoxText>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.text} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  const emptyText = selectedDay
    ? fr ? 'Rien de prévu ce jour-là.' : 'Nothing planned that day.'
    : tab === 'participant'
      ? fr ? 'Aucun billet pour le moment. Tes soirées apparaîtront ici.' : 'No tickets yet.'
      : fr ? 'Touche le cœur d’un événement pour le retrouver ici.' : 'Tap the heart on an event to find it here.';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <NoxText variant="title" style={styles.title}>
          Agenda
        </NoxText>
        <NoxText style={styles.subtitle}>{fr ? 'Communauté NOX' : 'NOX Community'}</NoxText>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={styles.legendDotFull} />
            <NoxText style={styles.legendText}>Participant</NoxText>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendDotRing} />
            <NoxText style={styles.legendText}>{fr ? 'Intéressé' : 'Interested'}</NoxText>
          </View>
        </View>

        <View style={styles.calendar}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity style={styles.arrowBtn} onPress={() => shiftMonth(-1)} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={Colors.text} />
            </TouchableOpacity>
            <NoxText style={styles.monthLabel}>
              {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
            </NoxText>
            <TouchableOpacity style={styles.arrowBtn} onPress={() => shiftMonth(1)} hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {weekdays.map((w) => (
              <NoxText key={w} style={styles.weekday}>
                {w}
              </NoxText>
            ))}
          </View>
          <View style={styles.grid}>{grid.map(renderDay)}</View>
        </View>

        <View style={styles.segment}>
          {[
            { id: 'participant', label: 'Participant' },
            { id: 'interested', label: fr ? 'Intéressé' : 'Interested' },
          ].map((s) => {
            const active = tab === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setTab(s.id)}
                activeOpacity={0.8}
              >
                <NoxText style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {s.label}
                </NoxText>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : list.length === 0 ? (
          <NoxText variant="secondary" style={styles.empty}>
            {emptyText}
          </NoxText>
        ) : (
          list.map((ev) => renderEvent(ev, tab))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const CELL = `${100 / 7}%`;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingTop: Spacing.xl,
    paddingBottom: 140,
    gap: Spacing.md,
  },
  title: { fontSize: 38, lineHeight: 44 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginTop: -Spacing.sm },
  legend: { flexDirection: 'row', gap: Spacing.xxl, marginVertical: Spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  legendDotFull: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primary },
  legendDotRing: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: Colors.primary },
  legendText: { fontSize: 14, color: Colors.textSecondary },
  calendar: {
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundCard,
    padding: Spacing.md,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { fontFamily: FontFamily.bold, fontSize: 18, color: Colors.text },
  weekRow: { flexDirection: 'row', marginBottom: Spacing.xs },
  weekday: {
    width: CELL,
    textAlign: 'center',
    fontSize: 10,
    color: Colors.textTertiary,
    letterSpacing: 0.4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: CELL, alignItems: 'center', paddingVertical: 2 },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayParticipant: { backgroundColor: Colors.primary },
  dayInterested: { borderWidth: 1.5, borderColor: Colors.primary },
  daySelected: { backgroundColor: primaryAlpha(0.2) },
  dayText: { fontSize: 13, color: Colors.text },
  dayTextOut: { color: Colors.textMuted },
  dayTextStrong: { fontFamily: FontFamily.bold },
  dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: 2 },
  dayDotSpacer: { width: 4, height: 4, marginTop: 2 },
  segment: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundCard,
    marginTop: Spacing.xs,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderRadius: Radius.pill,
  },
  segmentItemActive: {
    backgroundColor: primaryAlpha(0.18),
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  segmentText: { fontSize: 14, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.primaryLight, fontFamily: FontFamily.medium },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundCard,
    overflow: 'hidden',
  },
  eventImage: { width: 112, height: 112 },
  eventImagePlaceholder: {
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventBody: { flex: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 4 },
  eventTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { flex: 1, fontSize: 12, color: Colors.textSecondary },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 0.5,
    borderColor: primaryAlpha(0.6),
    backgroundColor: primaryAlpha(0.15),
  },
  badgeText: { fontSize: 11, color: Colors.primaryLight },
  chevron: { marginRight: Spacing.md },
  empty: { textAlign: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.lg },
});
