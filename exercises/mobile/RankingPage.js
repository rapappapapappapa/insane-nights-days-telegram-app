import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';

// TODO: remplace ce mock par des données venant du backend plus tard
const mockRanking = [
  { id: '1', name: 'DJ Neon', score: 982 },
  { id: '2', name: 'Bass Storm', score: 915 },
  { id: '3', name: 'Mixmaster Nova', score: 860 },
  { id: '4', name: 'DJ Cyber', score: 820 },
];

export default function RankingPage({ onBack = () => {} }) {
  const [ranking/*, setRanking*/] = useState(mockRanking);

  // TODO: ajouter useEffect + fetch vers /api/djs quand le backend l’exposera
  // useEffect(() => { ... }, []);

  const renderItem = ({ item, index }) => (
    <View style={styles.card}>
      <Text style={styles.position}>{index + 1}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.score}>{item.score} pts</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>🏆 Classement DJs</Text>
      <Text style={styles.subtitle}>
        TODO : récupérer la vraie data, trier par score décroissant,
        surligner le top 3, etc.
      </Text>

      <FlatList
        data={ranking}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backText: {
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
    marginBottom: 24,
  },
  list: {
    marginTop: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1f',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ff7a1a',
  },
  position: {
    color: '#ff7a1a',
    fontSize: 20,
    fontWeight: '800',
    width: 32,
    textAlign: 'center',
  },
  info: {
    marginLeft: 12,
  },
  name: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  score: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
});
