import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { api } from '../../api/config';

const mockDjs = [
  {
    id: 'dj-1',
    name: 'DJ Neon',
    genre: 'Electro',
    currentRank: 1,
    score: 982,
    followers: 18420,
    lastEvent: 'Insane Night - Soirée Electro',
    wins: 8,
    losses: 1,
    trend: '+3',
  },
  {
    id: 'dj-2',
    name: 'Mixmaster Nova',
    genre: 'Techno',
    currentRank: 2,
    score: 951,
    followers: 16540,
    lastEvent: 'Techno Underground Session',
    wins: 6,
    losses: 2,
    trend: '+1',
  },
  {
    id: 'dj-3',
    name: 'Bass Storm',
    genre: 'Drum & Bass',
    currentRank: 3,
    score: 917,
    followers: 15210,
    lastEvent: 'Bass Revolution - Drum & Bass',
    wins: 7,
    losses: 3,
    trend: '-1',
  },
];

export default function RankingPage({ onNavigate }) {
  const [ranking, setRanking] = useState(mockDjs);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRanking = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await api.getDjRanking();
      if (data?.success && Array.isArray(data.djs)) {
        setRanking(data.djs);
      } else {
        setRanking(mockDjs);
      }
    } catch (error) {
      setRanking(mockDjs);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRanking();
  }, []);

  const topThree = useMemo(() => ranking.slice(0, 3), [ranking]);
  const others = useMemo(() => ranking.slice(3), [ranking]);

  if (loading && ranking.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FF1744" />
        <Text style={styles.loadingText}>Chargement du classement...</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('menu')}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => onNavigate('menu')}>
          <Text style={styles.backButtonTopText}>← Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchRanking(true)} tintColor="#FF1744" />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🏆</Text>
          <Text style={styles.headerTitle}>Classement des DJs</Text>
          <Text style={styles.headerSubtitle}>Découvrez les artistes les plus chauds du moment</Text>
        </View>

        <View style={styles.podium}>
          {topThree.map((dj, index) => (
            <View key={dj.id} style={[styles.podiumStep, styles[`podiumStep${index + 1}`]]}>
              <Text style={styles.podiumRank}>#{dj.currentRank}</Text>
              <Text style={styles.podiumName}>{dj.name}</Text>
              <Text style={styles.podiumGenre}>{dj.genre}</Text>
              <Text style={styles.podiumScore}>{dj.score} pts</Text>
              <Text style={styles.podiumFollowers}>{dj.followers.toLocaleString()} fans</Text>
              <Text style={styles.podiumTrend}>{dj.trend}</Text>
            </View>
          ))}
        </View>

        <View style={styles.list}>
          {others.map((dj) => (
            <View key={dj.id} style={styles.listItem}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>#{dj.currentRank}</Text>
              </View>
              <View style={styles.listContent}>
                <Text style={styles.listName}>{dj.name}</Text>
                <Text style={styles.listMeta}>
                  {dj.genre} • {dj.followers.toLocaleString()} fans • {dj.wins} victoires / {dj.losses} défaites
                </Text>
                <Text style={styles.listEvent}>Dernier événement : {dj.lastEvent}</Text>
              </View>
              <Text style={[styles.listTrend, dj.trend.startsWith('-') ? styles.trendDown : styles.trendUp]}>
                {dj.trend}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#0b0b0e',
  },
  backButtonTop: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonTopText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b0b0e',
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
    borderColor: 'rgba(255,23,68,0.4)',
  },
  backButtonText: {
    color: '#FF1744',
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
    borderColor: 'rgba(255,23,68,0.3)',
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  podiumStep1: {
    transform: [{ translateY: -12 }],
    borderColor: '#FF1744',
    backgroundColor: '#201f1a',
  },
  podiumStep2: {
    borderColor: 'rgba(255,23,68,0.2)',
  },
  podiumStep3: {
    borderColor: 'rgba(255,23,68,0.2)',
  },
  podiumRank: {
    color: '#FF1744',
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
    color: '#FF1744',
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
    borderColor: 'rgba(255,23,68,0.2)',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.1)',
    gap: 14,
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF1744',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    color: '#0b0b0e',
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

