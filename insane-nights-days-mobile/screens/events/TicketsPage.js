import React, { useMemo, useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import QRCode from 'react-native-qrcode-svg';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import Colors from '../../constants/colors';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../contexts/ConfirmContext';
import {
  addNoxEventToDeviceCalendar,
  isDeviceCalendarExportSupported,
} from '../../utils/addNoxEventToCalendar';

const API_TICKET_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketQR, setSelectedTicketQR] = useState(null);
  const [calendarBusyTicketId, setCalendarBusyTicketId] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchTickets();
    }
  }, [user?.id]);

  const fetchTickets = async () => {
    if (!user?.id) return;
    if (!user?.token) {
      setLoading(false);
      showError(language === 'fr' ? 'Token manquant. Veuillez vous reconnecter.' : 'Missing token. Please log in again.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.getMyTickets(user.token);
      if (response && response.success && Array.isArray(response.tickets)) {
        console.log('[TicketsPage] Tickets reçus:', response.tickets.length);
        if (response.tickets.length > 0) {
          console.log('[TicketsPage] Premier ticket:', {
            id: response.tickets[0].id,
            purchaseDate: response.tickets[0].purchaseDate,
            qrCode: response.tickets[0].qrCode,
          });
        }
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
      showError(language === 'fr' ? 'Vous devez être connecté.' : 'You must be logged in.');
      return;
    }

    showConfirm(
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
                showSuccess(language === 'fr' ? 'Le ticket a été supprimé avec succès.' : 'Ticket deleted successfully.');
                // Recharger la liste des tickets
                fetchTickets();
              } else {
                showError(response?.message || (language === 'fr' ? 'Erreur lors de la suppression.' : 'Error deleting ticket.'));
              }
            } catch (error) {
              console.error('Erreur suppression ticket:', error);
              showError(error.message || (language === 'fr' ? 'Erreur lors de la suppression.' : 'Error deleting ticket.'));
            }
          },
        },
      ],
    );
  };

  const handleAddTicketToCalendar = async (ticket) => {
    if (
      calendarBusyTicketId ||
      !API_TICKET_DATE_RE.test(String(ticket?.eventDate || ''))
    ) {
      return;
    }
    try {
      setCalendarBusyTicketId(ticket.id);
      await addNoxEventToDeviceCalendar({
        title: ticket.eventTitle,
        date: ticket.eventDate,
        time: ticket.eventTime,
        durationHours: ticket.eventDurationHours,
        location: ticket.eventLocation,
        notes: `${ticket.eventGenre ? `${ticket.eventGenre} · ` : ''}${language === 'fr' ? 'Billet Nox' : 'Nox ticket'}`,
      });
      showSuccess(
        language === 'fr'
          ? 'Événement ajouté à ton agenda.'
          : 'Event added to your calendar.'
      );
    } catch (e) {
      const code = e?.message;
      if (code === 'PERMISSION_DENIED') {
        showError(
          language === 'fr'
            ? 'Accès au calendrier refusé.'
            : 'Calendar access denied.'
        );
      } else if (code === 'NO_CALENDAR') {
        showError(
          language === 'fr'
            ? 'Aucun calendrier modifiable trouvé.'
            : 'No writable calendar found.'
        );
      } else {
        showError(
          language === 'fr'
            ? 'Impossible d’ajouter au calendrier.'
            : 'Could not add to calendar.'
        );
      }
    } finally {
      setCalendarBusyTicketId(null);
    }
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
        <TouchableOpacity
          style={styles.backButtonTop}
          onPress={() => navigate('welcome')}
          accessibilityRole="button"
          accessibilityLabel={language === 'fr' ? 'Retour' : 'Back'}
        >
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
            <ActivityIndicator size="large" color={Colors.primary} />
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
                  accessibilityRole="button"
                  accessibilityLabel={`${ticket.eventTitle || 'Event'}. ${language === 'fr' ? 'Voir le détail' : 'View details'}`}
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
                      {ticket.tierLabel ? (
                        <Text style={styles.ticketTierHint}>
                          {language === 'fr' ? 'Tarif : ' : 'Tier: '}
                          {ticket.tierLabel}
                        </Text>
                      ) : null}
                      <Text style={styles.ticketStatus}>{ticket.status ?? 'valid'}</Text>
                    </View>
                  </View>
                  <View style={styles.ticketFooter}>
                    <View style={styles.ticketQRWrapper}>
                      <TouchableOpacity
                        onPress={() => setSelectedTicketQR(ticket.qrCode)}
                        style={styles.qrCodeContainer}
                        activeOpacity={0.6}
                        accessibilityRole="button"
                        accessibilityLabel={
                          language === 'fr' ? 'Agrandir le QR code du billet' : 'Enlarge ticket QR code'
                        }
                      >   
                        <QRCode
                          value={JSON.stringify({
                            ticketId: ticket.id,
                            qrCode: ticket.qrCode,
                            eventId: ticket.eventId,
                            userId: ticket.userId,
                            status: ticket.status,
                          })}
                          size={80}
                          color="#000000"
                          backgroundColor="#FFFFFF"
                          logoSize={20}
                          logoMargin={2}
                          logoBackgroundColor="transparent"
                        />
                        <View style={styles.qrCodeHint}>
                          <Text style={styles.qrCodeHintText}>👆</Text>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.ticketInfoWrapper}>
                        <Text style={styles.ticketRef}>Code: {ticket.qrCode}</Text>
                        {ticket.purchaseDate ? (
                          <Text style={styles.ticketPurchaseDate}>
                            {language === 'fr' ? 'Acheté le' : 'Purchased on'}{' '}
                            {formatPurchaseDate(ticket.purchaseDate)}
                          </Text>
                        ) : (
                          <Text style={styles.ticketPurchaseDate}>
                            {language === 'fr' ? 'Date d\'achat non disponible' : 'Purchase date not available'}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
                {!isEventPast(ticket) &&
                isDeviceCalendarExportSupported() &&
                API_TICKET_DATE_RE.test(String(ticket.eventDate || '')) ? (
                  <TouchableOpacity
                    style={[
                      styles.calendarTicketButton,
                      calendarBusyTicketId === ticket.id && styles.calendarTicketButtonDisabled,
                    ]}
                    onPress={() => handleAddTicketToCalendar(ticket)}
                    disabled={calendarBusyTicketId === ticket.id}
                    accessibilityRole="button"
                    accessibilityLabel={
                      language === 'fr' ? 'Ajouter cet événement à mon agenda' : 'Add this event to my calendar'
                    }
                  >
                    {calendarBusyTicketId === ticket.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.calendarTicketButtonText}>
                        {language === 'fr' ? '📅 Ajouter à mon agenda' : '📅 Add to my calendar'}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
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

        {/* Modal pour afficher le QR code en grand */}
        <Modal
          visible={!!selectedTicketQR}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedTicketQR(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {language === 'fr' ? 'QR Code du ticket' : 'Ticket QR Code'}
              </Text>
              {selectedTicketQR && (() => {
                const currentTicket = tickets.find(t => t.qrCode === selectedTicketQR);
                const qrValue = currentTicket ? JSON.stringify({
                  ticketId: currentTicket.id,
                  qrCode: currentTicket.qrCode,
                  eventId: currentTicket.eventId,
                  userId: currentTicket.userId,
                  status: currentTicket.status,
                }) : selectedTicketQR;
                
                return (
                  <>
                    <View style={styles.modalQRContainer}>
                      <QRCode
                        value={qrValue}
                        size={300}
                        color="#000000"
                        backgroundColor="#FFFFFF"
                        logoSize={50}
                        logoMargin={5}
                        logoBackgroundColor="transparent"
                      />
                    </View>
                    <Text style={styles.modalQRCode}>{selectedTicketQR}</Text>
                    <Text style={styles.modalHint}>
                      {language === 'fr' 
                        ? 'Scannez ce QR code pour vérifier le ticket' 
                        : 'Scan this QR code to verify the ticket'}
                    </Text>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setSelectedTicketQR(null)}
                    >
                      <Text style={styles.modalCloseButtonText}>
                        {language === 'fr' ? 'Fermer' : 'Close'}
                      </Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </View>
          </View>
        </Modal>

        {/* Toast pour les notifications */}
        <Toast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          onHide={hideToast}
        />
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
  // Ajout d'un accent rouge sur le titre si besoin
  titleAccent: {
    color: Colors.primary,
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
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderActive, // Plus visible avec 50% opacité
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
    color: Colors.primary,
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: Colors.glow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  ticketTierHint: {
    marginTop: 2,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
    textAlign: 'right',
    maxWidth: 160,
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
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  calendarTicketButton: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  calendarTicketButtonDisabled: {
    opacity: 0.58,
  },
  calendarTicketButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  ticketQRWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qrCodeContainer: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: Colors.borderActive,
  },
  qrCodeHint: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeHintText: {
    fontSize: 10,
  },
  ticketInfoWrapper: {
    flex: 1,
  },
  ticketRef: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  ticketPurchaseDate: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.borderActive,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  modalQRContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
  },
  modalQRCode: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'monospace',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  modalCloseButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: Colors.shadow,
    borderWidth: 1,
    borderColor: Colors.borderActive,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  rateButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
