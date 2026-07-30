import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Layout, Radius, Spacing } from '../../constants/theme';
import { NoxText, NoxTabs, NoxButton, NoxCard, NoxScreenHeader } from '../../components/nox';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../contexts/ConfirmContext';
import { openDiscover } from '../../utils/noxNavigation';
import {
  addNoxEventToDeviceCalendar,
  isDeviceCalendarExportSupported,
} from '../../utils/addNoxEventToCalendar';

const API_TICKET_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const formatPurchaseDate = (dateString) => {
  if (!dateString) return '';
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

const formatEventDate = (dateString, language) => {
  if (!dateString) return '';
  try {
    const date = new Date(`${dateString}T12:00:00`);
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const buildQrPayload = (ticket) =>
  JSON.stringify({
    ticketId: ticket.id,
    qrCode: ticket.qrCode,
    eventId: ticket.eventId,
    userId: ticket.userId,
    status: ticket.status,
  });

export default function TicketsPage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { navigate, goBack } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [calendarBusyTicketId, setCalendarBusyTicketId] = useState(null);

  const fetchTickets = useCallback(async () => {
    if (!user?.id) return;
    if (!user?.token) {
      setLoading(false);
      showError(fr ? 'Token manquant. Veuillez vous reconnecter.' : 'Missing token. Please log in again.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.getMyTickets(user.token);
      if (response?.success && Array.isArray(response.tickets)) {
        setTickets(response.tickets);
      }
    } catch (error) {
      console.error('Erreur récupération tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.token, fr, showError]);

  useEffect(() => {
    if (user?.id) {
      fetchTickets();
    }
  }, [user?.id, fetchTickets]);

  const isEventPast = useCallback((ticket) => {
    if (ticket.eventStatus) {
      return ticket.eventStatus === 'FINISHED';
    }
    if (ticket.eventDate) {
      return new Date(ticket.eventDate) < new Date();
    }
    return false;
  }, []);

  const activeTickets = useMemo(
    () => tickets.filter((ticket) => !isEventPast(ticket)),
    [tickets, isEventPast],
  );

  const historyTickets = useMemo(
    () => tickets.filter((ticket) => isEventPast(ticket)),
    [tickets, isEventPast],
  );

  const displayedTickets = activeTab === 'active' ? activeTickets : historyTickets;

  const tabs = useMemo(
    () => [
      {
        id: 'active',
        label: fr ? `Mes tickets (${activeTickets.length})` : `My tickets (${activeTickets.length})`,
      },
      {
        id: 'history',
        label: fr ? `Historique (${historyTickets.length})` : `History (${historyTickets.length})`,
      },
    ],
    [fr, activeTickets.length, historyTickets.length],
  );

  const handleDeleteTicket = async (ticketId) => {
    if (!user?.token) {
      showError(fr ? 'Vous devez être connecté.' : 'You must be logged in.');
      return;
    }

    showConfirm(
      fr ? 'Supprimer le ticket' : 'Delete ticket',
      fr ? 'Êtes-vous sûr de vouloir supprimer ce ticket ?' : 'Are you sure you want to delete this ticket?',
      [
        { text: fr ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: fr ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.deleteTicket(user.token, ticketId);
              if (response?.success) {
                showSuccess(fr ? 'Le ticket a été supprimé avec succès.' : 'Ticket deleted successfully.');
                if (selectedTicket?.id === ticketId) {
                  setSelectedTicket(null);
                }
                fetchTickets();
              } else {
                showError(response?.message || (fr ? 'Erreur lors de la suppression.' : 'Error deleting ticket.'));
              }
            } catch (error) {
              console.error('Erreur suppression ticket:', error);
              showError(error.message || (fr ? 'Erreur lors de la suppression.' : 'Error deleting ticket.'));
            }
          },
        },
      ],
    );
  };

  const handleAddTicketToCalendar = async (ticket) => {
    if (calendarBusyTicketId || !API_TICKET_DATE_RE.test(String(ticket?.eventDate || ''))) {
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
        notes: `${ticket.eventGenre ? `${ticket.eventGenre} · ` : ''}${fr ? 'Billet Nox' : 'Nox ticket'}`,
      });
      showSuccess(fr ? 'Événement ajouté à ton agenda.' : 'Event added to your calendar.');
    } catch (e) {
      const code = e?.message;
      if (code === 'PERMISSION_DENIED') {
        showError(fr ? 'Accès au calendrier refusé.' : 'Calendar access denied.');
      } else if (code === 'NO_CALENDAR') {
        showError(fr ? 'Aucun calendrier modifiable trouvé.' : 'No writable calendar found.');
      } else {
        showError(fr ? 'Impossible d’ajouter au calendrier.' : 'Could not add to calendar.');
      }
    } finally {
      setCalendarBusyTicketId(null);
    }
  };

  const renderStatusBadge = (ticket) => {
    const past = isEventPast(ticket);
    const label = past
      ? fr ? 'Passé' : 'Past'
      : fr ? 'Actif' : 'Active';
    return (
      <View style={[styles.statusBadge, past ? styles.statusPast : styles.statusActive]}>
        <NoxText variant="label" style={[styles.statusText, past ? styles.statusTextPast : styles.statusTextActive]}>
          {label}
        </NoxText>
      </View>
    );
  };

  const renderTicketCard = (ticket) => {
    const past = isEventPast(ticket);

    return (
      <NoxCard key={ticket.id} style={styles.ticketCard}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => (past ? navigate('eventDetail', { eventId: ticket.eventId }) : setSelectedTicket(ticket))}
          accessibilityRole="button"
          accessibilityLabel={
            past
              ? `${ticket.eventTitle}. ${fr ? 'Voir le détail' : 'View details'}`
              : `${ticket.eventTitle}. ${fr ? 'Afficher le QR code' : 'Show QR code'}`
          }
        >
          <View style={styles.ticketRow}>
            <View style={styles.ticketThumb}>
              <Ionicons name="musical-notes" size={22} color={Colors.primary} />
            </View>
            <View style={styles.ticketBody}>
              <View style={styles.ticketTitleRow}>
                <NoxText variant="titleSecondary" style={styles.ticketTitle} numberOfLines={2}>
                  {ticket.eventTitle}
                </NoxText>
                {renderStatusBadge(ticket)}
              </View>
              <NoxText variant="secondary" style={styles.ticketMeta}>
                {formatEventDate(ticket.eventDate, language)}
                {ticket.eventTime ? ` · ${ticket.eventTime}` : ''}
              </NoxText>
              {ticket.eventLocation ? (
                <NoxText variant="secondary" numberOfLines={1}>
                  {ticket.eventLocation}
                </NoxText>
              ) : null}
              <View style={styles.ticketFooterRow}>
                <NoxText variant="label" style={styles.ticketPrice}>
                  {ticket.price}€
                </NoxText>
                {ticket.tierLabel ? (
                  <NoxText variant="secondary" style={styles.ticketTier}>
                    {ticket.tierLabel}
                  </NoxText>
                ) : null}
              </View>
            </View>
            {!past ? (
              <View style={styles.qrPreview}>
                <QRCode
                  value={buildQrPayload(ticket)}
                  size={52}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
            )}
          </View>
        </TouchableOpacity>

        {!past ? (
          <View style={styles.ticketActions}>
            <NoxButton
              label={fr ? 'Voir le QR code' : 'View QR code'}
              variant="ghost"
              onPress={() => setSelectedTicket(ticket)}
              style={styles.actionButton}
            />
            {isDeviceCalendarExportSupported() &&
            API_TICKET_DATE_RE.test(String(ticket.eventDate || '')) ? (
              <NoxButton
                label={fr ? 'Ajouter à mon agenda' : 'Add to calendar'}
                variant="secondary"
                loading={calendarBusyTicketId === ticket.id}
                onPress={() => handleAddTicketToCalendar(ticket)}
                style={styles.actionButton}
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.ticketActions}>
            <NoxButton
              label={fr ? 'Noter cet événement' : 'Rate this event'}
              variant="ghost"
              onPress={() =>
                navigate('rateEvent', {
                  eventId: ticket.eventId,
                  eventTitle: ticket.eventTitle,
                  eventDate: ticket.eventDate,
                  eventStatus: ticket.eventStatus,
                  djIds: ticket.djIds || [],
                  venueId: ticket.venueId,
                  venueName: ticket.venueName,
                })
              }
              style={styles.actionButton}
            />
          </View>
        )}

        {user?.isAuthenticated ? (
          <TouchableOpacity
            style={styles.deleteLink}
            onPress={() => handleDeleteTicket(ticket.id)}
            accessibilityRole="button"
            accessibilityLabel={fr ? 'Supprimer le ticket' : 'Delete ticket'}
          >
            <NoxText variant="secondary" style={styles.deleteLinkText}>
              {fr ? 'Supprimer (temporaire)' : 'Delete (temporary)'}
            </NoxText>
          </TouchableOpacity>
        ) : null}
      </NoxCard>
    );
  };

  const renderEmptyState = () => {
    const isActiveTab = activeTab === 'active';
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="ticket-outline" size={36} color={Colors.primary} />
        </View>
        <NoxText variant="titleSecondary" style={styles.emptyTitle}>
          {isActiveTab
            ? fr ? 'Aucun ticket actif' : 'No active tickets'
            : fr ? 'Aucun historique' : 'No history yet'}
        </NoxText>
        <NoxText variant="secondary" style={styles.emptyText}>
          {isActiveTab
            ? fr
              ? 'Explore les événements pour acheter tes premiers billets.'
              : 'Explore events to buy your first tickets.'
            : fr
              ? 'Tes événements passés apparaîtront ici.'
              : 'Your past events will show up here.'}
        </NoxText>
        {isActiveTab ? (
          <NoxButton
            label={fr ? 'Découvrir les événements' : 'Discover events'}
            onPress={() => openDiscover(navigate, user?.activeProfileType)}
            style={styles.emptyCta}
            fullWidth={false}
          />
        ) : null}
      </View>
    );
  };

  const holderName =
    user?.pseudo ||
    [user?.prenom, user?.nom].filter(Boolean).join(' ') ||
    user?.email ||
    '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <NoxScreenHeader
        title={fr ? 'Tickets' : 'Tickets'}
        subtitle={fr ? 'Tes billets pour les événements' : 'Your event tickets'}
        onBack={goBack}
      />

      <NoxTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} style={styles.tabs} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <NoxText variant="secondary" style={styles.loadingText}>
            {fr ? 'Chargement…' : 'Loading…'}
          </NoxText>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {displayedTickets.length === 0 ? renderEmptyState() : displayedTickets.map(renderTicketCard)}
        </ScrollView>
      )}

      <Modal
        visible={!!selectedTicket}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedTicket(null)}
      >
        {selectedTicket ? (
          <SafeAreaView style={styles.qrModal} edges={['top', 'bottom']}>
            <StatusBar style="light" />
            <View style={styles.qrModalHeader}>
              <TouchableOpacity
                onPress={() => setSelectedTicket(null)}
                style={styles.qrBackBtn}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={fr ? 'Fermer' : 'Close'}
              >
                <Ionicons name="chevron-back" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.qrModalContent} showsVerticalScrollIndicator={false}>
              <NoxText variant="title" style={styles.qrEventTitle}>
                {selectedTicket.eventTitle}
              </NoxText>
              <NoxText variant="secondary" style={styles.qrEventMeta}>
                {formatEventDate(selectedTicket.eventDate, language)}
                {selectedTicket.eventTime ? ` · ${selectedTicket.eventTime}` : ''}
              </NoxText>
              {selectedTicket.eventLocation ? (
                <NoxText variant="secondary" style={styles.qrEventLocation}>
                  {selectedTicket.eventLocation}
                </NoxText>
              ) : null}

              <View style={styles.qrLargeWrap}>
                <QRCode
                  value={buildQrPayload(selectedTicket)}
                  size={260}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
              </View>

              <NoxText variant="label" style={styles.qrCodeLabel}>
                {selectedTicket.qrCode}
              </NoxText>

              {holderName ? (
                <NoxText variant="description" style={styles.qrHolder}>
                  {holderName}
                </NoxText>
              ) : null}

              {selectedTicket.purchaseDate ? (
                <NoxText variant="secondary" style={styles.qrPurchaseDate}>
                  {fr ? 'Acheté le ' : 'Purchased on '}
                  {formatPurchaseDate(selectedTicket.purchaseDate)}
                </NoxText>
              ) : null}

              <NoxText variant="secondary" style={styles.qrHint}>
                {fr
                  ? 'Présente ce QR code à l’entrée de l’événement.'
                  : 'Show this QR code at the event entrance.'}
              </NoxText>

              <View style={styles.qrModalActions}>
                {isDeviceCalendarExportSupported() &&
                API_TICKET_DATE_RE.test(String(selectedTicket.eventDate || '')) ? (
                  <NoxButton
                    label={fr ? 'Ajouter à mon agenda' : 'Add to calendar'}
                    variant="secondary"
                    loading={calendarBusyTicketId === selectedTicket.id}
                    onPress={() => handleAddTicketToCalendar(selectedTicket)}
                  />
                ) : null}
                <NoxButton
                  label={fr ? 'Voir l’événement' : 'View event'}
                  variant="ghost"
                  onPress={() => {
                    setSelectedTicket(null);
                    navigate('eventDetail', { eventId: selectedTicket.eventId });
                  }}
                />
                <NoxButton label={fr ? 'Fermer' : 'Close'} onPress={() => setSelectedTicket(null)} />
              </View>
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabs: {
    marginBottom: Spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingTop: Spacing.lg,
    paddingBottom: 120,
    gap: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  loadingText: {
    marginTop: Spacing.md,
  },
  ticketCard: {
    gap: Spacing.md,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ticketThumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: primaryAlpha(0.12),
    borderWidth: 1,
    borderColor: primaryAlpha(0.25),
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketBody: {
    flex: 1,
    gap: 4,
  },
  ticketTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  ticketTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
  },
  statusBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusActive: {
    backgroundColor: primaryAlpha(0.15),
    borderWidth: 1,
    borderColor: primaryAlpha(0.35),
  },
  statusPast: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  statusText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusTextActive: {
    color: Colors.primary,
  },
  statusTextPast: {
    color: Colors.textTertiary,
  },
  ticketMeta: {
    marginTop: 2,
  },
  ticketFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  ticketPrice: {
    color: Colors.primary,
    fontSize: 16,
  },
  ticketTier: {
    flex: 1,
  },
  qrPreview: {
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: primaryAlpha(0.2),
  },
  ticketActions: {
    gap: Spacing.sm,
  },
  actionButton: {
    minHeight: 44,
  },
  deleteLink: {
    alignSelf: 'flex-end',
    paddingVertical: Spacing.xs,
  },
  deleteLinkText: {
    color: Colors.error,
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: primaryAlpha(0.1),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  qrModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  qrModalHeader: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingVertical: Spacing.sm,
  },
  qrBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrModalContent: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.xxxl,
    alignItems: 'center',
  },
  qrEventTitle: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  qrEventMeta: {
    textAlign: 'center',
    color: Colors.primary,
  },
  qrEventLocation: {
    textAlign: 'center',
    marginTop: 4,
  },
  qrLargeWrap: {
    marginTop: Spacing.xxxl,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
  },
  qrCodeLabel: {
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  qrHolder: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  qrPurchaseDate: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  qrHint: {
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  qrModalActions: {
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
});
