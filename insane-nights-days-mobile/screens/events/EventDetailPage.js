import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../contexts/ConfirmContext';
import * as Stripe from '../../utils/stripe';

const mockEvents = [
  {
    id: '1',
    title: 'Insane Night - Soirée Electro',
    date: '15 Janvier 2024',
    time: '22:00',
    location: 'Club Insane, Paris',
    price: 25,
    capacity: 200,
    sold: 45,
    genre: 'Electro',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
    djs: ['DJ Neon', 'Mixmaster Nova'],
    description: 'Une soirée électro explosive avec les meilleurs DJs de la scène underground',
  },
  {
    id: '2',
    title: 'Bass Revolution - Drum & Bass',
    date: '20 Janvier 2024',
    time: '21:00',
    location: 'Warehouse Underground, Lyon',
    price: 30,
    capacity: 150,
    sold: 78,
    genre: 'Drum & Bass',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
    djs: ['Bass Storm', 'DJ Cyber'],
    description: 'Une révolution sonore avec les meilleurs artistes drum & bass',
  },
  {
    id: '3',
    title: 'Techno Underground Session',
    date: '25 Janvier 2024',
    time: '23:00',
    location: 'Le Bunker, Marseille',
    price: 20,
    capacity: 300,
    sold: 120,
    genre: 'Techno',
    image: 'https://images.unsplash.com/photo-1516900557549-41557d405ad2?w=400&h=300&fit=crop',
    djs: ['Techno Master', 'DJ Neon'],
    description: 'Session techno underground dans un lieu unique',
  },
];

