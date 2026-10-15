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
import { Layout, Radius, Spacing } from '../../constants/theme';
import { NoxText, NoxInput, NoxCard, NoxScreenHeader } from '../../components/nox';

export default function SelectDjPage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const {
    selectedDjIds = [],
    eventId = null,
    slotIndex = null,
    slotIntent = 'fill',
    replaceDjId = null,
    isSlotMode = false,
    returnTo,
  } = routeParams || {}; // returnTo : écran après sélection (ex. bookerEventDashboard)

  const [djs, setDjs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    if (user?.token) {
      fetchAvailableDjs();
    }
  }, [user?.token]);

  const fetchAvailableDjs = async () => {
    setLoading(true);
    try {
      const response = await api.getAvailableDjs(user.token);
      if (response && response.success && Array.isArray(response.djs)) {
        setDjs(response.djs);
      } else {
        setDjs([]);
      }
    } catch (error) {
      console.error('Erreur récupération DJs disponibles:', error);
      setDjs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDjPress = (dj) => {
    navigate('djProfile', {
      djId: dj.id,
      djUserId: dj.userId,
      djName: dj.artistName,
      selectionMode: true,
      selectedDjIds: selectedDjIds,
      returnTo: returnTo || 'bookerDashboard',
      eventId: eventId || undefined,
      slotIndex: slotIndex,
      slotIntent: slotIntent || (replaceDjId ? 'replace' : 'fill'),
      replaceDjId: replaceDjId,
      isSlotMode: isSlotMode,
    });
  };

  const filteredDjs = useMemo(() => {
    return djs.filter((dj) => {
      const matchesSearch =
        searchQuery === '' ||
        dj.artistName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRating =
        minRating === 0 || (dj.averageRatingGlobal || 0) >= minRating;

      return matchesSearch && matchesRating;
    });
  }, [djs, searchQuery, minRating]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <NoxScreenHeader
        title={fr ? 'Sélectionner des DJs' : 'Select DJs'}
        subtitle={
          fr
            ? 'Appuyez sur un DJ pour voir son profil et le sélectionner'
            : 'Tap on a DJ to view their profile and select them'
        }
        onBack={goBack}
      />

      <View style={styles.filtersContainer}>
        <NoxInput
          placeholder={fr ? 'Rechercher un DJ...' : 'Search a DJ...'}
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

        <NoxText variant="secondary" style={styles.filterLabel}>
          {fr ? 'Note minimale' : 'Min rating'}
        </NoxText>
        <View style={styles.ratingButtons}>
          {[0, 3, 4, 4.5].map((rating) => {
            const active = minRating === rating;
            return (
              <TouchableOpacity
                key={rating}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setMinRating(rating)}
                activeOpacity={0.85}
              >
                <NoxText
                  variant="secondary"
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {rating === 0 ? (fr ? 'Toutes' : 'All') : `${rating}+`}
                </NoxText>
              </TouchableOpacity>
            );
          })}
        </View>
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
          {filteredDjs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="musical-notes-outline" size={32} color={Colors.primary} />
              </View>
              <NoxText variant="titleSecondary" style={styles.emptyTitle}>
                {fr ? 'Aucun DJ disponible' : 'No DJs available'}
              </NoxText>
            </View>
          ) : (
            filteredDjs.map((dj) => {
              const isSelected = selectedDjIds.includes(dj.userId);
              return (
                <TouchableOpacity
                  key={dj.userId}
                  onPress={() => handleDjPress(dj)}
                  activeOpacity={0.85}
                >
                  <NoxCard
                    style={[styles.card, isSelected && styles.cardSelected]}
                    padded={false}
                  >
                    <View style={styles.cardRow}>
                      <View style={styles.avatar}>
                        <NoxText variant="form" style={styles.avatarText}>
                          {dj.artistName?.charAt(0) || 'DJ'}
                        </NoxText>
                      </View>
                      <View style={styles.cardInfo}>
                        <NoxText variant="form" style={styles.cardTitle} numberOfLines={1}>
                          {dj.artistName || 'DJ'}
                        </NoxText>
                        <NoxText variant="secondary" numberOfLines={1}>
                          {fr ? 'Prix à convenir' : 'Price to agree'}
                        </NoxText>
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
  filtersContainer: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    marginBottom: 0,
  },
  filterLabel: {
    marginTop: Spacing.xs,
  },
  ratingButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundCard,
  },
  chipActive: {
    backgroundColor: primaryAlpha(0.15),
    borderColor: primaryAlpha(0.45),
  },
  chipText: {
    color: Colors.textTertiary,
  },
  chipTextActive: {
    color: Colors.primary,
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
  avatarText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontWeight: '700',
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
