import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
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

export default function EventDetailPage() {
  const { language } = useLanguage();
  const { routeParams, navigate } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();
  const [userProfiles, setUserProfiles] = useState(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  
  const eventId = useMemo(
    () => routeParams?.eventId ?? EVENT_DETAIL_MOCK_EVENTS[0].id,
    [routeParams?.eventId],
  );

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
      navigate('home');
    }
  }, [user?.isAuthenticated, navigate]);

  // Utiliser le statut de l'événement plutôt que de calculer depuis la date
  const isEventPast = () => {
    return event.status === 'FINISHED';
  };

  const isEventUpcoming = () => {
    return event.status === 'UPCOMING';
  };

  const getStatusLabel = () => {
    switch (event.status) {
      case 'UPCOMING':
        return language === 'fr' ? 'À venir' : 'Upcoming';
      case 'ONGOING':
        return language === 'fr' ? 'En cours' : 'Ongoing';
      case 'FINISHED':
        return language === 'fr' ? 'Terminé' : 'Finished';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (event.status) {
      case 'UPCOMING':
        return '#10b981'; // Vert
      case 'ONGOING':
        return '#f59e0b'; // Orange
      case 'FINISHED':
        return '#6b7280'; // Gris
      default:
        return '#6b7280';
    }
  };

  const handleReportEvent = async () => {
    if (!user?.token || reporting) return;

    const reasons = [
      { id: 'SPAM', label: language === 'fr' ? 'Spam / pub' : 'Spam / ads' },
      { id: 'SCAM', label: language === 'fr' ? 'Arnaque' : 'Scam' },
      { id: 'HARASSMENT', label: language === 'fr' ? 'Harcèlement' : 'Harassment' },
      { id: 'ILLEGAL', label: language === 'fr' ? 'Illégal' : 'Illegal' },
      { id: 'OTHER', label: language === 'fr' ? 'Autre' : 'Other' },
    ];

    showConfirm(
      language === 'fr' ? 'Signaler cet événement' : 'Report this event',
      language === 'fr' ? 'Choisis une raison.' : 'Choose a reason.',
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
              if (res?.success) showSuccess(language === 'fr' ? 'Signalement envoyé.' : 'Report sent.');
              else showError(res?.message || (language === 'fr' ? 'Impossible d’envoyer le signalement.' : 'Unable to send report.'));
            } catch (e) {
              showError(language === 'fr' ? 'Erreur lors du signalement.' : 'Reporting failed.');
            } finally {
              setReporting(false);
            }
          },
        })),
        { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
      ]
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
      showSuccess(
        language === 'fr' ? 'Événement ajouté à ton agenda.' : 'Event added to your calendar.'
      );
    } catch (e) {
      const code = e?.message;
      if (code === 'PERMISSION_DENIED') {
        showError(
          language === 'fr'
            ? 'Accès au calendrier refusé. Autorise Nox dans Réglages.'
            : 'Calendar access denied. Allow Nox in Settings.'
        );
      } else if (code === 'NO_CALENDAR') {
        showError(
          language === 'fr'
            ? 'Aucun calendrier modifiable trouvé sur l’appareil.'
            : 'No writable calendar found on this device.'
        );
      } else {
        showError(
          e?.message ||
            (language === 'fr' ? 'Impossible d’ajouter au calendrier.' : 'Could not add to calendar.')
        );
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
    } catch (err) {
      setEvent(defaultEvent);
      setError(language === 'fr' ? "Impossible de charger l'événement en ligne." : "Unable to load event online.");
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
    setLoadingProfiles(true);
    try {
      const response = await api.getUserProfiles(user.token);
      if (response && response.success) {
        setUserProfiles(response);
      }
    } catch (error) {
      console.error('Erreur récupération profils:', error);
    } finally {
      setLoadingProfiles(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement de l'événement...</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('events')}
          accessibilityRole="button"
          accessibilityLabel={language === 'fr' ? 'Retour à la liste des événements' : 'Back to events list'}
        >
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButtonTop}
          onPress={() => navigate('events')}
          accessibilityRole="button"
          accessibilityLabel={language === 'fr' ? 'Retour à la liste des événements' : 'Back to events list'}
        >
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.reportChip, reporting && styles.reportChipDisabled]}
          onPress={handleReportEvent}
          activeOpacity={0.85}
          disabled={reporting}
          accessibilityRole="button"
          accessibilityLabel={language === 'fr' ? 'Signaler cet événement' : 'Report this event'}
        >
          <Text style={styles.reportChipText}>
            {reporting ? '...' : (language === 'fr' ? '🚩 Signaler' : '🚩 Report')}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: event.image }} style={styles.image} />
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{priceBadgeLabel}</Text>
          </View>
          <View style={styles.genreBadge}>
            <Text style={styles.genreText}>{event.genre}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Text style={styles.description}>{event.description}</Text>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📅</Text>
              <Text style={styles.infoText}>
                {event.date} à {event.time}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText}>{event.location}</Text>
            </View>
            {event.venue && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🏛️</Text>
                <TouchableOpacity
                  onPress={() => navigate('venueProfile', { venueId: event.venue.id })}
                  activeOpacity={0.7}
                  accessibilityRole="link"
                  accessibilityLabel={
                    language === 'fr'
                      ? `Lieu : ${event.venue.venueName}`
                      : `Venue: ${event.venue.venueName}`
                  }
                >
                  <Text style={styles.linkText}>{event.venue.venueName}</Text>
                </TouchableOpacity>
              </View>
            )}
            {event.djs && event.djs.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🎤</Text>
                <View style={styles.djList}>
                  {(Array.isArray(event.djs) ? event.djs : []).map((dj, idx) => {
                    const isObject = typeof dj === 'object' && dj !== null;
                    const name = isObject ? (dj.artistName || 'DJ') : String(dj);
                    if (isObject) {
                      return (
                        <TouchableOpacity
                          key={dj.userId || dj.djId || idx}
                          onPress={() => navigate('djProfile', { djUserId: dj.userId, djId: dj.djId })}
                          activeOpacity={0.7}
                          style={styles.djChip}
                          accessibilityRole="link"
                          accessibilityLabel={
                            language === 'fr' ? `Profil DJ : ${name}` : `DJ profile: ${name}`
                          }
                        >
                          <Text style={styles.linkText}>{name}</Text>
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <Text key={idx} style={styles.infoText}>{name}{idx < event.djs.length - 1 ? ', ' : ''}</Text>
                    );
                  })}
                </View>
              </View>
            )}
            {event.booker && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📋</Text>
                <TouchableOpacity
                  onPress={() => navigate('bookerProfile', { bookerId: event.booker.id })}
                  activeOpacity={0.7}
                  accessibilityRole="link"
                  accessibilityLabel={
                    language === 'fr'
                      ? `Organisateur : ${event.booker.name}`
                      : `Organizer: ${event.booker.name}`
                  }
                >
                  <Text style={styles.linkText}>
                    {language === 'fr' ? 'Organisateur : ' : 'Organizer: '}{event.booker.name}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🎟️</Text>
              <Text style={styles.infoText}>
                {event.capacity - event.sold} places restantes / {event.capacity}
              </Text>
            </View>
          </View>

          {showAddToCalendarBtn ? (
            <TouchableOpacity
              style={[styles.calendarOutlineButton, addingToCalendar && styles.calendarOutlineButtonDisabled]}
              onPress={handleAddToCalendar}
              disabled={addingToCalendar}
              accessibilityRole="button"
              accessibilityLabel={
                language === 'fr' ? 'Ajouter cet événement à mon agenda' : 'Add this event to my calendar'
              }
            >
              {addingToCalendar ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.calendarOutlineButtonText}>
                  {language === 'fr' ? '📅 Ajouter à mon agenda' : '📅 Add to my calendar'}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}

          {/* Badge de statut */}
          {event.status && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20', borderColor: getStatusColor() }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor() }]}>
                {getStatusLabel()}
              </Text>
            </View>
          )}

          {/* Aller avec des amis - Groupes d'événements */}
          {isEventUpcoming() && user?.isAuthenticated && hasActiveCommunityProfile() && (
            <View style={styles.friendsSection}>
              <Text style={styles.friendsSectionTitle}>
                {language === 'fr' ? '👥 Aller avec des amis' : '👥 Go with friends'}
              </Text>
              <Text style={styles.friendsSectionHint}>
                {language === 'fr' ? 'Crée un groupe et invite tes amis à cet événement.' : 'Create a group and invite friends to this event.'}
              </Text>
              {loadingGroups ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
              ) : eventGroups.length > 0 ? (
                <>
                  {eventGroups.map((g) => (
                    <View key={g.id} style={styles.groupCard}>
                      <View style={styles.groupHeader}>
                        <Text style={styles.groupName}>{g.name || (language === 'fr' ? 'Mon groupe' : 'My group')}</Text>
                        <TouchableOpacity
                          style={styles.inviteMoreBtn}
                          onPress={() => openInviteModal(g.id)}
                          accessibilityRole="button"
                          accessibilityLabel={
                            language === 'fr'
                              ? `Inviter des amis au groupe ${g.name || ''}`
                              : `Invite friends to group ${g.name || ''}`
                          }
                        >
                          <Text style={styles.inviteMoreBtnText}>+ {language === 'fr' ? 'Inviter' : 'Invite'}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.groupMembers}>
                        {g.members?.map((m) => (
                          <View key={m.id} style={styles.memberChip}>
                            <Text style={styles.memberChipText}>
                              {m.pseudo} {m.status === 'JOINED' ? '✓' : m.status === 'INVITED' ? '?' : '✕'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </>
              ) : null}
              <TouchableOpacity
                style={[styles.friendsButton, creatingGroup && styles.friendsButtonDisabled]}
                onPress={handleCreateOrOpenGroup}
                disabled={creatingGroup}
                accessibilityRole="button"
                accessibilityLabel={
                  eventGroups.length > 0
                    ? (language === 'fr' ? 'Créer un autre groupe' : 'Create another group')
                    : (language === 'fr' ? 'Créer un groupe pour cet événement' : 'Create a group for this event')
                }
              >
                {creatingGroup ? (
                  <ActivityIndicator color={Colors.background} size="small" />
                ) : (
                  <Text style={styles.friendsButtonText}>
                    {eventGroups.length > 0
                      ? (language === 'fr' ? 'Créer un autre groupe' : 'Create another group')
                      : (language === 'fr' ? 'Créer un groupe' : 'Create a group')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {isEventUpcoming() ? (
            user?.isAuthenticated && !hasActiveCommunityProfile() ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>
                  {language === 'fr' 
                    ? '⚠️ Seuls les profils Community peuvent acheter des tickets. Basculez sur votre profil Community depuis votre profil.' 
                    : '⚠️ Only Community profiles can buy tickets. Switch to your Community profile from your profile.'}
                </Text>
                <TouchableOpacity
                  style={styles.profileButton}
                  onPress={() => navigate('profile')}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'fr' ? 'Aller au profil' : 'Go to profile'}
                >
                  <Text style={styles.profileButtonText}>
                    {language === 'fr' ? 'Aller au profil' : 'Go to profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {!canProceedPurchaseTier && hasMultipleTicketTiers ? (
                  <Text style={[styles.helperTextTier, { marginBottom: 10 }]}>
                    {language === 'fr'
                      ? 'Aucun tarif disponible pour le moment (quotas épuisés ou vente non ouverte).'
                      : 'No tiers available right now (sold out or sale not open).'}
                  </Text>
                ) : null}
                {hasMultipleTicketTiers && ticketTiersForPurchase?.length ? (
                  <View style={styles.tierSection}>
                    <Text style={styles.tierSectionTitle}>
                      {language === 'fr' ? 'Choix du tarif' : 'Ticket type'}
                    </Text>
                    {ticketTiersForPurchase.map((t) => {
                      const sel = t.id === selectedTierId;
                      const ok = isTicketTierSelectable(t);
                      const soldHint =
                        t.maxSold != null && t.maxSold !== '' && t.remaining != null
                          ? language === 'fr'
                            ? ` (${t.remaining} restant(s))`
                            : ` (${t.remaining} left)`
                          : '';
                      const windowHint = tierSaleWindowHint(t, language);
                      return (
                        <TouchableOpacity
                          key={t.id}
                          style={[
                            styles.tierChip,
                            sel && styles.tierChipSelected,
                            !ok && styles.tierChipDisabled,
                          ]}
                          onPress={() => ok && setSelectedTierId(t.id)}
                          disabled={!ok}
                          accessibilityRole="button"
                          accessibilityState={{ selected: sel, disabled: !ok }}
                          accessibilityLabel={`${t.label} ${t.price}€${soldHint}${windowHint ? ` · ${windowHint}` : ''}`}
                        >
                          <Text
                            style={[
                              styles.tierChipLabel,
                              sel && styles.tierChipLabelSelected,
                              !ok && styles.tierChipLabelDisabled,
                            ]}
                          >
                            {t.label} · {t.price}€{soldHint}
                            {windowHint ? ` · ${windowHint}` : ''}
                          </Text>
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
                    accessibilityLabel={
                      language === 'fr'
                        ? 'Accepter les conditions générales de vente'
                        : 'Accept terms of sale'
                    }
                  >
                    {acceptedCgv && <Text style={styles.cgvCheckmark}>✓</Text>}
                  </TouchableOpacity>
                  <View style={styles.cgvTextWrap}>
                    <Text style={styles.cgvText}>
                      {language === 'fr' ? "J'accepte les " : 'I accept the '}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigate('legal', { type: 'cgv' })}
                      accessibilityRole="link"
                      accessibilityLabel={
                        language === 'fr' ? 'Lire les conditions générales de vente' : 'Read terms of sale'
                      }
                    >
                      <Text style={styles.cgvLink}>{language === 'fr' ? 'CGV' : 'Terms of Sale'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.cgvText}>
                      {language === 'fr' ? ' pour cet achat.' : ' for this purchase.'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.buyButton,
                    (buyingTicket || !acceptedCgv || !canProceedPurchaseTier) && styles.buyButtonDisabled,
                  ]}
                  onPress={handleBuyTicket}
                  disabled={
                    buyingTicket ||
                    !acceptedCgv ||
                    !canProceedPurchaseTier ||
                    (user?.isAuthenticated && !hasActiveCommunityProfile())
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    language === 'fr'
                      ? `Acheter un ticket pour ${unitPriceForPurchase} euros`
                      : `Buy ticket for ${unitPriceForPurchase} euros`
                  }
                >
                  {buyingTicket ? (
                    <ActivityIndicator color={Colors.background} />
                  ) : (
                    <Text style={styles.buyButtonText}>
                      {language === 'fr' ? 'Acheter un ticket' : 'Buy ticket'} ({unitPriceForPurchase}€)
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )
          ) : isEventPast() ? (
            <View style={styles.pastEventSection}>
              <Text style={styles.pastEventText}>
                {language === 'fr' ? 'Cet événement est terminé' : 'This event has ended'}
              </Text>
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => {
                  navigate('rateEvent', {
                    eventId: event.id,
                    eventTitle: event.title,
                    eventDate: event.date,
                    eventStatus: event.status, // Passer le statut
                    venueId: event.venueId,
                    venueName: event.venueName,
                    djIds: event.djIds || [],
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel={language === 'fr' ? 'Noter cet événement' : 'Rate this event'}
              >
                <Text style={styles.rateButtonText}>
                  {language === 'fr' ? 'Noter cet événement' : 'Rate this event'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pastEventSection}>
              <Text style={styles.pastEventText}>
                {language === 'fr' ? 'Cet événement est en cours' : 'This event is ongoing'}
              </Text>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Modal inviter des amis */}
      <Modal visible={inviteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{language === 'fr' ? 'Inviter des amis' : 'Invite friends'}</Text>
            <Text style={styles.modalHint}>{language === 'fr' ? 'Sélectionne les amis à inviter' : 'Select friends to invite'}</Text>
            <FlatList
              data={friends}
              keyExtractor={(item) => item.communityId}
              style={styles.friendsList}
              renderItem={({ item }) => {
                const isSelected = selectedFriends.some((f) => f.communityId === item.communityId);
                return (
                  <TouchableOpacity
                    style={[styles.friendItem, isSelected && styles.friendItemSelected]}
                    onPress={() => {
                      setSelectedFriends((prev) =>
                        isSelected ? prev.filter((f) => f.communityId !== item.communityId) : [...prev, item]
                      );
                    }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={item.pseudo}
                  >
                    <Text style={styles.friendItemText}>{item.pseudo}</Text>
                    {isSelected && <Text style={styles.friendItemCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setInviteModalVisible(false); }}
                accessibilityRole="button"
                accessibilityLabel={language === 'fr' ? 'Annuler' : 'Cancel'}
              >
                <Text style={styles.modalCancelText}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalInviteBtn, (inviting || selectedFriends.length === 0) && styles.modalInviteBtnDisabled]}
                onPress={handleInviteFriends}
                disabled={inviting || selectedFriends.length === 0}
                accessibilityRole="button"
                accessibilityLabel={
                  language === 'fr'
                    ? `Inviter ${selectedFriends.length} ami${selectedFriends.length > 1 ? 's' : ''}`
                    : `Invite ${selectedFriends.length} friend${selectedFriends.length !== 1 ? 's' : ''}`
                }
              >
                {inviting ? (
                  <ActivityIndicator color={Colors.background} size="small" />
                ) : (
                  <Text style={styles.modalInviteText}>
                    {language === 'fr' ? `Inviter (${selectedFriends.length})` : `Invite (${selectedFriends.length})`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
    </KeyboardAvoidingView>
  );
}
