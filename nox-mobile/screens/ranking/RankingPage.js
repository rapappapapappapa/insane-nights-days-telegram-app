import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { api } from '../../api/config';

function normalizeRankingDj(dj, index) {
  const totalRatings =
    dj.totalRatings ??
    (Number(dj.totalRatingsCommunity || 0) +
      Number(dj.totalRatingsBooker || 0) +
      Number(dj.totalRatingsVenue || 0));

  return {
    id: dj.id || dj.userId || `dj-${index}`,
    userId: dj.userId,
    name: dj.artistName || dj.name || dj.username || 'DJ',
    genre: dj.genre || '—',
    currentRank: dj.currentRank ?? index + 1,
    score: dj.score ?? Math.round(Number(dj.averageRatingGlobal || 0) * 100),
    followers: Number(dj.followers ?? totalRatings ?? 0),
    lastEvent: dj.lastEvent || dj.city || '—',
    wins: Number(dj.wins ?? 0),
    losses: Number(dj.losses ?? 0),
    trend: typeof dj.trend === 'string' ? dj.trend : '—',
  };
}

export default function RankingPage() {
  const { language } = useLanguage();
  const { goBack, navigate } = useNavigation();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRanking = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await api.getDjRanking();
      if (data?.success && Array.isArray(data.djs)) {
        setRanking(data.djs.map(normalizeRankingDj));
      } else {
        setRanking([]);
      }
    } catch (error) {
      console.error('Erreur classement DJs:', error);
      setRanking([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const topThree = useMemo(() => ranking.slice(0, 3), [ranking]);
  const others = useMemo(() => ranking.slice(3), [ranking]);

  const handleDjPress = (dj) => {
    navigate('djProfile', {
      djId: dj.id,
      djUserId: dj.userId,
      djName: dj.name,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>
          {language === 'fr' ? 'Chargement du classement...' : 'Loading ranking...'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>
            ← {language === 'fr' ? 'Retour' : 'Back'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButtonTop} onPress={goBack}>
          <Text style={styles.backButtonTopText}>
            ← {language === 'fr' ? 'Retour' : 'Back'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchRanking(true)} tintColor={Colors.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🏆</Text>
          <Text style={styles.headerTitle}>
            {language === 'fr' ? 'Classement des DJs' : 'DJ Ranking'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {language === 'fr'
              ? 'Découvrez les artistes les plus chauds du moment'
              : 'Discover the hottest artists right now'}
          </Text>
        </View>

        {ranking.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {language === 'fr' ? 'Aucun DJ classé pour le moment.' : 'No ranked DJs yet.'}
            </Text>
          </View>
        ) : (
          <>
            {topThree.length > 0 && (
              <View style={styles.podium}>
                {topThree.map((dj, index) => (
                  <TouchableOpacity
                    key={dj.id}
                    style={[styles.podiumStep, styles[`podiumStep${index + 1}`]]}
                    onPress={() => handleDjPress(dj)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.podiumRank}>#{dj.currentRank}</Text>
                    <Text style={styles.podiumName}>{dj.name}</Text>
                    <Text style={styles.podiumGenre}>{dj.genre}</Text>
                    <Text style={styles.podiumScore}>{dj.score} pts</Text>
                    <Text style={styles.podiumFollowers}>
                      {dj.followers.toLocaleString()} {language === 'fr' ? 'avis' : 'reviews'}
                    </Text>
                    {dj.trend !== '—' ? <Text style={styles.podiumTrend}>{dj.trend}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {others.length > 0 && (
              <View style={styles.list}>
                {others.map((dj) => (
                  <TouchableOpacity
                    key={dj.id}
                    style={styles.listItem}
                    onPress={() => handleDjPress(dj)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>#{dj.currentRank}</Text>
                    </View>
                    <View style={styles.listContent}>
                      <Text style={styles.listName}>{dj.name}</Text>
                      <Text style={styles.listMeta}>
                        {dj.genre} • {dj.followers.toLocaleString()}{' '}
                        {language === 'fr' ? 'avis' : 'reviews'} • {dj.score} pts
                      </Text>
                      <Text style={styles.listEvent}>
                        {language === 'fr' ? 'Ville' : 'City'} : {dj.lastEvent}
                      </Text>
                    </View>
                    {dj.trend !== '—' ? (
                      <Text
                        style={[
                          styles.listTrend,
                          dj.trend.startsWith('-') ? styles.trendDown : styles.trendUp,
                        ]}
                      >
                        {dj.trend}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: Colors.background,
  },
  backButtonTop: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonTopText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
  backButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.4)',
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 28,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 42,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    textAlign: 'center',
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  podiumStep: {
    flex: 1,
    marginHorizontal: 6,
    backgroundColor: '#1a1a1f',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.3)',
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  podiumStep1: {
    transform: [{ translateY: -12 }],
    borderColor: Colors.primary,
    backgroundColor: '#201f1a',
  },
  podiumStep2: {
    borderColor: 'rgba(77,163,255,0.2)',
  },
  podiumStep3: {
    borderColor: 'rgba(77,163,255,0.2)',
  },
  podiumRank: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  podiumName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  podiumGenre: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  podiumScore: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  podiumFollowers: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  podiumTrend: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    backgroundColor: '#1a1a1f',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.2)',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(77,163,255,0.1)',
    gap: 14,
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: '900',
  },
  listContent: {
    flex: 1,
    gap: 6,
  },
  listName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  listMeta: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  listEvent: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  listTrend: {
    fontSize: 16,
    fontWeight: '700',
  },
  trendUp: {
    color: '#10b981',
  },
  trendDown: {
    color: '#ef4444',
  },
});
