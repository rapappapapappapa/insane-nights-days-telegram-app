import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';

function prestationGenresLabel(p) {
  if (!Array.isArray(p?.prestationGenres) || p.prestationGenres.length === 0) return '';
  return p.prestationGenres.join(' · ');
}

/**
 * Sélection optionnelle d’un prestataire (profil UserPrestataire) pour un événement existant.
 */
export default function SelectPrestatairePage() {
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { eventId = null, eventDate = null, returnTo = 'bookerDashboard' } = routeParams || {};

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    if (user?.token) fetchList();
  }, [user?.token]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const response = await api.getAvailablePrestataires(user.token, eventDate || null);
      if (response && response.success && Array.isArray(response.prestataires)) {
        setList(response.prestataires);
      } else {
        setList([]);
      }
    } catch (error) {
      console.error('Erreur prestataires disponibles:', error);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return list.filter((p) => {
      if (!q) return true;
      const genres = prestationGenresLabel(p);
      const name = `${p.businessName || ''} ${genres} ${p.city || ''}`.toLowerCase();
      return name.includes(q);
    });
  }, [list, searchQuery]);

  const handleSelect = async (p) => {
    if (!user?.token || !eventId || submittingId) return;
    setSubmittingId(p.id);
    try {
      const res = await api.addPrestataireToEvent(user.token, eventId, p.id);
      if (res?.success) {
        navigate(returnTo, { highlightEventId: eventId });
      }
    } catch (e) {
      console.error('addPrestataireToEvent', e);
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{language === 'fr' ? 'Chargement...' : 'Loading...'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'fr' ? 'Prestataire (optionnel)' : 'Service provider (optional)'}
        </Text>
        <TextInput
          style={styles.search}
          placeholder={language === 'fr' ? 'Rechercher…' : 'Search…'}
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>
            {language === 'fr' ? 'Aucun prestataire trouvé.' : 'No providers found.'}
          </Text>
        ) : (
          filtered.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.card}
              onPress={() => handleSelect(p)}
              disabled={!!submittingId}
            >
              <Text style={styles.cardTitle}>{p.businessName || '—'}</Text>
              <Text style={styles.cardSub}>{prestationGenresLabel(p)}</Text>
              {(p.city || p.country) && (
                <Text style={styles.cardSub}>
                  📍 {[p.city, p.country].filter(Boolean).join(', ')}
                </Text>
              )}
              {submittingId === p.id && <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 8 }} />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.text, marginTop: 12 },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { marginBottom: 8 },
  backButtonText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  headerTitle: { color: Colors.text, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  search: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
  },
  scroll: { padding: 16, paddingBottom: 40 },
  empty: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 24 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  cardSub: { color: 'rgba(255,255,255,0.7)', marginTop: 4, fontSize: 14 },
});
