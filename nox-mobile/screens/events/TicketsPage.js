import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import { normalizeMediaUrl } from '../../api/normalizeMediaUrl';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/theme';
import { NoxText, NoxTabs, NoxButton, NoxScreenHeader } from '../../components/nox';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { openDiscover } from '../../utils/noxNavigation';
import {
  TicketDatePill,
  TicketGenreChips,
  TicketStatusBadge,
  TicketTierBox,
  buildQrPayload,
  formatTicketDate,
  hasEnteredWithTicket,
  isTicketPast,
  ticketAddress,
  ticketGenres,
} from '../../components/tickets/ticketDisplay';

export default function TicketsPage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { navigate, goBack, currentPage } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, hideToast } = useToast();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [brokenImages, setBrokenImages] = useState({});

  const fetchTickets = useCallback(async () => {
    if (!user?.id) return;
    if (!user?.token) {
      setLoading(false);
      showError(fr ? 'Token manquant. Veuillez vous reconnecter.' : 'Missing token. Please log in again.');
      return;
    }
    try {
      const response = await api.getMyTickets(user.token);
      if (response?.success && Array.isArray(response.tickets)) {
        setTickets(response.tickets);
      }
    } catch (error) {
      console.error('Erreur récupération tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.token, fr, showError]);

  useEffect(() => {
    if (user?.id && currentPage === 'tickets') {
      fetchTickets();
    }
  }, [user?.id, fetchTickets, currentPage]);

  const activeTickets = useMemo(() => tickets.filter((t) => !isTicketPast(t)), [tickets]);
  const historyTickets = useMemo(() => tickets.filter((t) => isTicketPast(t)), [tickets]);
  const displayedTickets = activeTab === 'active' ? activeTickets : historyTickets;

  const tabs = useMemo(
    () => [
      {
        id: 'active',
        label: fr ? `Mes billets (${activeTickets.length})` : `My tickets (${activeTickets.length})`,
      },
      {
        id: 'history',
        label: fr
          ? `Historique d’achat (${historyTickets.length})`
          : `Purchase history (${historyTickets.length})`,
      },
    ],
    [fr, activeTickets.length, historyTickets.length],
  );

  const renderPoster = (ticket, withPill) => {
    const image = normalizeMediaUrl(ticket.eventImage);
    return (
      <View style={styles.posterCol}>
        <View style={styles.poster}>
          {image && !brokenImages[ticket.id] ? (
            <Image
              source={{ uri: image }}
              style={StyleSheet.absoluteFillObject}
              onError={() => setBrokenImages((prev) => ({ ...prev, [ticket.id]: true }))}
            />
          ) : (
            <Ionicons name="musical-notes" size={24} color={primaryAlpha(0.7)} />
          )}
        </View>
        {withPill ? (
          <TicketDatePill dateString={ticket.eventDate} language={language} style={styles.posterPill} />
        ) : null}
      </View>
    );
  };

  const renderMeta = (ticket, month) => {
    const address = ticketAddress(ticket);
    return (
      <>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
          <NoxText style={styles.metaText} numberOfLines={1}>
            {formatTicketDate(ticket.eventDate, language, month)}
            {ticket.eventTime ? ` • ${ticket.eventTime}` : ''}
          </NoxText>
        </View>
        {ticket.venues?.length > 1 ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
            <NoxText style={styles.metaText} numberOfLines={1}>
              {ticket.venues.map((s) => s.name).filter(Boolean).join(' → ')}
            </NoxText>
          </View>
        ) : address ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
            <NoxText style={styles.metaText} numberOfLines={1}>
              {address}
            </NoxText>
          </View>
        ) : null}
      </>
    );
  };

  const openTicket = (ticket) => navigate('ticketDetail', { ticket });

  const renderActiveCard = (ticket) => (
    <TouchableOpacity
      key={ticket.id}
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => openTicket(ticket)}
      accessibilityRole="button"
      accessibilityLabel={`${ticket.eventTitle}. ${fr ? 'Voir le billet' : 'View ticket'}`}
    >
      {renderPoster(ticket, true)}
      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <NoxText style={styles.title} numberOfLines={2}>
            {ticket.eventTitle}
          </NoxText>
          <TicketStatusBadge past={false} fr={fr} />
        </View>
        {renderMeta(ticket, 'long')}
        <TicketGenreChips genres={ticketGenres(ticket)} />
        <TicketTierBox ticket={ticket} fr={fr} />
      </View>
      <View style={styles.qrCol}>
        <View style={styles.qrPreview}>
          <QRCode value={buildQrPayload(ticket)} size={56} color="#000000" backgroundColor="#FFFFFF" />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.text} style={styles.chevron} />
    </TouchableOpacity>
  );

  const renderHistoryCard = (ticket) => (
    <TouchableOpacity
      key={ticket.id}
      style={[styles.card, styles.cardHistory]}
      activeOpacity={0.85}
      onPress={() => openTicket(ticket)}
      accessibilityRole="button"
      accessibilityLabel={`${ticket.eventTitle}. ${fr ? 'Voir le billet' : 'View ticket'}`}
    >
      <View style={styles.historyRow}>
        {renderPoster(ticket, false)}
        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <NoxText style={styles.title} numberOfLines={2}>
              {ticket.eventTitle}
            </NoxText>
            <TicketStatusBadge past fr={fr} />
          </View>
          {renderMeta(ticket, 'short')}
          <View style={styles.historyTierRow}>
            <NoxText style={styles.historyTier} numberOfLines={1}>
              {ticket.tierLabel || (fr ? 'Entrée générale' : 'General admission')}
            </NoxText>
            {ticket.price != null ? <NoxText style={styles.historyPrice}>{ticket.price}€</NoxText> : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.text} style={styles.chevron} />
      </View>
      {!hasEnteredWithTicket(ticket) ? (
        <View style={styles.historyNotice}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.textTertiary} />
          <NoxText style={styles.historyNoticeText}>
            {fr
              ? 'Billet non scanné à l’entrée : la note est réservée aux participants.'
              : 'Ticket not scanned at the door: rating is for attendees only.'}
          </NoxText>
        </View>
      ) : (
        <View style={styles.historyNotice}>
          <Ionicons name="star-outline" size={14} color={Colors.primaryLight} />
          <NoxText style={[styles.historyNoticeText, { color: Colors.primaryLight }]}>
            {fr ? 'Tu y étais : ouvre le billet pour noter la soirée.' : 'You were there: open the ticket to rate it.'}
          </NoxText>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    const isActiveTab = activeTab === 'active';
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="ticket-outline" size={36} color={Colors.primary} />
        </View>
        <NoxText variant="titleSecondary" style={styles.emptyTitle}>
          {isActiveTab
            ? fr ? 'Aucun billet actif' : 'No active tickets'
            : fr ? 'Aucun historique d’achat' : 'No purchase history'}
        </NoxText>
        <NoxText variant="secondary" style={styles.emptyText}>
          {isActiveTab
            ? fr
              ? 'Explore les événements pour acheter tes premiers billets.'
              : 'Explore events to buy your first tickets.'
            : fr
              ? 'Tes billets passés apparaîtront ici.'
              : 'Your past tickets will show up here.'}
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <NoxScreenHeader
        title={fr ? 'Billets' : 'Tickets'}
        subtitle={fr ? 'Wallet & historique d’achat' : 'Wallet & purchase history'}
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchTickets();
              }}
              tintColor={Colors.primary}
            />
          }
        >
          {displayedTickets.length === 0
            ? renderEmptyState()
            : displayedTickets.map(activeTab === 'active' ? renderActiveCard : renderHistoryCard)}
        </ScrollView>
      )}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabs: { marginBottom: Spacing.sm },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 140,
    gap: Spacing.md,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing.xxxl },
  loadingText: { marginTop: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: primaryAlpha(0.5),
    backgroundColor: Colors.backgroundCard,
  },
  cardHistory: { flexDirection: 'column', alignItems: 'stretch', borderColor: Colors.borderSubtle },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  posterCol: { width: 92, alignItems: 'center' },
  poster: {
    width: 92,
    height: 92,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPill: { marginTop: -14 },
  cardBody: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: { flex: 1, fontFamily: FontFamily.bold, fontSize: 15, lineHeight: 19, color: Colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { flex: 1, fontSize: 11, color: Colors.textSecondary },
  qrCol: { alignItems: 'center' },
  qrPreview: {
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  chevron: { marginLeft: 2 },
  historyTierRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  historyTier: { flex: 1, fontSize: 12, color: Colors.text },
  historyPrice: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.primaryLight },
  historyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderSubtle,
  },
  historyNoticeText: { flex: 1, fontSize: 11, color: Colors.textTertiary },
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
  emptyTitle: { textAlign: 'center' },
  emptyText: { textAlign: 'center', lineHeight: 20 },
  emptyCta: { marginTop: Spacing.md, paddingHorizontal: Spacing.xxl },
});
