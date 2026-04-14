/**
 * Page Événements staff - Liste des événements où l'utilisateur (Communauté) est staff
 * Permet d'accéder au scan des billets pour chaque événement
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StaffEventsPage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, hideToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState([]);

  const fr = language === 'fr';

  const fetchData = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await api.getStaffEvents(user.token);
      if (res?.success && Array.isArray(res.events)) {
        setEvents(res.events);
      } else {
        setEvents([]);
      }
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur chargement' : 'Load error'));
      setEvents([]);
    }
  }, [user?.token, fr, showError]);

  useEffect(() => {
    if (user?.token) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }
  }, [user?.token, fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={fr ? 'Retour' : 'Back'}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{fr ? 'Événements staff' : 'Staff events'}</Text>
        <View style={styles.headerRight} />
      </View>
      <Text style={styles.subtitle}>
        {fr ? 'Événements où tu peux scanner les billets' : 'Events where you can scan tickets'}
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : events.length === 0 ? (
          <Text style={styles.emptyText}>
            {fr ? 'Aucun événement. Un organisateur doit t\'ajouter comme staff.' : 'No events. A booker must add you as staff.'}
          </Text>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <Image
                source={{ uri: normalizeMediaUrl(event.image) || 'https://via.placeholder.com/120' }}
                style={styles.eventImage}
              />
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                <Text style={styles.eventDate}>{formatEventDate(event.date)}</Text>
                {event.location ? (
                  <Text style={styles.eventLocation} numberOfLines={1}>{event.location}</Text>
                ) : null}
                <View style={styles.eventMeta}>
                  <Text style={styles.eventMetaText}>
                    {event.sold ?? 0} / {event.capacity ?? 0} {fr ? 'places' : 'spots'}
                  </Text>
                  <Text style={[styles.statusBadge, event.status === 'UPCOMING' && styles.statusUpcoming]}>
                    {event.status || 'UPCOMING'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => navigate('scanTicket', { eventId: event.id, eventTitle: event.title })}
                  accessibilityRole="button"
                  accessibilityLabel={
                    fr
                      ? `Scanner les billets pour ${event.title || 'cet événement'}`
                      : `Scan tickets for ${event.title || 'this event'}`
                  }
                >
                  <Ionicons name="qr-code" size={20} color={Colors.background} />
                  <Text style={styles.scanBtnText}>{fr ? 'Scanner billets' : 'Scan tickets'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 8 },
  title: { flex: 1, color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  headerRight: { width: 40 },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  loader: { marginTop: 40 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 24, textAlign: 'center' },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#141419',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.2)',
  },
  eventImage: { width: 100, height: 100 },
  eventInfo: { flex: 1, padding: 12 },
  eventTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  eventDate: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 2 },
  eventLocation: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  eventMetaText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  statusBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusUpcoming: { color: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.2)' },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  scanBtnText: { color: Colors.background, fontSize: 14, fontWeight: '700' },
});