export default function EventDetailPage() {
  const { language } = useLanguage();
  const { routeParams, navigate } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();
  const [userProfiles, setUserProfiles] = useState(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  
  const eventId = useMemo(
    () => routeParams?.eventId ?? mockEvents[0].id,
    [routeParams?.eventId],
  );

  const defaultEvent = useMemo(
    () => mockEvents.find((item) => item.id === eventId) ?? mockEvents[0],
    [eventId],
  );

  const [event, setEvent] = useState(defaultEvent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyingTicket, setBuyingTicket] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [eventGroups, setEventGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [invitingGroupId, setInvitingGroupId] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [inviting, setInviting] = useState(false);

  // ✅ AJOUT: Vérifier l'authentification et rediriger si non connecté
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

  const handleBuyTicket = async () => {
    if (!user?.isAuthenticated) {
      showError(language === 'fr' ? 'Vous devez être connecté pour acheter un ticket.' : 'You must be logged in to buy a ticket.');
      return;
    }

    if (!user?.token) {
      showError(language === 'fr' ? 'Token d\'authentification manquant.' : 'Authentication token missing.');
      return;
    }

    setBuyingTicket(true);
    try {
      // ✅ Web: Stripe natif indisponible -> fallback mode test
      if (!Stripe?.isStripeSupported || Platform.OS === 'web') {
        showConfirm(
          language === 'fr' ? 'Paiement Stripe indisponible (Web)' : 'Stripe unavailable (Web)',
          language === 'fr'
            ? 'Stripe natif n’est pas disponible sur la version web. Voulez-vous continuer en mode démo (achat ticket sans paiement) ?'
            : 'Native Stripe is not available on web. Continue in demo mode (buy ticket without payment)?',
          [
            { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
            {
              text: language === 'fr' ? 'Continuer' : 'Continue',
              onPress: async () => {
                const response = await api.buyTicket(user.token, eventId, 1);
                if (response && response.success) {
                  showSuccess(response.message || (language === 'fr' ? 'Ticket acheté (mode test).' : 'Ticket bought (test mode).'));
                  fetchEvent();
                  // ✅ Écran succès
                  setTimeout(() => {
                    navigate('purchaseSuccess', {
                      eventId,
                      eventTitle: event?.title,
                      quantity: 1,
                      amount: event?.price,
                    });
                  }, 600);
                } else {
                  showError(response?.message || (language === 'fr' ? 'Erreur lors de l\'achat.' : 'Error purchasing ticket.'));
                }
              },
            },
          ]
        );
        return;
      }

      // 1) Créer PaymentIntent côté backend (uniquement si Stripe est dispo)
      const intentRes = await api.createTicketPaymentIntent(user.token, eventId, 1);
      if (!intentRes?.success || !intentRes?.paymentIntentClientSecret || !intentRes?.paymentIntentId) {
        showError(intentRes?.message || (language === 'fr' ? 'Impossible de démarrer le paiement.' : 'Unable to start payment.'));
        return;
      }

      // 2) Initialiser Stripe (nécessaire même si on n'utilise pas StripeProvider)
      try {
        await Stripe.initStripe({
          publishableKey: intentRes.publishableKey,
          urlScheme: 'insane-nights-days-mobile',
        });
      } catch (e) {
        showError(
          e?.message ||
            (language === 'fr'
              ? 'Erreur initialisation Stripe.'
              : 'Stripe initialization error.')
        );
        return;
      }

      const init = await Stripe.initPaymentSheet({
        merchantDisplayName: 'Nox',
        paymentIntentClientSecret: intentRes.paymentIntentClientSecret,
        allowsDelayedPaymentMethods: true,
        returnURL: 'insane-nights-days-mobile://stripe-redirect',
      });
      if (init?.error) {
        showError(init.error.message || (language === 'fr' ? 'Erreur initialisation paiement.' : 'Payment init error.'));
        return;
      }

      const presented = await Stripe.presentPaymentSheet();
      if (presented?.error) {
        showError(presented.error.message || (language === 'fr' ? 'Paiement annulé.' : 'Payment cancelled.'));
        return;
      }

      // 3) Confirmer côté backend et délivrer les tickets (idempotent)
      const confirmRes = await api.confirmTicketPurchase(user.token, intentRes.paymentIntentId);
      if (confirmRes?.success) {
        showSuccess(confirmRes.message || (language === 'fr' ? 'Paiement validé, ticket créé !' : 'Payment succeeded, ticket created!'));
        fetchEvent();
        // ✅ Écran succès
        setTimeout(() => {
          navigate('purchaseSuccess', {
            eventId,
            eventTitle: event?.title,
            quantity: 1,
            amount: event?.price,
          });
        }, 600);
      } else {
        showError(confirmRes?.message || (language === 'fr' ? 'Paiement validé, mais erreur lors de la délivrance du ticket.' : 'Payment succeeded but ticket delivery failed.'));
      }
    } catch (error) {
      console.error('Erreur paiement ticket:', error);
      showError(error.message || (language === 'fr' ? 'Erreur lors du paiement.' : 'Payment error.'));
    } finally {
      setBuyingTicket(false);
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

  const fetchEventGroups = useCallback(async () => {
    if (!user?.token || !eventId) return;
    setLoadingGroups(true);
    try {
      const res = await api.getEventGroups(user.token, eventId);
      if (res?.success && res.groups) setEventGroups(res.groups);
    } catch (e) {
      setEventGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, [user?.token, eventId]);

  useEffect(() => {
    if (user?.token && eventId && userProfiles?.activeProfileType === 'COMMUNITY' && userProfiles?.profiles?.community?.length) {
      fetchEventGroups();
    }
  }, [user?.token, eventId, userProfiles?.activeProfileType, userProfiles?.profiles?.community, fetchEventGroups]);

  const normalizeGroup = (g) => ({
    id: g.id,
    name: g.name,
    creator: g.creator,
    members: (g.members || []).map((m) => ({
      id: m.id,
      communityId: m.communityId || m.community?.id,
      pseudo: m.pseudo ?? m.community?.pseudo ?? 'Anonyme',
      profileImage: m.profileImage ?? m.community?.profileImage,
      status: m.status,
    })),
  });

  const handleCreateOrOpenGroup = async () => {
    if (!user?.token || !hasActiveCommunityProfile()) {
      showError(language === 'fr' ? 'Profil Communauté requis.' : 'Community profile required.');
      return;
    }
    setCreatingGroup(true);
    try {
      const res = await api.createEventGroup(user.token, eventId);
      if (res?.success && res.group) {
        const normalized = normalizeGroup(res.group);
        setEventGroups((prev) => {
          const exists = prev.some((g) => g.id === normalized.id);
          if (exists) return prev;
          return [...prev, normalized];
        });
        setInvitingGroupId(normalized.id);
        setSelectedFriends([]);
        const friendsRes = await api.getCommunityFriends(user.token);
        if (friendsRes?.success && friendsRes.friends) setFriends(friendsRes.friends);
        setInviteModalVisible(true);
      } else {
        showError(res?.message || 'Erreur');
      }
    } catch (e) {
      showError(e?.message || 'Erreur');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleInviteFriends = async () => {
    if (!invitingGroupId || selectedFriends.length === 0) return;
    setInviting(true);
    try {
      const res = await api.inviteToEventGroup(
        user.token,
        eventId,
        invitingGroupId,
        selectedFriends.map((f) => f.communityId)
      );
      if (res?.success) {
        showSuccess(language === 'fr' ? `${res.invited || 0} ami(s) invité(s)` : `${res.invited || 0} friend(s) invited`);
        setInviteModalVisible(false);
        setInvitingGroupId(null);
        setSelectedFriends([]);
        fetchEventGroups();
      } else {
        showError(res?.message || 'Erreur');
      }
    } catch (e) {
      showError(e?.message || 'Erreur');
    } finally {
      setInviting(false);
    }
  };

  const openInviteModal = (groupId) => {
    setInvitingGroupId(groupId);
    setSelectedFriends([]);
    api.getCommunityFriends(user.token).then((friendsRes) => {
      if (friendsRes?.success && friendsRes.friends) setFriends(friendsRes.friends);
    });
    setInviteModalVisible(true);
  };

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

  const hasActiveCommunityProfile = () => {
    return userProfiles?.activeProfileType === 'COMMUNITY' && 
           userProfiles?.profiles?.community && 
           userProfiles.profiles.community.length > 0;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FF1744" />
        <Text style={styles.loadingText}>Chargement de l'événement...</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigate('events')}>
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
        <TouchableOpacity style={styles.backButtonTop} onPress={() => navigate('events')}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.reportChip, reporting && styles.reportChipDisabled]}
          onPress={handleReportEvent}
          activeOpacity={0.85}
          disabled={reporting}
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
            <Text style={styles.priceText}>{event.price}€</Text>
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
            {event.djs && event.djs.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🎤</Text>
                <Text style={styles.infoText}>
                  {Array.isArray(event.djs) ? event.djs.join(', ') : event.djs}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🎟️</Text>
              <Text style={styles.infoText}>
                {event.capacity - event.sold} places restantes / {event.capacity}
              </Text>
            </View>
          </View>

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
                <ActivityIndicator size="small" color="#FF1744" style={{ marginVertical: 12 }} />
              ) : eventGroups.length > 0 ? (
                <>
                  {eventGroups.map((g) => (
                    <View key={g.id} style={styles.groupCard}>
                      <View style={styles.groupHeader}>
                        <Text style={styles.groupName}>{g.name || (language === 'fr' ? 'Mon groupe' : 'My group')}</Text>
                        <TouchableOpacity style={styles.inviteMoreBtn} onPress={() => openInviteModal(g.id)}>
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
              >
                {creatingGroup ? (
                  <ActivityIndicator color="#0b0b0e" size="small" />
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
                >
                  <Text style={styles.profileButtonText}>
                    {language === 'fr' ? 'Aller au profil' : 'Go to profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.buyButton, buyingTicket && styles.buyButtonDisabled]}
                onPress={handleBuyTicket}
                disabled={buyingTicket || (user?.isAuthenticated && !hasActiveCommunityProfile())}
              >
                {buyingTicket ? (
                  <ActivityIndicator color="#0b0b0e" />
                ) : (
                  <Text style={styles.buyButtonText}>
                    {language === 'fr' ? 'Acheter un ticket' : 'Buy ticket'} ({event.price}€)
                  </Text>
                )}
              </TouchableOpacity>
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
                  >
                    <Text style={styles.friendItemText}>{item.pseudo}</Text>
                    {isSelected && <Text style={styles.friendItemCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setInviteModalVisible(false); setInvitingGroupId(null); }}>
                <Text style={styles.modalCancelText}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalInviteBtn, (inviting || selectedFriends.length === 0) && styles.modalInviteBtnDisabled]}
                onPress={handleInviteFriends}
                disabled={inviting || selectedFriends.length === 0}
              >
                {inviting ? (
                  <ActivityIndicator color="#0b0b0e" size="small" />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  reportChipDisabled: {
    opacity: 0.6,
  },
  reportChipText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '900',
    fontSize: 12,
  },
  backButtonTop: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
  backButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.4)',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    position: 'relative',
    height: 280,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  priceBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#FF1744',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  priceText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '900',
  },
  genreBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(11,11,14,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  genreText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  description: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    lineHeight: 24,
  },
  errorText: {
    color: '#f97316',
    fontSize: 14,
    lineHeight: 20,
  },
  infoSection: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 26,
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  buyButton: {
    backgroundColor: '#FF1744',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buyButtonDisabled: {
    opacity: 0.6,
  },
  buyButtonText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '800',
  },
  pastEventSection: {
    gap: 16,
  },
  pastEventText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  rateButton: {
    backgroundColor: 'rgba(255,23,68,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.5)',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  rateButtonText: {
    color: '#FF1744',
    fontSize: 18,
    fontWeight: '700',
  },
  dateEditor: {
    marginTop: 16,
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 12,
    padding: 16,
  },
  dateEditorLabel: {
    color: '#FF1744',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateEditorInput: {
    backgroundColor: '#0b0b0e',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
  },
  dateEditorButton: {
    backgroundColor: '#FF1744',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dateEditorButtonText: {
    color: '#0b0b0e',
    fontSize: 14,
    fontWeight: '700',
  },
  warningCard: {
    backgroundColor: 'rgba(250,204,21,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.4)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  warningText: {
    color: '#facc15',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  profileButton: {
    backgroundColor: '#FF1744',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  profileButtonText: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '700',
  },
  friendsSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255,23,68,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.25)',
  },
  friendsSectionTitle: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  friendsSectionHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: 12,
  },
  friendsButton: {
    backgroundColor: 'rgba(255,23,68,0.3)',
    borderWidth: 1,
    borderColor: '#FF1744',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  friendsButtonDisabled: {
    opacity: 0.6,
  },
  friendsButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  groupCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  groupName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  inviteMoreBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,23,68,0.3)',
    borderRadius: 8,
  },
  inviteMoreBtnText: {
    color: '#FF1744',
    fontSize: 13,
    fontWeight: '600',
  },
  groupMembers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  memberChipText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: '#141419',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: 16,
  },
  friendsList: {
    maxHeight: 220,
    marginBottom: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    marginBottom: 8,
  },
  friendItemSelected: {
    backgroundColor: 'rgba(255,23,68,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.5)',
  },
  friendItemText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  friendItemCheck: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '700',
  },
  modalInviteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF1744',
    alignItems: 'center',
  },
  modalInviteBtnDisabled: {
    opacity: 0.5,
  },
  modalInviteText: {
    color: '#0b0b0e',
    fontSize: 15,
    fontWeight: '800',
  },
});
