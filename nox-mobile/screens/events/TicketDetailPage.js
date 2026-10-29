import React, { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { api } from '../../api/config';
import { normalizeMediaUrl } from '../../api/normalizeMediaUrl';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Radius, Spacing } from '../../constants/theme';
import { NoxText, NoxButton, NoxScreenHeader } from '../../components/nox';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { openEventPreview } from '../../utils/noxNavigation';
import {
  addNoxEventToDeviceCalendar,
  isDeviceCalendarExportSupported,
} from '../../utils/addNoxEventToCalendar';
import {
  API_TICKET_DATE_RE,
  TicketDatePill,
  TicketGenreChips,
  TicketStatusBadge,
  TicketTierBox,
  buildQrPayload,
  formatPurchaseDate,
  formatTicketDate,
  hasEnteredWithTicket,
  isTicketPast,
  ticketAddress,
  ticketGenres,
} from '../../components/tickets/ticketDisplay';

/** Détail d’un billet (maquette 21) : bannière, infos, tarif, QR, actions. */
export default function TicketDetailPage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { goBack, navigate, routeParams } = useNavigation();
  const { user } = useAuth();
  const { showConfirm } = useConfirm();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const ticket = routeParams?.ticket;

  const [qrFullscreen, setQrFullscreen] = useState(false);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);

  if (!ticket) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <NoxText variant="secondary">{fr ? 'Billet introuvable.' : 'Ticket not found.'}</NoxText>
        <NoxButton label={fr ? 'Retour' : 'Back'} onPress={goBack} style={{ marginTop: Spacing.lg }} />
      </SafeAreaView>
    );
  }

  const past = isTicketPast(ticket);
  const image = normalizeMediaUrl(ticket.eventImage);
  const address = ticketAddress(ticket);
  const holderName =
    user?.pseudo || [user?.prenom, user?.nom].filter(Boolean).join(' ') || user?.email || '';
  const canAddToCalendar =
    !past && isDeviceCalendarExportSupported() && API_TICKET_DATE_RE.test(String(ticket.eventDate || ''));

  const addToCalendar = async () => {
    if (calendarBusy) return;
    try {
      setCalendarBusy(true);
      await addNoxEventToDeviceCalendar({
        title: ticket.eventTitle,
        date: ticket.eventDate,
        time: ticket.eventTime,
        durationHours: ticket.eventDurationHours,
        location: address,
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
      setCalendarBusy(false);
    }
  };

  const confirmDelete = () => {
    showConfirm(
      fr ? 'Retirer le billet' : 'Remove ticket',
      fr ? 'Êtes-vous sûr de vouloir supprimer ce ticket ?' : 'Are you sure you want to delete this ticket?',
      [
        { text: fr ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: fr ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.deleteTicket(user.token, ticket.id);
              if (response?.success) {
                goBack();
              } else {
                showError(response?.message || (fr ? 'Erreur lors de la suppression.' : 'Error deleting ticket.'));
              }
            } catch (error) {
              showError(error.message || (fr ? 'Erreur lors de la suppression.' : 'Error deleting ticket.'));
            }
          },
        },
      ],
    );
  };

  const openRate = () =>
    navigate('rateEvent', {
      eventId: ticket.eventId,
      eventTitle: ticket.eventTitle,
      eventDate: ticket.eventDate,
      eventStatus: ticket.eventStatus,
      djIds: ticket.djIds || [],
      venueId: ticket.venueId,
      venueName: ticket.venueName,
      venues: (ticket.venues || []).filter((s) => (ticket.scannedVenueIds || []).includes(s.venueId)),
    });

  const actionRows = [
    canAddToCalendar && {
      id: 'calendar',
      icon: 'calendar-outline',
      label: fr ? 'Ajouter à mon agenda' : 'Add to my calendar',
      onPress: addToCalendar,
    },
    {
      id: 'event',
      icon: 'information-circle-outline',
      label: fr ? 'Voir l’événement' : 'View event',
      onPress: () => openEventPreview(navigate, user?.activeProfileType, ticket.eventId),
    },
    past &&
      hasEnteredWithTicket(ticket) && {
        id: 'rate',
        icon: 'star-outline',
        label: fr ? 'Noter cet événement' : 'Rate this event',
        onPress: openRate,
      },
  ].filter(Boolean);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <NoxScreenHeader
        title={fr ? 'Billet' : 'Ticket'}
        subtitle={fr ? 'Détail de votre billet' : 'Your ticket details'}
        onBack={goBack}
        rightSlot={
          !past && user?.token ? (
            <TouchableOpacity onPress={confirmDelete} hitSlop={12} accessibilityLabel={fr ? 'Retirer le billet' : 'Remove ticket'}>
              <Ionicons name="ellipsis-horizontal" size={22} color={Colors.text} />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          {image && !imageBroken ? (
            <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} onError={() => setImageBroken(true)} />
          ) : (
            <Ionicons name="musical-notes" size={40} color={primaryAlpha(0.7)} />
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.infoRow}>
            <TicketDatePill dateString={ticket.eventDate} language={language} style={styles.datePill} />
            <View style={styles.infoMain}>
              <View style={styles.titleRow}>
                <NoxText style={styles.title} numberOfLines={2}>
                  {ticket.eventTitle}
                </NoxText>
                <TicketStatusBadge past={past} fr={fr} />
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={15} color={Colors.textSecondary} />
                <NoxText style={styles.metaText}>
                  {formatTicketDate(ticket.eventDate, language)}
                  {ticket.eventTime ? ` - ${ticket.eventTime}` : ''}
                </NoxText>
              </View>
              {address ? (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={15} color={Colors.textSecondary} />
                  <NoxText style={styles.metaText} numberOfLines={2}>
                    {address}
                  </NoxText>
                </View>
              ) : null}
              <TicketGenreChips genres={ticketGenres(ticket)} />
            </View>
          </View>

          {ticket.venues?.length > 1 ? (
            <View style={styles.itinerary}>
              {ticket.venues.map((stop, i) => (
                <NoxText key={`${stop.venueId}-${i}`} style={styles.itineraryText} numberOfLines={1}>
                  {(ticket.scannedVenueIds || []).includes(stop.venueId) ? '✓ ' : `${i + 1}. `}
                  {stop.name}
                  {stop.slotStart && stop.slotEnd ? ` · ${stop.slotStart} – ${stop.slotEnd}` : ''}
                </NoxText>
              ))}
            </View>
          ) : null}

          <TicketTierBox ticket={ticket} fr={fr} large />

          {!past ? (
            <View style={styles.qrCard}>
              <View style={styles.qrFrame}>
                <QRCode value={buildQrPayload(ticket)} size={130} color="#000000" backgroundColor="#FFFFFF" />
              </View>
              <NoxText style={styles.qrHint}>
                {fr ? 'QR code à présenter à l’entrée' : 'Show this QR code at the door'}
              </NoxText>
              <NoxButton
                label={fr ? 'Voir le QR code en plein écran' : 'View QR code full screen'}
                iconLeft={<Ionicons name="scan-outline" size={18} color={Colors.text} />}
                onPress={() => setQrFullscreen(true)}
              />
            </View>
          ) : !hasEnteredWithTicket(ticket) ? (
            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} />
              <NoxText style={styles.noticeText}>
                {fr
                  ? 'Billet non scanné à l’entrée : la note est réservée aux participants.'
                  : 'Ticket not scanned at the door: rating is for attendees only.'}
              </NoxText>
            </View>
          ) : null}

          <View style={styles.actions}>
            {actionRows.map((row, i) => (
              <TouchableOpacity
                key={row.id}
                style={[styles.actionRow, i > 0 && styles.actionRowBorder]}
                onPress={row.onPress}
                activeOpacity={0.8}
              >
                <Ionicons name={row.icon} size={22} color={Colors.text} />
                <NoxText style={styles.actionLabel}>{row.label}</NoxText>
                <Ionicons name="chevron-forward" size={18} color={Colors.text} />
              </TouchableOpacity>
            ))}
          </View>

          {ticket.purchaseDate ? (
            <NoxText style={styles.purchase}>
              {fr ? 'Acheté le ' : 'Purchased on '}
              {formatPurchaseDate(ticket.purchaseDate, language)}
            </NoxText>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={qrFullscreen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setQrFullscreen(false)}
      >
        <SafeAreaView style={styles.qrModal} edges={['top', 'bottom']}>
          <StatusBar style="light" />
          <TouchableOpacity style={styles.qrClose} onPress={() => setQrFullscreen(false)} hitSlop={12}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.qrModalBody}>
            <NoxText variant="titleSecondary" style={styles.center}>
              {ticket.eventTitle}
            </NoxText>
            <NoxText style={[styles.metaText, styles.center]}>
              {formatTicketDate(ticket.eventDate, language)}
              {ticket.eventTime ? ` - ${ticket.eventTime}` : ''}
            </NoxText>
            <View style={styles.qrLarge}>
              <QRCode value={buildQrPayload(ticket)} size={260} color="#000000" backgroundColor="#FFFFFF" />
            </View>
            <NoxText style={styles.qrCodeText}>{ticket.qrCode}</NoxText>
            {holderName ? <NoxText style={[styles.metaText, styles.center]}>{holderName}</NoxText> : null}
          </View>
        </SafeAreaView>
      </Modal>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  content: { paddingBottom: 140 },
  banner: {
    height: 190,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: { paddingHorizontal: Layout.screenPaddingHorizontal, gap: Spacing.lg },
  infoRow: { flexDirection: 'row', gap: Spacing.md, marginTop: -28 },
  datePill: { width: 76, paddingVertical: Spacing.sm },
  infoMain: { flex: 1, gap: 6, paddingTop: 34 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  title: { flex: 1, fontFamily: FontFamily.bold, fontSize: 22, lineHeight: 27, color: Colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metaText: { flexShrink: 1, fontSize: 14, color: Colors.textSecondary },
  itinerary: { gap: 2 },
  itineraryText: { fontSize: 13, color: Colors.textSecondary },
  qrCard: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: primaryAlpha(0.5),
    backgroundColor: Colors.backgroundCard,
  },
  qrFrame: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  qrHint: { fontSize: 13, color: Colors.textSecondary },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
  },
  noticeText: { flex: 1, fontSize: 13, color: Colors.textTertiary },
  actions: {
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundCard,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  actionRowBorder: { borderTopWidth: 0.5, borderTopColor: Colors.borderSubtle },
  actionLabel: { flex: 1, fontSize: 15, color: Colors.text },
  purchase: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center' },
  qrModal: { flex: 1, backgroundColor: Colors.background },
  qrClose: { alignSelf: 'flex-end', padding: Spacing.lg },
  qrModalBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  qrLarge: { padding: Spacing.lg, backgroundColor: '#FFFFFF', borderRadius: Radius.card, marginVertical: Spacing.lg },
  qrCodeText: { fontFamily: 'monospace', letterSpacing: 1, color: Colors.textSecondary },
});
