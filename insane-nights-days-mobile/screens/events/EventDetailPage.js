import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { Spacing } from '../../constants/theme';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import { NoxText, NoxButton } from '../../components/nox';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../contexts/ConfirmContext';
import {
  addNoxEventToDeviceCalendar,
  isDeviceCalendarExportSupported,
} from '../../utils/addNoxEventToCalendar';
import { API_DATE_RE, EVENT_DETAIL_MOCK_EVENTS, isTicketTierSelectable } from '../../utils/eventDetailPageUtils';
import { tierSaleWindowHint } from '../../utils/ticketPricingUtils';
import { useEventDetailPurchase } from '../../hooks/useEventDetailPurchase';
import { useEventDetailGroups } from '../../hooks/useEventDetailGroups';
import { styles } from './EventDetailPage.styles';

function InfoLine({ label, value, onPress, linkLabel }) {
  return (
    <View style={styles.infoLine}>
      <NoxText variant="secondary" style={styles.infoLabel}>
        {label}
      </NoxText>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flex: 1 }}>
          <NoxText variant="form" style={styles.infoLink}>
            {linkLabel || value}
          </NoxText>
        </TouchableOpacity>
      ) : (
        <NoxText variant="form" style={styles.infoValue}>
          {value}
        </NoxText>
      )}
    </View>
  );
}

