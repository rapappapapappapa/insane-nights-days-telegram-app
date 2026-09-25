import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Layout, Spacing } from '../../constants/theme';
import { NoxText, NoxInput, NoxCard, NoxScreenHeader } from '../../components/nox';

function prestationGenresLabel(p) {
  if (!Array.isArray(p?.prestationGenres) || p.prestationGenres.length === 0) return '';
  return p.prestationGenres.join(' · ');
}

/**
 * Sélection optionnelle d’un prestataire (profil UserPrestataire) pour un événement existant.
 */
export default function SelectPrestatairePage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <NoxScreenHeader
        title={fr ? 'Prestataire (optionnel)' : 'Service provider (optional)'}
        subtitle={
          fr
            ? 'Choisissez un prestataire pour cet événement'
            : 'Choose a provider for this event'
        }
        onBack={goBack}
      />

      <View style={styles.filtersContainer}>
        <NoxInput
          placeholder={fr ? 'Rechercher…' : 'Search…'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchInput}
          icon={<Ionicons name="search" size={20} color={Colors.textTertiary} />}
          rightSlot={
            searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            ) : null
          }
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <NoxText variant="secondary">{fr ? 'Chargement…' : 'Loading…'}</NoxText>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="briefcase-outline" size={32} color={Colors.primary} />
              </View>
              <NoxText variant="titleSecondary" style={styles.emptyTitle}>
                {fr ? 'Aucun prestataire trouvé.' : 'No providers found.'}
              </NoxText>
            </View>
          ) : (
            filtered.map((p) => {
              const genres = prestationGenresLabel(p);
              const location = [p.city, p.country].filter(Boolean).join(', ');
              const isSubmitting = submittingId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => handleSelect(p)}
                  disabled={!!submittingId}
                  activeOpacity={0.85}
                >
                  <NoxCard style={styles.card} padded={false}>
                    <View style={styles.cardRow}>
                      <View style={styles.avatar}>
                        <Ionicons name="briefcase-outline" size={22} color={primaryAlpha(0.7)} />
                      </View>
                      <View style={styles.cardInfo}>
                        <NoxText variant="form" style={styles.cardTitle} numberOfLines={1}>
                          {p.businessName || '—'}
                        </NoxText>
                        {genres ? (
                          <NoxText variant="secondary" numberOfLines={1}>
                            {genres}
                          </NoxText>
                        ) : null}
                        {location ? (
                          <NoxText variant="secondary" numberOfLines={1}>
                            {location}
                          </NoxText>
                        ) : null}
                        {isSubmitting ? (
                          <ActivityIndicator
                            size="small"
                            color={Colors.primary}
                            style={styles.submitting}
                          />
                        ) : null}
                      </View>
                      {!isSubmitting ? (
                        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                      ) : null}
                    </View>
                  </NoxCard>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filtersContainer: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.md,
  },
  searchInput: {
    marginBottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 2,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
  },
  card: {
    padding: Spacing.lg,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: primaryAlpha(0.12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontWeight: '700',
  },
  submitting: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
});
