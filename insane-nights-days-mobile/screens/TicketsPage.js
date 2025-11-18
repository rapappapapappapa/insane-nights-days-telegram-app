import React, { useMemo, useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';

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

export default function TicketsPage() {
  const { language } = useLanguage();
  const { navigate } = useNavigation();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchTickets();
    }
  }, [user?.id]);

  const fetchTickets = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await api.getUserTickets(user.id);
      if (response && response.success && Array.isArray(response.tickets)) {
        setTickets(response.tickets);
      }
    } catch (error) {
      console.error('Erreur récupération tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!user?.token) {
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        language === 'fr' ? 'Vous devez être connecté.' : 'You must be logged in.',
      );
      return;
    }

    Alert.alert(
      language === 'fr' ? 'Supprimer le ticket' : 'Delete ticket',
      language === 'fr'
        ? 'Êtes-vous sûr de vouloir supprimer ce ticket ?'
        : 'Are you sure you want to delete this ticket?',
      [
        {
          text: language === 'fr' ? 'Annuler' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'fr' ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.deleteTicket(user.token, ticketId);
              if (response && response.success) {
                Alert.alert(
                  language === 'fr' ? 'Ticket supprimé' : 'Ticket deleted',
                  language === 'fr' ? 'Le ticket a été supprimé avec succès.' : 'Ticket deleted successfully.',
                );
                // Recharger la liste des tickets
                fetchTickets();
              } else {
                Alert.alert(
                  language === 'fr' ? 'Erreur' : 'Error',
                  response?.message || (language === 'fr' ? 'Erreur lors de la suppression.' : 'Error deleting ticket.'),
                );
              }
            } catch (error) {
              console.error('Erreur suppression ticket:', error);
              Alert.alert(
                language === 'fr' ? 'Erreur' : 'Error',
                error.message || (language === 'fr' ? 'Erreur lors de la suppression.' : 'Error deleting ticket.'),
              );
            }
          },
        },
      ],
    );
  };

  // Utiliser le statut de l'événement plutôt que de calculer depuis la date
  const isEventPast = (ticket) => {
    // Si le ticket a un statut d'événement, l'utiliser
    if (ticket.eventStatus) {
      return ticket.eventStatus === 'FINISHED';
    }
    // Sinon, fallback sur la date (pour compatibilité)
    if (ticket.eventDate) {
      const eventDateTime = new Date(ticket.eventDate);
      return eventDateTime < new Date();
    }
    return false;
  };

  const hasTickets = useMemo(() => tickets.length > 0, [tickets]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => navigate('welcome')}>
          <Text style={styles.backButtonTopText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🎟️ {language === 'fr' ? 'Mes Tickets' : 'My Tickets'}</Text>
          <Text style={styles.subtitle}>
            {language === 'fr' ? 'Retrouvez ici vos tickets' : 'Find your tickets here'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff7a1a" />
            <Text style={styles.loadingText}>
              {language === 'fr' ? 'Chargement...' : 'Loading...'}
            </Text>
          </View>
        ) : !hasTickets ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎫</Text>
            <Text style={styles.emptyTitle}>
              {language === 'fr' ? 'Aucun ticket pour l\'instant' : 'No tickets yet'}
            </Text>
            <Text style={styles.emptyText}>
              {language === 'fr'
                ? 'Explorez les événements pour acheter vos premiers tickets.'
                : 'Explore events to buy your first tickets.'}
            </Text>
          </View>
        ) : (
          <View style={styles.ticketList}>
            {tickets.map(ticket => (
              <View key={ticket.id} style={styles.ticketCard}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigate('eventDetail', { eventId: ticket.eventId })}
                >
                  <View style={styles.ticketHeader}>
                    <View style={styles.ticketTitleWrapper}>
                      <Text style={styles.ticketTitle}>{ticket.eventTitle}</Text>
                      <Text style={styles.ticketDate}>
                        {ticket.eventDate} {ticket.eventTime ? `• ${ticket.eventTime}` : ''}
                      </Text>
                      <Text style={styles.ticketLocation}>{ticket.eventLocation}</Text>
                    </View>
                    <View style={styles.ticketPriceWrapper}>
                      <Text style={styles.ticketPrice}>{ticket.price}€</Text>
                      <Text style={styles.ticketStatus}>{ticket.status ?? 'valid'}</Text>
                    </View>
                  </View>
                  <View style={styles.ticketFooter}>
                    <Text style={styles.ticketRef}>{ticket.qrCode}</Text>
                    <Text style={styles.ticketPurchase}>
                      {language === 'fr' ? 'Réservé le' : 'Purchased on'}{' '}
                      {formatPurchaseDate(ticket.purchaseDate)}
                    </Text>
                  </View>
                </TouchableOpacity>
                {isEventPast(ticket) && (
                  <TouchableOpacity
                    style={styles.rateButton}
                    onPress={() => {
                      navigate('rateEvent', {
                        eventId: ticket.eventId,
                        eventTitle: ticket.eventTitle,
                        eventDate: ticket.eventDate,
                        eventStatus: ticket.eventStatus, // Passer le statut
                        djIds: ticket.djIds || [], // IDs des DJs pour la notation
                        venueId: ticket.venueId,
                        venueName: ticket.venueName,
                      });
                    }}
                  >
                    <Text style={styles.rateButtonText}>
                      ⭐ {language === 'fr' ? 'Noter cet événement' : 'Rate this event'}
                    </Text>
                  </TouchableOpacity>
                )}
                {/* Bouton TEMPORAIRE pour supprimer le ticket */}
                {user?.isAuthenticated && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteTicket(ticket.id)}
                  >
                    <Text style={styles.deleteButtonText}>
                      🗑️ {language === 'fr' ? 'Supprimer (TEMPORAIRE)' : 'Delete (TEMPORARY)'}
                    </Text>
                  </TouchableOpacity>
                )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
  },
  rateButton: {
    marginTop: 12,
    backgroundColor: 'rgba(255,122,26,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.5)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  rateButtonText: {
    color: '#ff7a1a',
    fontSize: 14,
    fontWeight: '600',
  },
});