const formatEventDate = (dateString, language) => {
  if (!dateString) return '';
  try {
    const iso = API_DATE_RE.test(dateString) ? `${dateString}T12:00:00` : dateString;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const formatTimeRange = (time, durationHours) => {
  if (!time) return '';
  if (!durationHours) return time;
  const normalized = String(time).replace(/[hH]/g, ':');
  const parts = normalized.split(':').map((p) => parseInt(p, 10));
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const endH = (h + Number(durationHours)) % 24;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}h${pad(m)} → ${pad(endH)}h${pad(m)}`;
};

export default function EventDetailPage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { routeParams, navigate, goBack } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();
  const [userProfiles, setUserProfiles] = useState(null);
  const [imageBroken, setImageBroken] = useState(false);

  const eventId = useMemo(
    () => routeParams?.eventId ?? EVENT_DETAIL_MOCK_EVENTS[0].id,
    [routeParams?.eventId],
  );
  const checkoutOnly = routeParams?.checkoutOnly === true;

  const defaultEvent = useMemo(
    () => EVENT_DETAIL_MOCK_EVENTS.find((item) => item.id === eventId) ?? EVENT_DETAIL_MOCK_EVENTS[0],
    [eventId],
  );

  const [event, setEvent] = useState(defaultEvent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState(false);

  useEffect(() => {
    if (!user?.isAuthenticated) {
      navigate('splash');
    }
  }, [user?.isAuthenticated, navigate]);

  /** Communauté : preview NOX sauf flux achat explicite (Phase D). */
  useEffect(() => {
    if (user?.activeProfileType === 'COMMUNITY' && !checkoutOnly && eventId) {
      navigate('communityEventDetail', { eventId });
    }
  }, [user?.activeProfileType, checkoutOnly, eventId, navigate]);

  useEffect(() => {
    setImageBroken(false);
  }, [event?.image, eventId]);

  const isEventPast = () => event.status === 'FINISHED';
  const isEventUpcoming = () => event.status === 'UPCOMING';

  const getStatusLabel = () => {
    switch (event.status) {
      case 'UPCOMING':
        return fr ? 'À venir' : 'Upcoming';
      case 'ONGOING':
        return fr ? 'En cours' : 'Ongoing';
      case 'FINISHED':
        return fr ? 'Terminé' : 'Finished';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (event.status) {
      case 'UPCOMING':
        return Colors.success;
      case 'ONGOING':
        return Colors.warning;
      case 'FINISHED':
        return Colors.textTertiary;
      default:
        return Colors.textTertiary;
    }
  };

  const handleReportEvent = async () => {
    if (!user?.token || reporting) return;

    const reasons = [
      { id: 'SPAM', label: fr ? 'Spam / pub' : 'Spam / ads' },
      { id: 'SCAM', label: fr ? 'Arnaque' : 'Scam' },
      { id: 'HARASSMENT', label: fr ? 'Harcèlement' : 'Harassment' },
      { id: 'ILLEGAL', label: fr ? 'Illégal' : 'Illegal' },
      { id: 'OTHER', label: fr ? 'Autre' : 'Other' },
    ];

    showConfirm(
      fr ? 'Signaler cet événement' : 'Report this event',
      fr ? 'Choisis une raison.' : 'Choose a reason.',
      [
        ...reasons.map((r) => ({
          text: r.label,
          onPress: async () => {
            try {
              setReporting(true);
              const res = await api.createReport(user.token, {
                targetType: 'EVENT',
                targetId: eventId,
                reason: r.id,
              });
              if (res?.success) showSuccess(fr ? 'Signalement envoyé.' : 'Report sent.');
              else showError(res?.message || (fr ? 'Impossible d’envoyer le signalement.' : 'Unable to send report.'));
            } catch {
              showError(fr ? 'Erreur lors du signalement.' : 'Reporting failed.');
            } finally {
              setReporting(false);
            }
          },
        })),
        { text: fr ? 'Annuler' : 'Cancel', style: 'cancel' },
      ],
    );
  };

  const showAddToCalendarBtn =
    isDeviceCalendarExportSupported() &&
    typeof event?.date === 'string' &&
    API_DATE_RE.test(event.date) &&
    (event.status === 'UPCOMING' || event.status === 'ONGOING');

  const handleAddToCalendar = async () => {
    if (addingToCalendar || !showAddToCalendarBtn) return;
    try {
      setAddingToCalendar(true);
      await addNoxEventToDeviceCalendar({
        title: event.title,
        date: event.date,
        time: event.time,
        durationHours: event.durationHours,
        location: event.location,
        notes: event.description,
      });
      showSuccess(fr ? 'Événement ajouté à ton agenda.' : 'Event added to your calendar.');
    } catch (e) {
      const code = e?.message;
      if (code === 'PERMISSION_DENIED') {
        showError(fr ? 'Accès au calendrier refusé. Autorise Nox dans Réglages.' : 'Calendar access denied. Allow Nox in Settings.');
      } else if (code === 'NO_CALENDAR') {
        showError(fr ? 'Aucun calendrier modifiable trouvé sur l’appareil.' : 'No writable calendar found on this device.');
      } else {
        showError(e?.message || (fr ? 'Impossible d’ajouter au calendrier.' : 'Could not add to calendar.'));
      }
    } finally {
      setAddingToCalendar(false);
    }
  };

  const fetchEvent = async () => {
    setLoading(true);
    setError(null);
    setEvent(defaultEvent);
    try {
      const data = await api.getEventById(eventId);
      if (data?.success && data.event) {
        setEvent(data.event);
      } else {
        setEvent(defaultEvent);
      }
    } catch {
      setEvent(defaultEvent);
      setError(fr ? "Impossible de charger l'événement en ligne." : 'Unable to load event online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    if (user?.isAuthenticated && user?.token) {
      loadUserProfiles();
    }
  }, [user?.isAuthenticated, user?.token]);

  const purchase = useEventDetailPurchase({
    event,
    eventId,
    language,
    user,
    navigate,
    showError,
    showSuccess,
    showConfirm,
    fetchEvent,
  });

  const {
    buyingTicket,
    acceptedCgv,
    setAcceptedCgv,
    selectedTierId,
    setSelectedTierId,
    ticketTiersForPurchase,
    hasMultipleTicketTiers,
    canProceedPurchaseTier,
    unitPriceForPurchase,
    priceBadgeLabel,
    handleBuyTicket,
  } = purchase;

  const groups = useEventDetailGroups({
    user,
    eventId,
    userProfiles,
    language,
    showError,
    showSuccess,
  });

  const {
    eventGroups,
    loadingGroups,
    creatingGroup,
    inviteModalVisible,
    setInviteModalVisible,
    friends,
    selectedFriends,
    setSelectedFriends,
    inviting,
    hasActiveCommunityProfile,
    handleCreateOrOpenGroup,
    handleInviteFriends,
    openInviteModal,
  } = groups;

  const loadUserProfiles = async () => {
    if (!user?.token) return;
    try {
      const response = await api.getUserProfiles(user.token);
      if (response?.success) {
        setUserProfiles(response);
      }
    } catch (err) {
      console.error('Erreur récupération profils:', err);
    }
  };

  const formattedDate = formatEventDate(event.date, language);
  const timeRange = formatTimeRange(event.time, event.durationHours);
  const statusColor = getStatusColor();
  const djList = Array.isArray(event.djs) ? event.djs : [];

  const renderPurchaseSection = () => {
    if (isEventUpcoming()) {
      if (user?.isAuthenticated && !hasActiveCommunityProfile()) {
        return (
          <View style={styles.warningCard}>
            <NoxText variant="secondary" style={styles.warningText}>
              {fr
                ? 'Seuls les profils Community peuvent acheter des tickets. Bascule sur ton profil Community depuis ton profil.'
                : 'Only Community profiles can buy tickets. Switch to your Community profile from your profile.'}
            </NoxText>
            <NoxButton
              label={fr ? 'Aller au profil' : 'Go to profile'}
              onPress={() => navigate('profile')}
            />
          </View>
        );
      }

      return (
        <View style={styles.purchaseSection}>
          {!canProceedPurchaseTier && hasMultipleTicketTiers ? (
            <NoxText variant="secondary" style={styles.helperTextTier}>
              {fr
                ? 'Aucun tarif disponible pour le moment (quotas épuisés ou vente non ouverte).'
                : 'No tiers available right now (sold out or sale not open).'}
            </NoxText>
          ) : null}

          {hasMultipleTicketTiers && ticketTiersForPurchase?.length ? (
            <View style={styles.tierSection}>
              <NoxText variant="titleSecondary" style={{ fontSize: 15 }}>
                {fr ? 'Choix du tarif' : 'Ticket type'}
              </NoxText>
              {ticketTiersForPurchase.map((t) => {
                const sel = t.id === selectedTierId;
                const ok = isTicketTierSelectable(t);
                const soldHint =
                  t.maxSold != null && t.maxSold !== '' && t.remaining != null
                    ? fr ? ` (${t.remaining} restant(s))` : ` (${t.remaining} left)`
                    : '';
                const windowHint = tierSaleWindowHint(t, language);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.tierChip, sel && styles.tierChipSelected, !ok && styles.tierChipDisabled]}
                    onPress={() => ok && setSelectedTierId(t.id)}
                    disabled={!ok}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sel, disabled: !ok }}
                  >
                    <NoxText
                      variant="form"
                      style={[
                        styles.tierChipLabel,
                        sel && styles.tierChipLabelSelected,
                        !ok && styles.tierChipLabelDisabled,
                      ]}
                    >
                      {t.label} · {t.price}€{soldHint}
                      {windowHint ? ` · ${windowHint}` : ''}
                    </NoxText>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <View style={styles.cgvRow}>
            <TouchableOpacity
              style={[styles.cgvCheckbox, acceptedCgv && styles.cgvCheckboxChecked]}
              onPress={() => setAcceptedCgv(!acceptedCgv)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedCgv }}
            >
              {acceptedCgv ? <NoxText style={styles.cgvCheckmark}>✓</NoxText> : null}
            </TouchableOpacity>
            <View style={styles.cgvTextWrap}>
              <NoxText variant="secondary">{fr ? "J'accepte les " : 'I accept the '}</NoxText>
              <TouchableOpacity onPress={() => navigate('legal', { type: 'cgv' })}>
                <NoxText variant="secondary" style={styles.cgvLink}>
                  {fr ? 'CGV' : 'Terms of Sale'}
                </NoxText>
              </TouchableOpacity>
              <NoxText variant="secondary">{fr ? ' pour cet achat.' : ' for this purchase.'}</NoxText>
            </View>
          </View>

          <NoxButton
            label={fr ? `Acheter un ticket (${unitPriceForPurchase}€)` : `Buy ticket (${unitPriceForPurchase}€)`}
            onPress={handleBuyTicket}
            loading={buyingTicket}
            disabled={
              buyingTicket ||
              !acceptedCgv ||
              !canProceedPurchaseTier ||
              (user?.isAuthenticated && !hasActiveCommunityProfile())
            }
            style={styles.buyBtn}
          />
        </View>
      );
    }

    if (isEventPast()) {
      return (
        <View style={styles.pastEventSection}>
          <NoxText variant="secondary" style={styles.pastEventText}>
            {fr ? 'Cet événement est terminé' : 'This event has ended'}
          </NoxText>
          <NoxButton
            label={fr ? 'Noter cet événement' : 'Rate this event'}
            variant="ghost"
            onPress={() =>
              navigate('rateEvent', {
                eventId: event.id,
                eventTitle: event.title,
                eventDate: event.date,
                eventStatus: event.status,
                venueId: event.venueId,
                venueName: event.venueName,
                djIds: event.djIds || [],
              })
            }
            style={styles.rateBtn}
          />
        </View>
      );
    }

    return (
      <View style={styles.pastEventSection}>
        <NoxText variant="secondary" style={styles.pastEventText}>
          {fr ? 'Cet événement est en cours' : 'This event is ongoing'}
        </NoxText>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <NoxText variant="secondary" style={styles.loadingText}>
          {fr ? 'Chargement de l’événement…' : 'Loading event…'}
        </NoxText>
        <NoxButton label={fr ? 'Retour' : 'Back'} variant="ghost" onPress={goBack} fullWidth={false} />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {event.image && !imageBroken ? (
            <Image
              source={{ uri: event.image }}
              style={styles.heroImage}
              onError={() => setImageBroken(true)}
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="musical-notes-outline" size={48} color={Colors.primary} />
            </View>
          )}
          <View style={styles.heroGradient} />

          <SafeAreaView edges={['top']} style={styles.heroTop}>
            <TouchableOpacity
              onPress={goBack}
              style={styles.heroBtn}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={fr ? 'Retour' : 'Back'}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            {!checkoutOnly ? (
              <TouchableOpacity
                onPress={handleReportEvent}
                style={[styles.heroBtn, reporting && styles.heroBtnDisabled]}
                hitSlop={12}
                disabled={reporting}
                accessibilityRole="button"
                accessibilityLabel={fr ? 'Signaler cet événement' : 'Report this event'}
              >
                <Ionicons name="flag-outline" size={18} color={Colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={styles.heroBtn} />
            )}
          </SafeAreaView>

          <View style={styles.heroBadges}>
            <View style={styles.priceBadge}>
              <NoxText style={styles.priceText}>{priceBadgeLabel}</NoxText>
            </View>
            {event.genre ? (
              <View style={styles.genreBadge}>
                <NoxText style={styles.genreText}>{event.genre}</NoxText>
              </View>
            ) : null}
          </View>

          <View style={styles.heroInfo}>
            {checkoutOnly ? (
              <NoxText variant="secondary" style={styles.checkoutBadge}>
                {fr ? 'Achat billet' : 'Ticket checkout'}
              </NoxText>
            ) : null}
            <NoxText variant="title" style={styles.heroTitle}>
              {event.title}
            </NoxText>
            <NoxText variant="secondary" style={styles.heroDate}>
              {formattedDate}
            </NoxText>
            {timeRange ? (
              <NoxText variant="secondary" style={styles.heroTime}>
                {timeRange}
              </NoxText>
            ) : null}
          </View>
        </View>

        <View style={styles.content}>
          {error ? (
            <NoxText variant="secondary" style={styles.errorText}>
              {error}
            </NoxText>
          ) : null}

          {checkoutOnly ? (
            <>
              <NoxText variant="titleSecondary" style={styles.sectionTitle}>
                {fr ? 'Récapitulatif' : 'Summary'}
              </NoxText>
              <InfoLine label={fr ? 'Événement' : 'Event'} value={event.title} />
              <InfoLine label={fr ? 'Date' : 'Date'} value={formattedDate} />
              <InfoLine label={fr ? 'Lieu' : 'Location'} value={event.location} />
            </>
          ) : (
            <>
          {event.status ? (
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
              <NoxText style={[styles.statusBadgeText, { color: statusColor }]}>
                {getStatusLabel()}
              </NoxText>
            </View>
          ) : null}

          <NoxText variant="titleSecondary" style={styles.sectionTitle}>
            {fr ? 'Informations événement' : 'Event information'}
          </NoxText>
          <InfoLine label={fr ? 'Nom' : 'Name'} value={event.title} />
          <InfoLine
            label={fr ? 'Horaires' : 'Schedule'}
            value={timeRange || `${formattedDate}${event.time ? ` · ${event.time}` : ''}`}
          />
          <InfoLine
            label={fr ? 'Participants attendus' : 'Expected attendees'}
            value={`${event.capacity ?? '—'}`}
          />
          {event.genre ? <InfoLine label={fr ? 'Style' : 'Genre'} value={event.genre} /> : null}
          <InfoLine label={fr ? 'Lieu' : 'Location'} value={event.location} />
          {event.capacity != null && event.sold != null ? (
            <InfoLine
              label={fr ? 'Places restantes' : 'Remaining spots'}
              value={`${event.capacity - event.sold} / ${event.capacity}`}
            />
          ) : null}

          {event.description ? (
            <>
              <NoxText variant="titleSecondary" style={styles.sectionTitle}>
                {fr ? 'Description' : 'Description'}
              </NoxText>
              <NoxText variant="description" style={styles.description}>
                {event.description}
              </NoxText>
            </>
          ) : null}

          {djList.length > 0 ? (
            <>
              <NoxText variant="titleSecondary" style={styles.sectionTitle}>
                Line-Up
              </NoxText>
              {djList.map((dj, idx) => {
                const isObject = typeof dj === 'object' && dj !== null;
                const name = isObject ? dj.artistName || 'DJ' : String(dj);
                if (isObject) {
                  return (
                    <TouchableOpacity
                      key={dj.userId || dj.djId || idx}
                      style={styles.lineupRow}
                      onPress={() => navigate('djProfile', { djUserId: dj.userId, djId: dj.djId })}
                      activeOpacity={0.7}
                    >
                      <NoxText variant="form" style={styles.lineupName}>
                        {name}
                      </NoxText>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                    </TouchableOpacity>
                  );
                }
                return (
                  <View key={idx} style={styles.lineupRow}>
                    <NoxText variant="form" style={styles.lineupName}>
                      {name}
                    </NoxText>
                  </View>
                );
              })}
            </>
          ) : null}

          {event.booker ? (
            <>
              <NoxText variant="titleSecondary" style={styles.sectionTitle}>
                {fr ? 'Organisateur' : 'Organizer'}
              </NoxText>
              <View style={styles.orgCard}>
                <View style={styles.orgRow}>
                  <View style={styles.orgAvatar}>
                    <Ionicons name="people-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <NoxText variant="form" style={styles.orgName}>
                      {event.booker.name}
                    </NoxText>
                  </View>
                </View>
                <NoxButton
                  label={fr ? 'Voir le profil' : 'View profile'}
                  variant="ghost"
                  onPress={() => navigate('bookerProfile', { bookerId: event.booker.id })}
                  style={styles.profileBtn}
                  fullWidth={false}
                />
              </View>
            </>
          ) : null}

          {event.venue ? (
            <>
              <NoxText variant="titleSecondary" style={styles.sectionTitle}>
                {fr ? 'Lieu' : 'Venue'}
              </NoxText>
              <View style={styles.orgCard}>
                <View style={styles.orgRow}>
                  <View style={styles.orgAvatar}>
                    <Ionicons name="business-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <NoxText variant="form" style={styles.orgName}>
                      {event.venue.venueName}
                    </NoxText>
                  </View>
                </View>
                <NoxButton
                  label={fr ? 'Voir le profil' : 'View profile'}
                  variant="ghost"
                  onPress={() => navigate('venueProfile', { venueId: event.venue.id })}
                  style={styles.profileBtn}
                  fullWidth={false}
                />
              </View>
            </>
          ) : null}

          {showAddToCalendarBtn ? (
            <NoxButton
              label={fr ? 'Ajouter à mon agenda' : 'Add to my calendar'}
              variant="secondary"
              loading={addingToCalendar}
              onPress={handleAddToCalendar}
              style={styles.calendarBtn}
            />
          ) : null}

          {isEventUpcoming() && user?.isAuthenticated && hasActiveCommunityProfile() ? (
            <View style={styles.friendsSection}>
              <NoxText variant="titleSecondary" style={styles.friendsSectionTitle}>
                {fr ? 'Aller avec des amis' : 'Go with friends'}
              </NoxText>
              <NoxText variant="secondary">
                {fr ? 'Crée un groupe et invite tes amis à cet événement.' : 'Create a group and invite friends to this event.'}
              </NoxText>
              {loadingGroups ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.sm }} />
              ) : (
                eventGroups.map((g) => (
                  <View key={g.id} style={styles.groupCard}>
                    <View style={styles.groupHeader}>
                      <NoxText variant="form" style={styles.groupName}>
                        {g.name || (fr ? 'Mon groupe' : 'My group')}
                      </NoxText>
                      <TouchableOpacity
                        style={styles.inviteMoreBtn}
                        onPress={() => openInviteModal(g.id)}
                      >
                        <NoxText style={styles.inviteMoreText}>
                          + {fr ? 'Inviter' : 'Invite'}
                        </NoxText>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.groupMembers}>
                      {g.members?.map((m) => (
                        <View key={m.id} style={styles.memberChip}>
                          <NoxText variant="secondary">
                            {m.pseudo} {m.status === 'JOINED' ? '✓' : m.status === 'INVITED' ? '?' : '✕'}
                          </NoxText>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
              <NoxButton
                label={
                  eventGroups.length > 0
                    ? fr ? 'Créer un autre groupe' : 'Create another group'
                    : fr ? 'Créer un groupe' : 'Create a group'
                }
                variant="ghost"
                loading={creatingGroup}
                onPress={handleCreateOrOpenGroup}
                style={styles.friendsBtn}
              />
            </View>
          ) : null}
            </>
          )}

          {renderPurchaseSection()}
        </View>
      </ScrollView>

      <Modal visible={inviteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <NoxText variant="titleSecondary" style={styles.modalTitle}>
              {fr ? 'Inviter des amis' : 'Invite friends'}
            </NoxText>
            <NoxText variant="secondary">
              {fr ? 'Sélectionne les amis à inviter' : 'Select friends to invite'}
            </NoxText>
            <FlatList
              data={friends}
              keyExtractor={(item) => item.communityId}
              style={styles.friendsList}
              renderItem={({ item }) => {
                const isSelected = selectedFriends.some((f) => f.communityId === item.communityId);
                return (
                  <TouchableOpacity
                    style={[styles.friendItem, isSelected && styles.friendItemSelected]}
                    onPress={() =>
                      setSelectedFriends((prev) =>
                        isSelected ? prev.filter((f) => f.communityId !== item.communityId) : [...prev, item],
                      )
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <NoxText variant="form" style={styles.friendItemText}>
                      {item.pseudo}
                    </NoxText>
                    {isSelected ? <NoxText style={styles.friendItemCheck}>✓</NoxText> : null}
                  </TouchableOpacity>
                );
              }}
            />
            <View style={styles.modalActions}>
              <NoxButton
                label={fr ? 'Annuler' : 'Cancel'}
                variant="secondary"
                onPress={() => setInviteModalVisible(false)}
                style={styles.modalActionBtn}
              />
              <NoxButton
                label={fr ? `Inviter (${selectedFriends.length})` : `Invite (${selectedFriends.length})`}
                loading={inviting}
                disabled={inviting || selectedFriends.length === 0}
                onPress={handleInviteFriends}
                style={styles.modalActionBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </KeyboardAvoidingView>
  );
}
