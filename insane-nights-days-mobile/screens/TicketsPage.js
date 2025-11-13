import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const formatPurchaseDate = (dateString) => {
  if (!dateString) {
    return '';
  }
  try {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export default function TicketsPage({ onNavigate, tickets = [], onRemoveTicket }) {
  const hasTickets = useMemo(() => tickets.length > 0, [tickets]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => onNavigate('menu')}>
          <Text style={styles.backButtonTopText}>← Retour</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🎟️ Mes Tickets</Text>
          <Text style={styles.subtitle}>Retrouvez ici vos tickets et accès blockchain</Text>
        </View>

        {!hasTickets ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎫</Text>
            <Text style={styles.emptyTitle}>Aucun ticket pour l'instant</Text>
            <Text style={styles.emptyText}>
              Explorez les événements pour acheter vos premiers tickets Insane Nights & Days.
            </Text>
          </View>
        ) : (
          <View style={styles.ticketList}>
            {tickets.map(ticket => (
              <View key={ticket.eventId} style={styles.ticketCard}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => onNavigate('eventDetail', { eventId: ticket.eventId })}
                >
                  <View style={styles.ticketHeader}>
                    <View style={styles.ticketTitleWrapper}>
                      <Text style={styles.ticketTitle}>{ticket.title}</Text>
                      <Text style={styles.ticketDate}>
                        {ticket.date} {ticket.time ? `• ${ticket.time}` : ''}
                      </Text>
                      <Text style={styles.ticketLocation}>{ticket.location}</Text>
                    </View>
                    <View style={styles.ticketPriceWrapper}>
                      {ticket.quantity > 1 ? (
                        <Text style={styles.ticketQuantity}>×{ticket.quantity}</Text>
                      ) : null}
                      <Text style={styles.ticketPrice}>{ticket.price}€</Text>
                      <Text style={styles.ticketStatus}>{ticket.status ?? 'confirmé'}</Text>
                    </View>
                  </View>
                  <View style={styles.ticketFooter}>
                    <Text style={styles.ticketRef}>
                      {ticket.codes?.[ticket.codes.length - 1] ?? ticket.eventId}
                    </Text>
                    <Text style={styles.ticketPurchase}>
                      {`Réservé le ${formatPurchaseDate(ticket.lastPurchasedAt)}`}
                    </Text>
                  </View>
                </TouchableOpacity>
                {onRemoveTicket ? (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => onRemoveTicket(ticket.eventId)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️ Supprimer</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        )}
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
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  ticketList: {
    gap: 16,
  },
  ticketCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.25)',
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  ticketTitleWrapper: {
    flex: 1,
    gap: 4,
  },
  ticketTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  ticketDate: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
  ticketLocation: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  ticketPriceWrapper: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  ticketPrice: {
    color: '#ff7a1a',
    fontSize: 18,
    fontWeight: '800',
  },
  ticketStatus: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ticketQuantity: {
    color: '#facc15',
    fontSize: 16,
    fontWeight: '800',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketRef: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  ticketPurchase: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  deleteButton: {
    marginTop: 14,
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  deleteButtonText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#ffffff',
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
