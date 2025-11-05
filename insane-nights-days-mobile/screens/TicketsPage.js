import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export default function TicketsPage() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎟️ Mes Tickets</Text>
        <Text style={styles.subtitle}>Gérez vos tickets et événements</Text>
      </View>

      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🎫</Text>
        <Text style={styles.emptyTitle}>Aucun ticket</Text>
        <Text style={styles.emptyText}>
          Vous n'avez pas encore de tickets. Explorez les événements pour en acheter !
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    marginTop: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
