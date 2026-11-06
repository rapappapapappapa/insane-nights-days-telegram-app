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
import { NoxText, NoxCard, NoxScreenHeader, NoxInput } from '../../components/nox';

export default function SelectVenuePage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { selectedVenueId, returnTo, eventId, replaceMode } = routeParams || {};

  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.token) {
      fetchVenues();
    }
  }, [user?.token]);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const response = await api.getVenues(user.token);
      if (response && response.success && Array.isArray(response.venues)) {
        setVenues(response.venues);
      } else {
        setVenues([]);
      }
    } catch (error) {
      console.error('Erreur récupération lieux:', error);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVenuePress = (venue) => {
    navigate('venueProfile', {
      venueId: venue.id,
      venueName: venue.venueName,
      selectionMode: true,
      selectedVenueId: selectedVenueId,
      returnTo: returnTo || (replaceMode ? 'bookerDashboard' : 'selectVenue'),
      eventId: eventId || undefined,
      replaceMode: replaceMode || false,
    });
  };

  const filteredVenues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter((venue) => {
      const name = String(venue.venueName || '').toLowerCase();
      const address = String(venue.address || '').toLowerCase();
      const city = String(venue.city || '').toLowerCase();
      return name.includes(q) || address.includes(q) || city.includes(q);
    });
  }, [venues, searchQuery]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <NoxScreenHeader
        title={fr ? 'Sélectionner un lieu' : 'Select a venue'}
        subtitle={
          fr
            ? 'Appuyez sur un lieu pour voir son profil et le sélectionner'
            : 'Tap on a venue to view their profile and select it'
        }
        onBack={goBack}
      />

      <View style={styles.searchWrap}>
        <NoxInput
          placeholder={fr ? 'Rechercher un lieu…' : 'Search a venue…'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          icon={<Ionicons name="search-outline" size={20} color={Colors.textTertiary} />}
          rightSlot={
            searchQuery ? (
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
          {filteredVenues.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="business-outline" size={32} color={Colors.primary} />
              </View>
              <NoxText variant="titleSecondary" style={styles.emptyTitle}>
                {venues.length === 0
                  ? fr
                    ? 'Aucun lieu disponible'
                    : 'No venues available'
                  : fr
                    ? 'Aucun résultat'
                    : 'No results'}
              </NoxText>
            </View>
          ) : (
            filteredVenues.map((venue) => {
              const isSelected = selectedVenueId === venue.id;
              return (
                <TouchableOpacity
                  key={venue.id}
                  onPress={() => handleVenuePress(venue)}
                  activeOpacity={0.85}
                >
                  <NoxCard
                    style={[styles.card, isSelected && styles.cardSelected]}
                    padded={false}
                  >
                    <View style={styles.cardRow}>
                      <View style={styles.avatar}>
                        <Ionicons name="business-outline" size={22} color={primaryAlpha(0.7)} />
                      </View>
                      <View style={styles.cardInfo}>
                        <NoxText variant="form" style={styles.cardTitle} numberOfLines={1}>
                          {venue.venueName}
                        </NoxText>
                        <NoxText variant="secondary" numberOfLines={2}>
                          {venue.address}
                        </NoxText>
                        {venue.averageRatingGlobal > 0 ? (
                          <View style={styles.ratingRow}>
                            <NoxText variant="form" style={styles.ratingValue}>
                              {venue.averageRatingGlobal.toFixed(1)}
                            </NoxText>
                            <Ionicons name="star" size={14} color={Colors.primary} />
                          </View>
                        ) : null}
                      </View>
                      {isSelected ? (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark" size={18} color={Colors.text} />
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                      )}
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
  searchWrap: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
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
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: primaryAlpha(0.12),
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingValue: {
    color: Colors.primary,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
