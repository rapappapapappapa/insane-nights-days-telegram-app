import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Animated,
  Platform,
  Linking,
  KeyboardAvoidingView,
  Modal,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, API_CONFIG, normalizeMediaUrl } from '../../api/config';
import Colors from '../../constants/colors';
import StarRating from '../../components/StarRating';
import VideoPlayer from '../../components/VideoPlayer';
import BuiltInStreamPlayerModal from '../../components/BuiltInStreamPlayerModal';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../contexts/ConfirmContext';
import NotificationBadge from '../../components/NotificationBadge';
import { useNotifications } from '../../hooks/useNotifications';
import { useChatPoll } from '../../hooks/useChatPoll';
import RejectReasonModal from '../../components/RejectReasonModal';
import ContractDraftEditorFields from '../../components/ContractDraftEditorFields';
import CancellationPolicyPickerModal from '../../components/CancellationPolicyPickerModal';
import EventEndTimePickerModal from '../../components/EventEndTimePickerModal';
import ContractPdfPreviewModal from '../../components/ContractPdfPreviewModal';
import {
  draftFromPayload,
  buildDjContractPayload,
  contractAcceptAckLabel,
  cancellationPolicyLabel,
  buildEventEndTimeOptions,
  formatEventWindowHint,
} from '../../constants/contractPayload';
import { Ionicons } from '@expo/vector-icons';
import { resolveStreamingEmbed } from '../../utils/streamingEmbedUrl';
import { cleanText } from '../../utils/djDashboardUtils';
import { styles, SIDEBAR_WIDTH } from './DjDashboardPage.styles';
import DjProfilSection from '../../components/djDashboard/sections/DjProfilSection';
import DjTarifsSection from '../../components/djDashboard/sections/DjTarifsSection';
import DjMaterielSection from '../../components/djDashboard/sections/DjMaterielSection';
import DjBookingsSection from '../../components/djDashboard/sections/DjBookingsSection';
import DjAvisSection from '../../components/djDashboard/sections/DjAvisSection';
import DjPaiementsSection from '../../components/djDashboard/sections/DjPaiementsSection';
import DjMediasSection from '../../components/djDashboard/sections/DjMediasSection';

export default function DjDashboardPage() {
  const { height: contractModalWindowH } = useWindowDimensions();
  const contractEditorModalCardHeight = Math.round(contractModalWindowH * 0.88);
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();
  const { unreadCount, refreshUnreadCount, markAllAsRead } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [djProfile, setDjProfile] = useState(null);

  // Avis & notes (DJ)
  const [ratingsData, setRatingsData] = useState(null); // { dj, ratings, media }
  const [loadingRatings, setLoadingRatings] = useState(false);
  
  // Menu latéral
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarAnimation = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  
  // Section active - ouvrir bookings si demandé via routeParams
  const shouldOpenBookings =
    !!routeParams?.openBookings || !!routeParams?.openChatEventDjId || !!routeParams?.openChatEventId;
  const [activeSection, setActiveSection] = useState(shouldOpenBookings ? 'bookings' : 'profil');
  
  // Formulaire
  const [artistName, setArtistName] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [realName, setRealName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [bio, setBio] = useState('');
  const [genre, setGenre] = useState('Techno');
  const [mainCity, setMainCity] = useState('');
  const [languages, setLanguages] = useState('Français, Anglais');
  
  // Réseaux sociaux
  const [soundcloudUrl, setSoundcloudUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  
  // Matériel
  const [equipment, setEquipment] = useState('');
  
  // Infos légales (contrats)
  const [legalName, setLegalName] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [siret, setSiret] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  
  // Tarifs retirés: prix fixé via contrat Booker ↔ DJ
  
  // Disponibilités
  const [availableDays, setAvailableDays] = useState({
    M: true, Ma: true, Me: true, J: true, V: true, S: false, D: false
  });
  const [availableStatus, setAvailableStatus] = useState(true);
  
  // Médias
  const [photos, setPhotos] = useState([]); // Array of { id, url }
  const [videos, setVideos] = useState([]); // Array of { id, url }
  const [bannerImage, setBannerImage] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  
  // Édition de titre
  const [editingTitle, setEditingTitle] = useState(null); // { type: 'video', id, currentTitle }
  const [editTitleValue, setEditTitleValue] = useState('');
  const [streamPreviewPlayer, setStreamPreviewPlayer] = useState({
    visible: false,
    uri: null,
    title: '',
  });
  
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);

  // Bookings
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectModalInvitationId, setRejectModalInvitationId] = useState(null);
  const [rejectModalAction, setRejectModalAction] = useState('reject'); // 'reject' | 'cancel'

  // Chat
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedChatEventDjId, setSelectedChatEventDjId] = useState(null);
  const [selectedChatEventId, setSelectedChatEventId] = useState(null); // Pour les chats de groupe
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingChatMessages, setLoadingChatMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const chatScrollViewRef = useRef(null);

  // ✅ Contrat (MVP) - intégré au chat privé Booker <-> DJ
  const [contractLoading, setContractLoading] = useState(false);
  const [contractData, setContractData] = useState(null);
  const [contractBooking, setContractBooking] = useState(null);
  const [contractEditorVisible, setContractEditorVisible] = useState(false);
  const [contractDraft, setContractDraft] = useState(() => draftFromPayload({}, 'dj'));
  const [venueContractGate, setVenueContractGate] = useState(null);
  const [contractAcceptAck, setContractAcceptAck] = useState(false);
  const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showEventEndModal, setShowEventEndModal] = useState(false);
  const [contractPdfPreview, setContractPdfPreview] = useState({
    visible: false,
    loading: false,
    pdfBase64: null,
    error: null,
    pendingAction: null,
  });
  const reopenChatAfterContractRef = useRef(false);
  const pendingOpenContractEditorRef = useRef(false);
  const openContractEditorFallbackTimerRef = useRef(null);
  const contractEditorWasVisibleForPdfRef = useRef(false);
  const contractEditorWasHiddenForChildModalRef = useRef(false);
  const iosPickerOpeningRef = useRef(false);

  const flushPendingContractEditor = () => {
    pendingOpenContractEditorRef.current = false;
    if (openContractEditorFallbackTimerRef.current) {
      clearTimeout(openContractEditorFallbackTimerRef.current);
      openContractEditorFallbackTimerRef.current = null;
    }
  };

  const closeContractEditorSession = () => {
    contractEditorWasHiddenForChildModalRef.current = false;
    iosPickerOpeningRef.current = false;
    setContractEditorVisible(false);
    setShowPaymentTermsModal(false);
    setShowCancellationModal(false);
    setShowEventEndModal(false);
    if (reopenChatAfterContractRef.current) {
      reopenChatAfterContractRef.current = false;
      setChatModalVisible(true);
    }
  };

  const openContractEditorFromChat = () => {
    if (Platform.OS === 'ios' && chatModalVisible) {
      reopenChatAfterContractRef.current = true;
      pendingOpenContractEditorRef.current = true;
      if (openContractEditorFallbackTimerRef.current) {
        clearTimeout(openContractEditorFallbackTimerRef.current);
      }
      setChatModalVisible(false);
      openContractEditorFallbackTimerRef.current = setTimeout(() => {
        openContractEditorFallbackTimerRef.current = null;
        if (!pendingOpenContractEditorRef.current) return;
        pendingOpenContractEditorRef.current = false;
        setContractEditorVisible(true);
      }, 520);
    } else {
      setContractEditorVisible(true);
    }
  };

  const liftContractEditorForIosPicker = (openPicker) => {
    if (Platform.OS === 'ios' && contractEditorVisible) {
      contractEditorWasHiddenForChildModalRef.current = true;
      iosPickerOpeningRef.current = true;
      setContractEditorVisible(false);
      setTimeout(() => {
        openPicker();
        iosPickerOpeningRef.current = false;
      }, 320);
    } else {
      openPicker();
    }
  };

  const setShowPaymentTermsModalForContract = (v) => {
    if (!v) return setShowPaymentTermsModal(false);
    liftContractEditorForIosPicker(() => setShowPaymentTermsModal(true));
  };
  const setShowCancellationModalForContract = (v) => {
    if (!v) return setShowCancellationModal(false);
    liftContractEditorForIosPicker(() => setShowCancellationModal(true));
  };
  const setShowEventEndModalForContract = (v) => {
    if (!v) return setShowEventEndModal(false);
    liftContractEditorForIosPicker(() => setShowEventEndModal(true));
  };

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (iosPickerOpeningRef.current) return;
    const anyOpen = showPaymentTermsModal || showCancellationModal || showEventEndModal;
    if (anyOpen) return;
    if (!contractEditorWasHiddenForChildModalRef.current) return;
    contractEditorWasHiddenForChildModalRef.current = false;
    const tid = setTimeout(() => setContractEditorVisible(true), 80);
    return () => clearTimeout(tid);
  }, [showPaymentTermsModal, showCancellationModal, showEventEndModal]);

  const PAYMENT_TERMS_OPTIONS = [
    { value: 'jour_booking', labelFr: 'Jour booking', labelEn: 'Booking day' },
    { value: 'j-1_prestation', labelFr: 'J-1 prestation', labelEn: 'D-1 performance' },
    { value: 'j+1_prestation', labelFr: 'J+1 prestation', labelEn: 'D+1 performance' },
    { value: 'j+15', labelFr: 'J+15', labelEn: 'D+15' },
    { value: 'j+30', labelFr: 'J+30', labelEn: 'D+30' },
  ];

  const handleBack = () => {
    goBack();
  };

  useEffect(() => {
    if (user?.token) {
      fetchDjProfile();
    }
  }, [user?.token]);

  useEffect(() => {
    setContractAcceptAck(false);
  }, [selectedChatEventDjId, contractData?.id, contractData?.status, contractData?.sentBy]);

  // Charger les bookings quand on accède à la section
  useEffect(() => {
    if (activeSection === 'bookings' && user?.token && !loadingBookings) {
      fetchBookings();
    }
  }, [activeSection, user?.token]);

  // Charger les avis quand on accède à la section
  useEffect(() => {
    if (activeSection === 'avis' && user?.token && user?.id && !loadingRatings) {
      fetchRatings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, user?.token, user?.id]);

  const fetchRatings = async () => {
    if (!user?.token || !user?.id) return;
    setLoadingRatings(true);
    try {
      // Endpoint public, mais on l'utilise pour afficher les avis du DJ connecté
      const res = await api.getDjRatings(user.id);
      if (res?.success) {
        setRatingsData(res);
      } else {
        setRatingsData(null);
      }
    } catch (e) {
      console.error('Erreur récupération avis DJ:', e);
      setRatingsData(null);
    } finally {
      setLoadingRatings(false);
    }
  };

  // Fonctions de chat
  const openChat = async (eventDjId) => {
    setSelectedChatEventDjId(eventDjId);
    setSelectedChatEventId(null);
    setIsGroupChat(false);
    setChatModalVisible(true);
    setChatMessages([]);
    await loadChatMessages(eventDjId, false);
    // ✅ Quand on ouvre les messages, on marque comme lu (remet le compteur à 0)
    await markAllAsRead();
    // ✅ Charger le contrat (chat privé)
    await loadContract(eventDjId);
  };

  const openGroupChat = async (eventId) => {
    setSelectedChatEventDjId(null);
    setSelectedChatEventId(eventId);
    setIsGroupChat(true);
    setChatModalVisible(true);
    setChatMessages([]);
    await loadChatMessages(eventId, true);
    // ✅ Quand on ouvre les messages, on marque comme lu (remet le compteur à 0)
    await markAllAsRead();
  };

  const loadContract = async (eventDjId) => {
    if (!user?.token || !eventDjId) return;
    setContractLoading(true);
    setVenueContractGate(null);
    try {
      const res = await api.getBookingContract(user.token, eventDjId);
      if (res?.success) {
        setContractData(res.contract || null);
        setContractBooking(res.booking || null);
        setVenueContractGate(res.venueContractGate ?? null);
        const p = res.contract?.payload || {};
        setContractDraft(draftFromPayload(p, 'dj'));
      }
    } catch (e) {
      console.error('[DjDashboard] loadContract error:', e);
    } finally {
      setContractLoading(false);
    }
  };

  const acceptContract = async () => {
    if (!user?.token || !selectedChatEventDjId) return;
    try {
      const res = await api.acceptBookingContract(user.token, selectedChatEventDjId);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contrat accepté.' : 'Contract accepted.');
        await loadContract(selectedChatEventDjId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d’accepter.' : 'Unable to accept.'));
      }
    } catch (e) {
      console.error('[DjDashboard] acceptContract error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
    }
  };

  const counterContract = async () => {
    if (!user?.token || !selectedChatEventDjId) return;
    try {
      const payload = buildDjContractPayload(contractDraft);
      const res = await api.counterBookingContract(user.token, selectedChatEventDjId, payload);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contre-proposition envoyée.' : 'Counter-proposal sent.');
        closeContractEditorSession();
        await loadContract(selectedChatEventDjId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d’envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('[DjDashboard] counterContract error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
    }
  };

  const closeContractPdfPreview = () => {
    const reopenEditor = contractEditorWasVisibleForPdfRef.current;
    contractEditorWasVisibleForPdfRef.current = false;
    setContractPdfPreview({
      visible: false,
      loading: false,
      pdfBase64: null,
      error: null,
      pendingAction: null,
    });
    if (reopenEditor) {
      if (Platform.OS === 'ios') {
        setTimeout(() => setContractEditorVisible(true), 350);
      } else {
        setContractEditorVisible(true);
      }
    } else if (reopenChatAfterContractRef.current) {
      reopenChatAfterContractRef.current = false;
      setChatModalVisible(true);
    }
  };

  const openContractPdfPreview = async ({ previewPayload, pendingAction }) => {
    if (!user?.token || !selectedChatEventDjId) return;
    contractEditorWasVisibleForPdfRef.current = contractEditorVisible;
    setContractEditorVisible(false);

    const runPreview = async () => {
      setContractPdfPreview({
        visible: true,
        loading: true,
        pdfBase64: null,
        error: null,
        pendingAction,
      });
      try {
        const res = await api.previewBookingContractPdf(user.token, selectedChatEventDjId, previewPayload);
        if (res?.success && res.pdfBase64) {
          setContractPdfPreview((p) => ({ ...p, loading: false, pdfBase64: res.pdfBase64 }));
        } else {
          setContractPdfPreview((p) => ({
            ...p,
            loading: false,
            error: res?.message || (language === 'fr' ? 'Impossible de générer le PDF.' : 'Could not generate PDF.'),
          }));
        }
      } catch (e) {
        setContractPdfPreview((p) => ({
          ...p,
          loading: false,
          error: e.message || (language === 'fr' ? 'Erreur réseau.' : 'Network error.'),
        }));
      }
    };

    if (Platform.OS === 'ios' && chatModalVisible) {
      reopenChatAfterContractRef.current = true;
      setChatModalVisible(false);
      setTimeout(() => {
        runPreview();
      }, 480);
    } else {
      await runPreview();
    }
  };

  const confirmContractPdfPreview = async () => {
    contractEditorWasVisibleForPdfRef.current = false;
    const action = contractPdfPreview.pendingAction;
    setContractPdfPreview({
      visible: false,
      loading: false,
      pdfBase64: null,
      error: null,
      pendingAction: null,
    });
    try {
      if (action === 'accept') await acceptContract();
      else if (action === 'counter') {
        await counterContract();
        return;
      }
    } finally {
      if (reopenChatAfterContractRef.current) {
        reopenChatAfterContractRef.current = false;
        setChatModalVisible(true);
      }
    }
  };

  // ✅ Ouvrir automatiquement la conversation depuis une notification (DJ)
  useEffect(() => {
    if (!user?.token) return;
    const type = routeParams?.openChatType;
    const eventDjId = routeParams?.openChatEventDjId;
    const eventId = routeParams?.openChatEventId;

    if (type === 'PRIVATE' && eventDjId) {
      openChat(eventDjId);
    } else if (type === 'GROUP' && eventId) {
      openGroupChat(eventId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, routeParams?.openChatType, routeParams?.openChatEventDjId, routeParams?.openChatEventId]);

  const loadChatMessages = async (id, isGroup = false, options = {}) => {
    const silent = options.silent === true;
    if (!user?.token || !id) return;

    if (!silent) setLoadingChatMessages(true);
    try {
      const response = isGroup
        ? await api.getGroupMessages(user.token, id)
        : await api.getMessages(user.token, id);
      if (response && response.success && response.messages) {
        const incoming = response.messages;
        if (silent) {
          setChatMessages((prev) => {
            const prevLast = prev[prev.length - 1]?.id;
            const nextLast = incoming[incoming.length - 1]?.id;
            const changed = prevLast !== nextLast || incoming.length !== prev.length;
            if (changed) {
              setTimeout(() => {
                chatScrollViewRef.current?.scrollToEnd({ animated: true });
              }, 60);
            }
            return incoming;
          });
        } else {
          setChatMessages(incoming);
          setTimeout(() => {
            if (chatScrollViewRef.current) {
              chatScrollViewRef.current.scrollToEnd({ animated: true });
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      if (!silent) {
        showError(
          language === 'fr' ? 'Impossible de charger les messages.' : 'Unable to load messages.'
        );
      }
    } finally {
      if (!silent) setLoadingChatMessages(false);
    }
  };

  const pollDjChatRef = useRef(() => {});
  pollDjChatRef.current = () => {
    if (!user?.token || !chatModalVisible) return;
    const id = isGroupChat ? selectedChatEventId : selectedChatEventDjId;
    if (!id) return;
    loadChatMessages(id, isGroupChat, { silent: true });
  };
  useChatPoll({
    active: chatModalVisible && !!user?.token,
    pollRef: pollDjChatRef,
  });

  const handleDeleteMessage = async (messageId) => {
    if (!user?.token || !messageId) return;
    try {
      await api.deleteMessage(user.token, messageId);
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, deleted: true, content: 'message supprimé' } : m
        )
      );
    } catch (error) {
      console.error('Erreur suppression message:', error);
      showError(language === 'fr'
        ? 'Impossible de supprimer le message.'
        : 'Unable to delete message.');
    }
  };

  const sendMessage = async () => {
    if (!user?.token || !newMessageText.trim() || sendingMessage) return;
    if (!isGroupChat && !selectedChatEventDjId) return;
    if (isGroupChat && !selectedChatEventId) return;
    
    const messageText = newMessageText.trim();
    setNewMessageText('');
    setSendingMessage(true);
    
    try {
      const response = isGroupChat
        ? await api.sendGroupMessage(user.token, selectedChatEventId, messageText)
        : await api.sendMessage(user.token, selectedChatEventDjId, messageText);
      if (response && response.success) {
        // Recharger les messages
        await loadChatMessages(isGroupChat ? selectedChatEventId : selectedChatEventDjId, isGroupChat);
      } else {
        showError(response?.message || (language === 'fr' ? 'Impossible d\'envoyer le message.' : 'Unable to send message.'));
        setNewMessageText(messageText); // Remettre le texte en cas d'erreur
      }
    } catch (error) {
      console.error('Erreur envoi message:', error);
      showError(language === 'fr' ? 'Impossible d\'envoyer le message.' : 'Unable to send message.');
      setNewMessageText(messageText); // Remettre le texte en cas d'erreur
    } finally {
      setSendingMessage(false);
    }
  };

  const fetchBookings = async () => {
    if (!user?.token || loadingBookings) return;
    
    setLoadingBookings(true);
    try {
      const response = await api.getDjBookings(user.token);
      if (response && response.success) {
        setBookings(response.bookings || []);
      }
    } catch (error) {
      console.error('Erreur récupération bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    if (!user?.token || processingInvitation) return;
    
    setProcessingInvitation(invitationId);
    try {
      const response = await api.acceptInvitation(user.token, invitationId);
      if (response && response.success) {
        // Recharger les bookings pour mettre à jour l'affichage
        await fetchBookings();
        showSuccess(language === 'fr' 
          ? 'Vous avez accepté l\'invitation à cet événement.'
          : 'You have accepted the invitation to this event.');
      } else {
        showError(response?.message || (language === 'fr' ? 'Impossible d\'accepter l\'invitation.' : 'Unable to accept invitation.'));
      }
    } catch (error) {
      console.error('Erreur acceptation invitation:', error);
      showError(language === 'fr' ? 'Impossible d\'accepter l\'invitation.' : 'Unable to accept invitation.');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleRejectInvitation = (invitationId) => {
    if (!user?.token || processingInvitation) return;
    setRejectModalAction('reject');
    setRejectModalInvitationId(invitationId);
    setRejectModalVisible(true);
  };

  const handleCancelBooking = (invitationId) => {
    if (!user?.token || processingInvitation) return;
    setRejectModalAction('cancel');
    setRejectModalInvitationId(invitationId);
    setRejectModalVisible(true);
  };

  const handleRejectConfirm = async (reason) => {
    if (!user?.token || !rejectModalInvitationId) return;
    setProcessingInvitation(rejectModalInvitationId);
    const isCancel = rejectModalAction === 'cancel';
    try {
      const response = isCancel
        ? await api.cancelDjBooking(user.token, rejectModalInvitationId, reason)
        : await api.rejectInvitation(user.token, rejectModalInvitationId, reason);
      setRejectModalVisible(false);
      setRejectModalInvitationId(null);
      if (response && response.success) {
        await fetchBookings();
        showSuccess(
          isCancel
            ? (language === 'fr' ? 'Booking annulé.' : 'Booking cancelled.')
            : (language === 'fr' ? 'Vous avez refusé l\'invitation à cet événement.' : 'You have rejected the invitation to this event.')
        );
      } else {
        showError(response?.message || (language === 'fr' ? (isCancel ? 'Impossible d\'annuler.' : 'Impossible de refuser l\'invitation.') : (isCancel ? 'Unable to cancel.' : 'Unable to reject invitation.')));
      }
    } catch (error) {
      setRejectModalVisible(false);
      setRejectModalInvitationId(null);
      console.error(isCancel ? 'Erreur annulation:' : 'Erreur refus invitation:', error);
      showError(language === 'fr' ? (isCancel ? 'Impossible d\'annuler.' : 'Impossible de refuser l\'invitation.') : (isCancel ? 'Unable to cancel.' : 'Unable to reject invitation.'));
    } finally {
      setProcessingInvitation(null);
    }
  };

  useEffect(() => {
    Animated.timing(sidebarAnimation, {
      toValue: sidebarVisible ? 0 : -SIDEBAR_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [sidebarVisible, sidebarAnimation]);

  const fetchDjProfile = async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.getDjProfile(user.token);
      
      if (response && response.success && response.dj) {
        setDjProfile(response.dj);
        setArtistName(response.dj.artistName || '');
        setCity(response.dj.city || '');
        setMainCity(response.dj.mainCity || response.dj.city || ''); // mainCity est éditable, city ne l'est pas
        setPhone(response.dj.phone || '');
        setBirthDate(response.dj.birthDate || '');
        // Champs éditables
        setBio(response.dj.bio || '');
        setGenre(response.dj.genre || '');
        setLanguages(response.dj.languages || '');
        // Réseaux sociaux
        setSoundcloudUrl(response.dj.soundcloudUrl || '');
        setSpotifyUrl(response.dj.spotifyUrl || '');
        setYoutubeUrl(response.dj.youtubeUrl || '');
        setInstagramUrl(response.dj.instagramUrl || '');
        setTiktokUrl(response.dj.tiktokUrl || '');
        // Matériel
        setEquipment(response.dj.equipment || '');
        // Infos légales
        setLegalName(response.dj.legalName || '');
        setAddress(response.dj.address || '');
        setPostalCode(response.dj.postalCode || '');
        setCountry(response.dj.country || '');
        setSiret(response.dj.siret || '');
        setVatNumber(response.dj.vatNumber || '');
        // Disponibilités
        if (response.dj.availableDays) {
          try {
            const days = typeof response.dj.availableDays === 'string' 
              ? JSON.parse(response.dj.availableDays) 
              : response.dj.availableDays;
            setAvailableDays(days);
          } catch (e) {
            console.error('Erreur parsing availableDays:', e);
          }
        }
        setAvailableStatus(response.dj.availableStatus !== undefined ? response.dj.availableStatus : true);
        
        // Charger les médias
        if (response.dj.id) {
          const mediaResponse = await api.getDjMedia(response.dj.id);
          if (mediaResponse && mediaResponse.success) {
            const media = mediaResponse.media || [];
            // Stocker avec ID et titre pour pouvoir supprimer et éditer
            setPhotos(media.filter(m => m.type === 'photo' && m.title !== 'profile' && m.title !== 'banner').map(m => ({ id: m.id, url: m.url })));
            setVideos(media.filter(m => m.type === 'video').map(m => ({ id: m.id, url: m.url, title: m.title })));
            const profileImg = media.find(m => m.type === 'photo' && m.title === 'profile');
            const bannerImg = media.find(m => m.type === 'photo' && m.title === 'banner');
            if (profileImg) setProfileImage(normalizeMediaUrl(profileImg.url));
            if (bannerImg) setBannerImage(normalizeMediaUrl(bannerImg.url));
          }
        }
      }
    } catch (error) {
      console.error('Erreur récupération profil DJ:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Les champs artistName, city, phone, birthDate ne sont plus modifiables
    // On ne vérifie que les champs éditables

    if (!user?.token) {
      showError(language === 'fr' ? 'Non authentifié' : 'Not authenticated');
      return;
    }

    setSaving(true);
    try {
      // Préparer les données éditables
      const additionalData = {
        // Champs éditables - toujours envoyer même si vides
        bio: bio && bio.trim() ? bio.trim() : null,
        genre: genre && genre.trim() ? genre.trim() : null,
        mainCity: mainCity && mainCity.trim() ? mainCity.trim() : null,
        languages: languages && languages.trim() ? languages.trim() : null,
        // Réseaux sociaux
        soundcloudUrl: soundcloudUrl && soundcloudUrl.trim() ? soundcloudUrl.trim() : null,
        spotifyUrl: spotifyUrl && spotifyUrl.trim() ? spotifyUrl.trim() : null,
        youtubeUrl: youtubeUrl && youtubeUrl.trim() ? youtubeUrl.trim() : null,
        instagramUrl: instagramUrl && instagramUrl.trim() ? instagramUrl.trim() : null,
        tiktokUrl: tiktokUrl && tiktokUrl.trim() ? tiktokUrl.trim() : null,
        // Matériel
        equipment: equipment && equipment.trim() ? equipment.trim() : null,
        // Disponibilités
        availableDays: JSON.stringify(availableDays),
        availableStatus: availableStatus,
      };
      const legalEditable = !(djProfile?.legalName || djProfile?.address || djProfile?.postalCode || djProfile?.country || djProfile?.siret || djProfile?.vatNumber);
      if (legalEditable) {
        additionalData.legalName = legalName?.trim() || null;
        additionalData.address = address?.trim() || null;
        additionalData.postalCode = postalCode?.trim() || null;
        additionalData.country = country?.trim() || null;
        additionalData.siret = siret?.trim() || null;
        additionalData.vatNumber = vatNumber?.trim() || null;
      }

      console.log('[handleSave] Données à envoyer:', {
        bio: additionalData.bio?.substring(0, 50),
        genre: additionalData.genre,
        mainCity: additionalData.mainCity,
        languages: additionalData.languages,
        allKeys: Object.keys(additionalData),
      });

      // On envoie les valeurs originales pour les champs non-éditables (requis pour validation)
      // et les valeurs modifiées pour les champs éditables
      const response = await api.updateDjProfile(
        user.token,
        artistName.trim(), // Non modifiable mais requis par l'API
        city.trim(), // Non modifiable mais requis par l'API
        phone.trim(), // Non modifiable mais requis par l'API
        birthDate.trim(), // Non modifiable mais requis par l'API
        additionalData
      );

      console.log('[handleSave] Réponse du serveur:', response);

      if (response && response.success) {
        // Ne pas mettre à jour les champs locaux - garder ce que l'utilisateur a tapé
        // Les données sont sauvegardées dans la DB, pas besoin de recharger depuis le serveur
        showSuccess(language === 'fr' 
          ? 'Profil DJ mis à jour avec succès' 
          : 'DJ profile updated successfully');
      } else {
        showError(language === 'fr' 
          ? 'Erreur lors de la mise à jour du profil' 
          : 'Error updating profile');
      }
    } catch (error) {
      console.error('Erreur mise à jour profil DJ:', error);
      showError(language === 'fr' 
        ? 'Erreur lors de la mise à jour du profil' 
        : 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const openDjStreamPreview = (rawUrl, provider) => {
    const trimmed = (rawUrl || '').trim();
    if (!trimmed) return;
    const resolved = resolveStreamingEmbed(trimmed, provider);
    if (!resolved) {
      Alert.alert(
        language === 'fr' ? 'Lecture intégrée impossible' : 'In-app playback unavailable',
        language === 'fr'
          ? 'Ce lien ne peut pas être chargé dans le lecteur intégré (lien court, page compte, etc.). Colle une URL complète du type open.spotify.com (piste, album, playlist, artiste, podcast) ou une URL SoundCloud https://soundcloud.com/…'
          : 'This link cannot load in the in-app player (short link, profile-only URL, etc.). Use a full open.spotify.com URL (track, album, playlist, artist, show) or an https://soundcloud.com/… URL.',
        [
          { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
          {
            text: language === 'fr' ? 'Ouvrir dans le navigateur / app' : 'Open in browser / app',
            onPress: () => Linking.openURL(trimmed).catch(() => {}),
          },
        ]
      );
      return;
    }
    setStreamPreviewPlayer({
      visible: true,
      uri: resolved.uri,
      title: resolved.title,
    });
  };

  // Sauvegarder un média
  const saveMedia = async (type, url, title = null) => {
    if (!user?.token) {
      console.error('[saveMedia] Pas de token utilisateur');
      return;
    }
    
    // Récupérer le djId si pas encore chargé
    let djId = djProfile?.id;
    if (!djId) {
      try {
        const response = await api.getDjProfile(user.token);
        if (response && response.success && response.dj && response.dj.id) {
          djId = response.dj.id;
          setDjProfile(response.dj);
        } else {
          console.error('[saveMedia] Impossible de récupérer le profil DJ');
          showError(language === 'fr' 
            ? 'Impossible de sauvegarder le média. Assurez-vous d\'avoir un profil DJ actif.' 
            : 'Unable to save media. Make sure you have an active DJ profile.');
          return;
        }
      } catch (error) {
        console.error('[saveMedia] Erreur récupération profil DJ:', error);
        showError(language === 'fr' 
          ? 'Erreur lors de la sauvegarde du média.' 
          : 'Error saving media.');
        return;
      }
    }
    
    try {
      console.log('[saveMedia] Upload média:', { djId, type, title, url: url.substring(0, 50) + '...' });
      
      // Vérifier si c'est une URL locale (file:// ou content://) ou une URL HTTP
      const isLocalFile = url.startsWith('file://') || url.startsWith('content://') || (!url.startsWith('http://') && !url.startsWith('https://'));
      
      let response;
      if (isLocalFile) {
        // Uploader le fichier sur le serveur
        console.log('[saveMedia] Upload fichier local vers serveur...');
        try {
          response = await api.uploadDjMediaFile(user.token, djId, url, type, title);
        } catch (uploadError) {
          console.error('[saveMedia] Erreur upload fichier:', uploadError);
          // Si l'upload échoue, afficher un message d'erreur détaillé
          const errorMessage = uploadError.message || 'Erreur inconnue lors de l\'upload';
          showError(
            language === 'fr' 
              ? `Impossible d'uploader le fichier: ${errorMessage}\n\nVérifiez:\n- Votre connexion internet\n- La taille du fichier (max 100MB)\n- Réessayez dans quelques instants` 
              : `Unable to upload file: ${errorMessage}\n\nCheck:\n- Your internet connection\n- File size (max 100MB)\n- Try again in a few moments`
          );
          throw uploadError;
        }
      } else {
        // C'est déjà une URL HTTP, utiliser l'ancienne méthode
        console.log('[saveMedia] Utilisation URL HTTP existante...');
        response = await api.uploadDjMedia(user.token, djId, type, url, title);
      }
      
      if (response && response.success) {
        console.log('[saveMedia] Média sauvegardé avec succès:', response.media?.url);
        // Recharger les médias après l'upload réussi
        if (djId) {
          try {
            const mediaResponse = await api.getDjMedia(djId);
            if (mediaResponse && mediaResponse.success) {
              const media = mediaResponse.media || [];
              // Mettre à jour les états avec les médias rechargés
              setPhotos(media.filter(m => m.type === 'photo' && m.title !== 'profile' && m.title !== 'banner').map(m => ({ id: m.id, url: m.url })));
              setVideos(media.filter(m => m.type === 'video').map(m => ({ id: m.id, url: m.url, title: m.title })));
              const profileImg = media.find(m => m.type === 'photo' && m.title === 'profile');
              const bannerImg = media.find(m => m.type === 'photo' && m.title === 'banner');
              if (profileImg) setProfileImage(normalizeMediaUrl(profileImg.url));
              if (bannerImg) setBannerImage(normalizeMediaUrl(bannerImg.url));
            }
          } catch (reloadError) {
            console.error('[saveMedia] Erreur rechargement médias:', reloadError);
            // Ne pas bloquer si le rechargement échoue
          }
        }
        return response; // Retourner la réponse pour récupérer l'ID et l'URL
      } else {
        console.error('[saveMedia] Réponse invalide:', response);
        return null;
      }
    } catch (error) {
      console.error('[saveMedia] Erreur sauvegarde média:', error);
      showError(language === 'fr' 
        ? `Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}` 
        : `Error saving: ${error.message || 'Unknown error'}`);
      throw error;
    }
  };

  // Mettre à jour le titre d'un média
  const updateMediaTitle = async (mediaId, type, newTitle) => {
    if (!user?.token || !mediaId) {
      showError(language === 'fr' ? 'Impossible de mettre à jour le titre' : 'Unable to update title');
      return;
    }

    try {
      const response = await api.updateDjMediaTitle(user.token, mediaId, newTitle);
      if (response && response.success) {
        // Mettre à jour l'état local
        if (type === 'video') {
          setVideos(videos.map(v => 
            v.id === mediaId ? { ...v, title: newTitle } : v
          ));
        }
        showSuccess(language === 'fr' ? 'Titre mis à jour avec succès' : 'Title updated successfully');
        setEditingTitle(null);
        setEditTitleValue('');
      } else {
        throw new Error(response?.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('[updateMediaTitle] Erreur mise à jour titre:', error);
      showError(language === 'fr' 
        ? `Erreur lors de la mise à jour: ${error.message || 'Erreur inconnue'}` 
        : `Error updating: ${error.message || 'Unknown error'}`);
    }
  };

  // Supprimer un média
  const deleteMedia = async (mediaId, type) => {
    if (!user?.token || !mediaId) {
      showError(language === 'fr' ? 'Impossible de supprimer le média' : 'Unable to delete media');
      return;
    }

    try {
      const response = await api.deleteDjMedia(user.token, mediaId);
      if (response && response.success) {
        // Mettre à jour l'état local
        if (type === 'photo') {
          setPhotos(photos.filter(p => p.id !== mediaId));
        } else if (type === 'video') {
          setVideos(videos.filter(v => v.id !== mediaId));
        }
        showSuccess(
          language === 'fr' ? 'Média supprimé avec succès' : 'Media deleted successfully'
        );
      } else {
        throw new Error(response?.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('[deleteMedia] Erreur suppression média:', error);
      showError(
        language === 'fr' 
          ? `Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}` 
          : `Error deleting: ${error.message || 'Unknown error'}`
      );
    }
  };

  // Upload de photos
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError(
          language === 'fr' ? 'Permission d\'accès à la galerie requise' : 'Gallery access permission required'
        );
        return;
      }

      // Utiliser MediaType (nouvelle API recommandée)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Sauvegarder chaque photo et récupérer l'ID
        for (const asset of result.assets) {
          try {
            const response = await saveMedia('photo', asset.uri);
            if (response && response.success && response.media) {
              // Utiliser l'URL retournée par le serveur (URL publique)
              setPhotos([...photos, { id: response.media.id, url: response.media.url }]);
            } else {
              // Si pas d'ID, ajouter temporairement sans ID
              setPhotos([...photos, { id: null, url: asset.uri }]);
            }
          } catch (error) {
            console.error('[pickImage] Erreur sauvegarde photo:', error);
          }
        }
      }
    } catch (error) {
      console.error('[pickImage] Erreur lors de la sélection de photos:', error);
      showError(
        language === 'fr' 
          ? `Erreur lors de la sélection des photos: ${error.message || 'Erreur inconnue'}` 
          : `Error selecting photos: ${error.message || 'Unknown error'}`
      );
    }
  };

  // Upload de vidéos
  const pickVideo = async () => {
    try {
      // Sur iOS, vérifier et demander les permissions spécifiquement pour les vidéos
      if (Platform.OS === 'ios') {
        // Vérifier d'abord l'état actuel
        const { status: existingStatus, canAskAgain, accessPrivileges } = await ImagePicker.getMediaLibraryPermissionsAsync();
        console.log('[pickVideo] État permissions iOS:', { existingStatus, canAskAgain, accessPrivileges });
        
        let finalStatus = existingStatus;
        let finalAccessPrivileges = accessPrivileges;

        // Si les permissions ne sont pas accordées et qu'on peut encore demander
        if (existingStatus !== 'granted' && canAskAgain) {
          const response = await ImagePicker.requestMediaLibraryPermissionsAsync();
          finalStatus = response.status;
          finalAccessPrivileges = response.accessPrivileges;
          console.log('[pickVideo] Nouveau statut après demande:', { status: finalStatus, accessPrivileges: finalAccessPrivileges });
        }

        // Vérifier si l'accès est limité (seulement photos sélectionnées)
        // Même si l'utilisateur pense avoir donné l'accès complet, iOS peut toujours retourner 'limited'
        if (finalStatus === 'granted' && finalAccessPrivileges === 'limited') {
          showConfirm(
            language === 'fr' ? 'Accès limité détecté' : 'Limited Access Detected',
            language === 'fr' 
              ? 'L\'accès à la galerie semble limité. Pour sélectionner des vidéos, vous devez autoriser l\'accès complet à toutes les photos dans les paramètres iOS de l\'app (Réglages > [Nom de l\'app] > Photos > Toutes les photos).' 
              : 'Gallery access appears limited. To select videos, you must grant full access to all photos in iOS app settings (Settings > [App Name] > Photos > All Photos).',
            [
              { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
              { text: language === 'fr' ? 'Paramètres' : 'Settings', onPress: () => Linking.openURL('app-settings:') },
            ]
          );
          return;
        }
        
        // Log pour déboguer
        console.log('[pickVideo] Permissions finales:', { 
          status: finalStatus, 
          accessPrivileges: finalAccessPrivileges,
          canAskAgain 
        });

        if (finalStatus !== 'granted') {
          showConfirm(
            language === 'fr' ? 'Permission requise' : 'Permission required',
            language === 'fr' 
              ? 'L\'accès à la galerie Photos est nécessaire pour sélectionner des vidéos. Veuillez l\'autoriser dans les paramètres de l\'app.' 
              : 'Photo library access is required to select videos. Please enable it in app settings.',
            [
              { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
              { text: language === 'fr' ? 'Paramètres' : 'Settings', onPress: () => Linking.openURL('app-settings:') },
            ]
          );
          return;
        }
      } else {
        // Sur Android, demander directement
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showError(language === 'fr' ? 'Permission d\'accès à la galerie requise' : 'Gallery access permission required');
          return;
        }
      }

      console.log('[pickVideo] Permissions OK, ouverture de la galerie Photos...');
      
      // Utiliser ImagePicker en priorité pour accéder à la galerie Photos (comportement natif iOS)
      let result;
      try {
        // Options minimales pour iOS - éviter l'erreur 3164
        // Utiliser MediaType (nouvelle API recommandée)
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsMultipleSelection: false,
          allowsEditing: false,
          // Ne pas spécifier videoMaxDuration ou quality sur iOS pour éviter les erreurs
        });
      } catch (pickerError) {
        console.error('[pickVideo] Erreur ImagePicker (galerie Photos):', pickerError);
        
        // Si erreur 3164, c'est un problème de permissions iOS
        const errorMessage = pickerError.message || pickerError.toString() || '';
        if (errorMessage.includes('3164')) {
          showConfirm(
            language === 'fr' ? 'Accès à la galerie requis' : 'Gallery Access Required',
            language === 'fr' 
              ? 'Pour sélectionner des vidéos depuis la galerie Photos, vous devez autoriser l\'accès complet à toutes les photos dans les paramètres de l\'app (pas seulement les photos sélectionnées).' 
              : 'To select videos from Photo Library, you must grant full access to all photos in app settings (not just selected photos).',
            [
              { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
              { text: language === 'fr' ? 'Paramètres' : 'Settings', onPress: () => Linking.openURL('app-settings:') },
              {
                text: language === 'fr' ? 'Utiliser Documents' : 'Use Documents',
                onPress: async () => {
                  try {
                    const docResult = await DocumentPicker.getDocumentAsync({
                      type: 'video/*',
                      copyToCacheDirectory: true,
                      multiple: false,
                    });
                    if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
                      const videoUri = docResult.assets[0].uri;
                      try {
                        const response = await saveMedia('video', videoUri);
                        if (response && response.success && response.media) {
                          setVideos([...videos, { id: response.media.id, url: response.media.url, title: response.media.title }]);
                          showSuccess(language === 'fr' ? 'Vidéo ajoutée avec succès' : 'Video added successfully');
                        } else {
                          setVideos([...videos, { id: null, url: videoUri }]);
                        }
                      } catch (error) {
                        console.error('[pickVideo] Erreur sauvegarde vidéo:', error);
                      }
                    }
                  } catch (docError) {
                    console.error('[pickVideo] Erreur DocumentPicker:', docError);
                    showError(language === 'fr' ? 'Impossible de sélectionner la vidéo' : 'Unable to select video');
                  }
                },
              },
            ]
          );
          return;
        }
        
        // Autre erreur iOS, essayer DocumentPicker comme fallback silencieux
        if (Platform.OS === 'ios') {
          console.warn('[pickVideo] Fallback vers DocumentPicker...');
          try {
            const docResult = await DocumentPicker.getDocumentAsync({
              type: 'video/*',
              copyToCacheDirectory: true,
              multiple: false,
            });

            if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
              const videoUri = docResult.assets[0].uri;
              console.log('[pickVideo] Vidéo sélectionnée via DocumentPicker:', videoUri.substring(0, 50) + '...');
              
              try {
                const response = await saveMedia('video', videoUri);
                if (response && response.success && response.media) {
                  // Utiliser l'URL retournée par le serveur (URL publique)
                  setVideos([...videos, { id: response.media.id, url: response.media.url, title: response.media.title }]);
                  showSuccess(language === 'fr' ? 'Vidéo ajoutée avec succès' : 'Video added successfully');
                } else {
                  setVideos([...videos, { id: null, url: videoUri }]);
      }
    } catch (error) {
                console.error('[pickVideo] Erreur sauvegarde vidéo:', error);
              }
            }
            return;
          } catch (docError) {
            console.error('[pickVideo] Erreur DocumentPicker aussi:', docError);
            throw pickerError; // Lancer l'erreur originale
          }
        } else {
          throw pickerError;
        }
      }
      
      // Traiter le résultat ImagePicker (galerie Photos)
      if (!result || result.canceled) {
        console.log('[pickVideo] Sélection annulée');
        return;
      }
      
      console.log('[pickVideo] Résultat galerie Photos:', result.canceled ? 'Annulé' : 'Sélectionné');

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('[pickVideo] Vidéos sélectionnées depuis la galerie:', result.assets.length);
        
        // Sauvegarder chaque vidéo et récupérer l'ID
        for (const asset of result.assets) {
          try {
            console.log('[pickVideo] Sauvegarde vidéo:', asset.uri.substring(0, 50) + '...');
            const response = await saveMedia('video', asset.uri);
            if (response && response.success && response.media) {
              // Utiliser l'URL retournée par le serveur (URL publique)
              setVideos([...videos, { id: response.media.id, url: response.media.url, title: response.media.title }]);
              console.log('[pickVideo] Vidéo sauvegardée avec succès');
            } else {
              setVideos([...videos, { id: null, url: asset.uri }]);
            }
          } catch (error) {
            console.error('[pickVideo] Erreur sauvegarde vidéo:', error);
            // L'erreur est déjà gérée dans saveMedia avec Alert
          }
        }
        
        if (result.assets.length > 0) {
          showSuccess(
            language === 'fr' 
              ? `${result.assets.length} vidéo(s) ajoutée(s)` 
              : `${result.assets.length} video(s) added`
          );
        }
      }
    } catch (error) {
      console.error('[pickVideo] Erreur lors de la sélection vidéo:', error);
      
      // Gérer spécifiquement l'erreur 3164 iOS
      const errorMessage = error.message || error.toString() || '';
      if (errorMessage.includes('3164') || errorMessage.includes('PHPhotosErrorDomain')) {
        showConfirm(
          language === 'fr' ? 'Accès à la galerie requis' : 'Gallery Access Required',
          language === 'fr' 
            ? 'Pour sélectionner des vidéos depuis la galerie Photos, vous devez autoriser l\'accès complet à toutes les photos dans les paramètres de l\'app (pas seulement les photos sélectionnées).' 
            : 'To select videos from Photo Library, you must grant full access to all photos in app settings (not just selected photos).',
          [
            { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
            { text: language === 'fr' ? 'Paramètres' : 'Settings', onPress: () => Linking.openURL('app-settings:') },
            {
              text: language === 'fr' ? 'Utiliser Documents' : 'Use Documents',
              onPress: async () => {
                try {
                  const docResult = await DocumentPicker.getDocumentAsync({
                    type: 'video/*',
                    copyToCacheDirectory: true,
                    multiple: false,
                  });
                  if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
                    const videoUri = docResult.assets[0].uri;
                    try {
                      const response = await saveMedia('video', videoUri);
                      if (response && response.success && response.media) {
                        setVideos([...videos, { id: response.media.id, url: response.media.url, title: response.media.title }]);
                        showSuccess(language === 'fr' ? 'Vidéo ajoutée avec succès' : 'Video added successfully');
                      } else {
                        setVideos([...videos, { id: null, url: videoUri }]);
                      }
                    } catch (saveError) {
                      console.error('[pickVideo] Erreur sauvegarde vidéo:', saveError);
                      showError(
                        language === 'fr' ? 'Impossible d\'ajouter la vidéo' : 'Unable to add video'
                      );
                    }
                  }
                } catch (docError) {
                  console.error('[pickVideo] Erreur DocumentPicker:', docError);
                  showError(
                    language === 'fr' ? 'Impossible de sélectionner la vidéo' : 'Unable to select video'
                  );
                }
              }
            }
          ]
        );
      } else {
        showError(
          language === 'fr' 
            ? `Erreur lors de la sélection de la vidéo: ${error.message || 'Erreur inconnue'}` 
            : `Error selecting video: ${error.message || 'Unknown error'}`
        );
      }
    }
  };

  /** Même flux que CommunityProfileEditPage / VenueProfileEditPage : galerie, recadrage 1:1 ou 3:1, qualité 0,8. */
  const pickDjProfileImage = async (type) => {
    if (!user?.token) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError(language === 'fr' ? 'Permission refusée' : 'Permission denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'banner' ? [3, 1] : [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;

    if (type === 'banner') {
      setUploadingBannerImage(true);
      try {
        const response = await saveMedia('photo', uri, 'banner');
        if (response?.success && response.media?.url) {
          setBannerImage(normalizeMediaUrl(response.media.url));
          showSuccess(language === 'fr' ? 'Bannière mise à jour' : 'Banner updated');
        } else {
          showError(language === 'fr' ? "Impossible d'enregistrer la bannière." : 'Could not save banner.');
        }
      } catch (e) {
        console.error('[pickDjProfileImage] bannière:', e);
      } finally {
        setUploadingBannerImage(false);
      }
    } else {
      setUploadingProfileImage(true);
      try {
        const response = await saveMedia('photo', uri, 'profile');
        if (response?.success && response.media?.url) {
          setProfileImage(normalizeMediaUrl(response.media.url));
          showSuccess(language === 'fr' ? 'Photo mise à jour' : 'Photo updated');
        } else {
          showError(
            language === 'fr' ? "Impossible d'enregistrer la photo de profil." : 'Could not save profile photo.'
          );
        }
      } catch (e) {
        console.error('[pickDjProfileImage] profil:', e);
      } finally {
        setUploadingProfileImage(false);
      }
    }
  };

  const toggleDay = (day) => {
    setAvailableDays({ ...availableDays, [day]: !availableDays[day] });
  };

  const menuItems = [
    { id: 'profil', label: language === 'fr' ? 'Profil artiste' : 'Artist Profile', icon: '👤' },
    { id: 'tarifs', label: language === 'fr' ? 'Tarifs & disponibilités' : 'Rates & Availabilities', icon: '💰' },
    { id: 'medias', label: language === 'fr' ? 'Médias' : 'Media', icon: '📸' },
    { id: 'materiel', label: language === 'fr' ? 'Matériel & rider' : 'Equipment & Rider', icon: '🎛️' },
    { id: 'bookings', label: 'Bookings', icon: '📅' },
    { id: 'paiements', label: language === 'fr' ? 'Paiements' : 'Payments', icon: '💳' },
    { id: 'avis', label: language === 'fr' ? 'Avis & notes' : 'Reviews & Notes', icon: '⭐' },
  ];

  const djVenueGateBlocks =
    venueContractGate?.hasVenueOnEvent === true &&
    venueContractGate?.canFinalizeDjContract === false;

  const contractEventEndOptions = useMemo(
    () => buildEventEndTimeOptions(contractBooking?.eventTime, contractBooking?.durationHours, 30),
    [contractBooking?.eventTime, contractBooking?.durationHours]
  );
  const contractEventWindowHint = useMemo(
    () => formatEventWindowHint(contractBooking?.eventTime, contractBooking?.durationHours, language),
    [contractBooking?.eventTime, contractBooking?.durationHours, language]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {language === 'fr' ? 'Chargement...' : 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  const dashboardProps = {
    language,
    styles,
    navigate,
    showConfirm,
    Colors,
    djProfile,
    bannerImage,
    profileImage,
    uploadingBannerImage,
    uploadingProfileImage,
    pickDjProfileImage,
    artistName,
    pseudo,
    setPseudo,
    realName,
    legalName,
    setLegalName,
    address,
    setAddress,
    postalCode,
    setPostalCode,
    country,
    setCountry,
    siret,
    setSiret,
    vatNumber,
    setVatNumber,
    bio,
    setBio,
    birthDate,
    genre,
    setGenre,
    city,
    mainCity,
    setMainCity,
    languages,
    setLanguages,
    soundcloudUrl,
    setSoundcloudUrl,
    spotifyUrl,
    setSpotifyUrl,
    youtubeUrl,
    setYoutubeUrl,
    instagramUrl,
    setInstagramUrl,
    tiktokUrl,
    setTiktokUrl,
    handleSave,
    saving,
    availableDays,
    toggleDay,
    availableStatus,
    setAvailableStatus,
    equipment,
    setEquipment,
    bookings,
    loadingBookings,
    processingInvitation,
    openChat,
    openGroupChat,
    handleAcceptInvitation,
    handleRejectInvitation,
    handleCancelBooking,
    ratingsData,
    loadingRatings,
    fetchRatings,
    photos,
    setPhotos,
    videos,
    setVideos,
    pickImage,
    pickVideo,
    deleteMedia,
    setSelectedVideo,
    setVideoPlayerVisible,
    setEditingTitle,
    setEditTitleValue,
    normalizeMediaUrl,
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'profil':
        return <DjProfilSection {...dashboardProps} />;
      case 'tarifs':
        return <DjTarifsSection {...dashboardProps} />;
      case 'materiel':
        return <DjMaterielSection {...dashboardProps} />;
      case 'bookings':
        return <DjBookingsSection {...dashboardProps} />;
      case 'avis':
        return <DjAvisSection {...dashboardProps} />;
      case 'paiements':
        return <DjPaiementsSection {...dashboardProps} />;
      case 'medias':
        return <DjMediasSection {...dashboardProps} />;
      default:
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.sectionTitle}>
              {menuItems.find((item) => item.id === activeSection)?.label || 'Section'}
            </Text>
            <Text style={styles.comingSoon}>
              {language === 'fr' ? 'Bientôt disponible...' : 'Coming soon...'}
            </Text>
          </View>
        );
    }
  };
                  
                  const statusLabels = {
                    UPCOMING: language === 'fr' ? 'À venir' : 'Upcoming',
                    ONGOING: language === 'fr' ? 'En cours' : 'Ongoing',
                    FINISHED: language === 'fr' ? 'Terminé' : 'Finished',
                  };
                  
                  return (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.bookingHeader}>
                        <Text style={styles.bookingTitle}>{booking.eventTitle}</Text>
                        <View style={[styles.bookingStatus, { backgroundColor: statusColors[booking.eventStatus] + '20' }]}>
                          <Text style={[styles.bookingStatusText, { color: statusColors[booking.eventStatus] }]}>
                            {statusLabels[booking.eventStatus]}
                          </Text>
                        </View>
                      </View>

                      {/* ✅ Paiement (Booker -> DJ) */}
                      <View style={styles.bookingInfo}>
                        <Text style={styles.bookingInfoLabel}>💳 {language === 'fr' ? 'Paiement' : 'Payment'}</Text>
                        {(() => {
                          const ps = booking.paymentStatus || 'UPCOMING';
                          const labels = {
                            UPCOMING: language === 'fr' ? 'À venir' : 'Upcoming',
                            PENDING: language === 'fr' ? 'En attente' : 'Pending',
                            PAID: language === 'fr' ? 'Payé' : 'Paid',
                          };
                          return (
                            <Text style={styles.bookingInfoValue}>
                              {labels[ps] || ps}
                              {booking.invoiceNumber ? ` • ${booking.invoiceNumber}` : ''}
                            </Text>
                          );
                        })()}
                      </View>
                      
                      <View style={styles.bookingInfo}>
                        <Text style={styles.bookingInfoLabel}>
                          📅 {language === 'fr' ? 'Date' : 'Date'}
                        </Text>
                        <Text style={styles.bookingInfoValue}>
                          {formattedDate} {booking.eventTime && `à ${booking.eventTime}`}
                        </Text>
                      </View>
                      
                      {booking.venue && (
                        <View style={styles.bookingInfo}>
                          <Text style={styles.bookingInfoLabel}>
                            📍 {language === 'fr' ? 'Lieu' : 'Venue'}
                          </Text>
                          <Text style={styles.bookingInfoValue}>
                            {booking.venue.name}
                            {booking.venue.address && ` - ${booking.venue.address}`}
                          </Text>
                        </View>
                      )}
                      
                      {booking.booker && (
                        <View style={styles.bookingInfo}>
                          <Text style={styles.bookingInfoLabel}>
                            👤 {language === 'fr' ? 'Organisateur' : 'Organizer'}
                          </Text>
                          <Text style={styles.bookingInfoValue}>
                            {booking.booker.name} ({booking.booker.type})
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.bookingInfo}>
                        <Text style={styles.bookingInfoLabel}>
                          📍 {language === 'fr' ? 'Adresse' : 'Address'}
                        </Text>
                        <Text style={styles.bookingInfoValue}>{booking.eventLocation}</Text>
                      </View>
                            
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                              <TouchableOpacity
                                style={[styles.invitationButton, styles.chatButton, { flex: 1, minWidth: 100 }]}
                                onPress={() => openChat(booking.id)}
                              >
                                <Text style={styles.invitationButtonText}>
                                  💬 {language === 'fr' ? 'Chat' : 'Chat'}
                                </Text>
                              </TouchableOpacity>
                              {booking.eventId && (
                                <TouchableOpacity
                                  style={[styles.invitationButton, styles.chatButton, { flex: 1, minWidth: 100, backgroundColor: '#2196F3' }]}
                                  onPress={() => openGroupChat(booking.eventId)}
                                >
                                  <Text style={styles.invitationButtonText}>
                                    👥 {language === 'fr' ? 'Groupe' : 'Group'}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                style={[styles.invitationButton, { flex: 1, minWidth: 100, backgroundColor: '#EF4444' }]}
                                onPress={() => handleCancelBooking(booking.id)}
                                disabled={processingInvitation === booking.id}
                              >
                                {processingInvitation === booking.id ? (
                                  <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                  <Text style={styles.invitationButtonText}>
                                    ✕ {language === 'fr' ? 'Annuler' : 'Cancel'}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            </View>
    </View>
  );
                })}
              </View>
                  </View>
                )}
                
                {/* État vide */}
                {pendingInvitations.length === 0 && acceptedBookings.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📅</Text>
                <Text style={styles.emptyStateText}>
                  {language === 'fr' 
                    ? 'Aucun booking pour le moment' 
                    : 'No bookings yet'}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {language === 'fr' 
                    ? 'Vos réservations et demandes de booking apparaîtront ici.' 
                    : 'Your bookings and booking requests will appear here.'}
                </Text>
              </View>
                )}
              </>
            )}
          </ScrollView>
        );

      case 'avis':
        return (
          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.sectionTitle}>
              {language === 'fr' ? 'AVIS & NOTES' : 'REVIEWS & RATINGS'}
            </Text>
            {loadingRatings ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>
                  {language === 'fr' ? 'Chargement des avis...' : 'Loading reviews...'}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.reviewSummaryCard}>
                  <View style={styles.reviewSummaryTop}>
                    <Text style={styles.reviewSummaryTitle}>
                      {language === 'fr' ? 'Note globale' : 'Overall rating'}
                    </Text>
                    <TouchableOpacity onPress={fetchRatings} activeOpacity={0.8}>
                      <Text style={styles.reviewRefresh}>
                        {language === 'fr' ? 'Rafraîchir' : 'Refresh'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.reviewSummaryRow}>
                    <Text style={styles.reviewSummaryScore}>
                      {ratingsData?.ratings?.averageRatingGlobal?.toFixed
                        ? ratingsData.ratings.averageRatingGlobal.toFixed(1)
                        : (ratingsData?.ratings?.averageRatingGlobal ?? '—')}
                      /5
                    </Text>
                    <StarRating
                      rating={Number(ratingsData?.ratings?.averageRatingGlobal || 0)}
                      size={18}
                      showStars={true}
                    />
                  </View>

                  <Text style={styles.reviewSummaryMeta}>
                    {language === 'fr' ? 'Communauté' : 'Community'}: {ratingsData?.ratings?.totalRatingsCommunity ?? 0} •{' '}
                    {language === 'fr' ? 'Organisateur' : 'Organizer'}: {ratingsData?.ratings?.totalRatingsBooker ?? 0} •{' '}
                    {language === 'fr' ? 'Lieu' : 'Venue'}: {ratingsData?.ratings?.totalRatingsVenue ?? 0}
                  </Text>
                </View>

                {Array.isArray(ratingsData?.ratings?.allRatings) && ratingsData.ratings.allRatings.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {ratingsData.ratings.allRatings.slice(0, 20).map((r) => (
                      <View key={r.id} style={styles.reviewCard}>
                        <View style={styles.reviewCardTop}>
                          <Text style={styles.reviewCardType}>
                            {r.raterType === 'COMMUNITY'
                              ? (language === 'fr' ? 'Communauté' : 'Community')
                              : r.raterType === 'BOOKER'
                                ? (language === 'fr' ? 'Organisateur' : 'Organizer')
                                : (language === 'fr' ? 'Lieu' : 'Venue')}
                          </Text>
                          <StarRating rating={Number(r.rating || 0)} size={16} showStars={true} />
                        </View>
                        <Text style={styles.reviewCardEvent} numberOfLines={2}>
                          {r.eventTitle || (language === 'fr' ? 'Événement' : 'Event')}
                        </Text>
                        {r.comment ? (
                          <Text style={styles.reviewCardComment}>{r.comment}</Text>
                        ) : (
                          <Text style={styles.reviewCardCommentEmpty}>
                            {language === 'fr' ? 'Aucun commentaire.' : 'No comment.'}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateIcon}>⭐</Text>
                    <Text style={styles.emptyStateText}>
                      {language === 'fr' ? 'Aucun avis pour le moment' : 'No reviews yet'}
                    </Text>
                    <Text style={styles.emptyStateSubtext}>
                      {language === 'fr'
                        ? 'Les avis apparaîtront ici après des événements notés.'
                        : 'Reviews will appear here after rated events.'}
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        );

      case 'paiements':
        return (
          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.sectionTitle}>
              {language === 'fr' ? 'PAIEMENTS' : 'PAYMENTS'}
            </Text>
            <Text style={styles.comingSoon}>
              {language === 'fr'
                ? 'Pour le moment, cette section affiche vos achats (tickets). Les paiements “DJ” (revenus) seront ajoutés plus tard.'
                : 'For now, this section shows your purchases (tickets). DJ payouts/earnings will be added later.'}
            </Text>
            <TouchableOpacity style={styles.saveButton} onPress={() => navigate('purchases')}>
              <Text style={styles.saveButtonText}>
                {language === 'fr' ? 'Voir mes achats' : 'View my purchases'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case 'medias':
        return (
          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
            <View style={styles.mediaHeader}>
              <Text style={styles.sectionTitle}>
                {language === 'fr' ? 'MÉDIAS' : 'MEDIA'}
              </Text>
              <TouchableOpacity style={styles.addFileButton} onPress={pickImage}>
                <Text style={styles.addFileButtonText}>
                  {language === 'fr' ? '+ Ajouter un fichier' : '+ Add a file'}
                </Text>
              </TouchableOpacity>
    </View>

            {/* Photos */}
            <Text style={styles.mediaSubtitle}>
              {language === 'fr' ? 'PHOTOS' : 'PHOTOS'}
            </Text>
            <Text style={styles.mediaHint}>
              {language === 'fr'
                ? 'Galerie de portfolio. Pour la photo de profil ou la bannière : onglet « Profil artiste », touchez l’image — la galerie s’ouvre directement.'
                : 'Portfolio gallery. For profile photo or banner: open « Artist Profile », tap the image — your gallery opens directly.'}
            </Text>
            <Text style={styles.mediaHint}>
              {language === 'fr' ? 'Taille max ~100 Mo par média' : 'Max size ~100 MB per media'}
            </Text>
            <View style={styles.mediaGrid}>
              {photos.map((photo, index) => (
                <View key={photo.id || index} style={styles.mediaItem}>
                  <Image source={{ uri: normalizeMediaUrl(photo.url) }} style={styles.mediaImage} />
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      if (photo.id) {
                        showConfirm(
                          language === 'fr' ? 'Supprimer' : 'Delete',
                          language === 'fr' ? 'Supprimer cette photo ?' : 'Delete this photo?',
                          [
                            { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
                            { text: language === 'fr' ? 'Supprimer' : 'Delete', style: 'destructive', onPress: () => deleteMedia(photo.id, 'photo') },
                          ]
                        );
                      } else {
                        // Si pas d'ID, supprimer seulement de l'état local
                        setPhotos(photos.filter((_, i) => i !== index));
                      }
                    }}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addMediaButton} onPress={pickImage}>
                <Text style={styles.addMediaButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Vidéos */}
            <Text style={styles.mediaSubtitle}>
              {language === 'fr' ? 'VIDÉOS' : 'VIDEOS'}
            </Text>
            <Text style={styles.mediaHint}>
              {language === 'fr' ? 'Taille max ~100 Mo par média' : 'Max size ~100 MB per media'}
            </Text>
            <View style={styles.mediaList}>
              {videos.map((video, index) => {
                const rawVideoUrl = video?.url || (typeof video === 'string' ? video : null);
                const videoUrl = normalizeMediaUrl(rawVideoUrl);
                const videoTitle = video?.title || `${language === 'fr' ? 'Vidéo' : 'Video'} ${index + 1}`;
                
                if (!videoUrl || typeof videoUrl !== 'string') {
                  return null;
                }
                
                const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
                const isLocalFile = videoUrl.startsWith('local:') ||
                  (videoTitle && typeof videoTitle === 'string' && (
                    videoTitle.toLowerCase().includes('tracer') || 
                    videoTitle.toLowerCase().includes('gogg')
                  )) ||
                  (!videoUrl.startsWith('http') && !videoUrl.startsWith('file://'));
                
                let finalVideoUrl = videoUrl;
                if (isLocalFile) {
                  try {
                    if (videoUrl.includes('gogg') || videoUrl.includes('tracer') || 
                        (videoTitle && typeof videoTitle === 'string' && videoTitle.toLowerCase().includes('tracer'))) {
                      finalVideoUrl = require('../../assets/videos/gogg-tracer.mp4');
                    }
                  } catch (e) {
                    console.error('Erreur chargement vidéo locale:', e);
                    finalVideoUrl = videoUrl;
                  }
                } else {
                  // Pour les URLs HTTP/HTTPS, s'assurer qu'elles sont complètes
                  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
                    // Vérifier si c'est une URL de l'ancien tunnel Cloudflare et la remplacer
                    const oldTunnelPattern = /https?:\/\/[^\/]+\.trycloudflare\.com/;
                    if (oldTunnelPattern.test(videoUrl)) {
                      // Remplacer l'ancienne URL du tunnel par la nouvelle
                      finalVideoUrl = normalizeMediaUrl(videoUrl);
                    } else {
                      finalVideoUrl = videoUrl;
                    }
                  } else {
                    finalVideoUrl = normalizeMediaUrl(videoUrl);
                  }
                }
                
                let youtubeId = null;
                if (isYouTube) {
                  const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                  if (match) youtubeId = match[1];
                }
                const thumbnailUrl = youtubeId 
                  ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
                  : null;
                
                return (
                  <TouchableOpacity
                    key={video.id || index}
                    style={styles.videoItem}
                    onPress={() => {
                      setSelectedVideo({
                        url: isYouTube ? videoUrl : finalVideoUrl,
                        title: videoTitle,
                        thumbnail: thumbnailUrl,
                        isYouTube: isYouTube,
                      });
                      setVideoPlayerVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.videoThumbnail}>
                      {thumbnailUrl ? (
                        <Image
                          source={{ uri: thumbnailUrl }}
                          style={styles.videoThumbnailImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.videoPlaceholder}>
                          <Text style={styles.videoPlaceholderIcon}>🎬</Text>
                          <Text style={styles.videoPlaceholderText} numberOfLines={2}>
                            {videoTitle}
                          </Text>
                        </View>
                      )}
                      <View style={styles.playButtonOverlay}>
                        <Text style={styles.playIconWhite}>▶</Text>
                      </View>
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle} numberOfLines={2}>
                        {videoTitle}
                      </Text>
                    </View>
                    <View style={styles.videoActions}>
                      {video.id && (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            setEditingTitle({ type: 'video', id: video.id, currentTitle: videoTitle });
                            setEditTitleValue(videoTitle);
                          }}
                        >
                          <Text style={styles.editButtonText}>✏️</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.deleteButtonVideo}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (video.id) {
                            showConfirm(
                              language === 'fr' ? 'Supprimer' : 'Delete',
                              language === 'fr' ? 'Supprimer cette vidéo ?' : 'Delete this video?',
                              [
                                { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
                                { text: language === 'fr' ? 'Supprimer' : 'Delete', style: 'destructive', onPress: () => deleteMedia(video.id, 'video') },
                              ]
                            );
                          } else {
                            setVideos(videos.filter((_, i) => i !== index));
                          }
                        }}
                      >
                        <Text style={styles.deleteButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity 
                style={styles.addVideoButton} 
                onPress={() => {
                  console.log('[Bouton] Add video pressé');
                  pickVideo();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.addVideoButtonText}>
                  {language === 'fr' ? '+ Ajouter une vidéo' : '+ Add video'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.mediaHint, styles.mediaHintLinks]}>
              {language === 'fr'
                ? 'Pas de fichiers audio hébergés ici (droits d’auteur). Pour la musique : liens Spotify / SoundCloud dans l’onglet Profil.'
                : 'No hosted audio here (copyright). For music: Spotify / SoundCloud links under Profile.'}
            </Text>
          </ScrollView>
        );

      default:
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.sectionTitle}>
              {menuItems.find(item => item.id === activeSection)?.label || 'Section'}
            </Text>
            <Text style={styles.comingSoon}>
              {language === 'fr' ? 'Bientôt disponible...' : 'Coming soon...'}
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* ✅ Menu latéral DJ désactivé: on garde uniquement le menu principal (drawer global) */}
      {false && (
        <>
          <Animated.View
            style={[
              styles.sidebar,
              {
                transform: [{ translateX: sidebarAnimation }],
              },
            ]}
          >
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>
                {language === 'fr' ? 'DASHBOARD DJ' : 'DASHBOARD DJ'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSidebarVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarContent}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    activeSection === item.id && styles.menuItemActive
                  ]}
                  onPress={() => {
                    setActiveSection(item.id);
                    setSidebarVisible(false);
                    if (item.id === 'bookings') {
                      markAllAsRead();
                    }
                  }}
                >
                  <View style={styles.menuItemIconContainer}>
                    <Text style={styles.menuItemIcon}>{item.icon}</Text>
                    {item.id === 'bookings' && (
                      <NotificationBadge count={unreadCount} />
                    )}
                  </View>
                  <Text style={[
                    styles.menuItemText,
                    activeSection === item.id && styles.menuItemTextActive
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.sidebarFooter}>
              <Text style={styles.sidebarFooterTitle}>
                {language === 'fr' ? 'Liens & réseaux' : 'Links & Networks'}
              </Text>
              <Text style={styles.sidebarFooterHint}>
                {language === 'fr'
                  ? 'Spotify / SoundCloud : onglet Profil.'
                  : 'Spotify / SoundCloud: Profile tab.'}
              </Text>
            </View>
          </Animated.View>

          {sidebarVisible && (
            <TouchableOpacity
              style={styles.overlay}
              activeOpacity={1}
              onPress={() => setSidebarVisible(false)}
            />
          )}
        </>
      )}

      {/* Contenu principal */}
      <View style={styles.mainContent}>
        <View style={styles.topBar}>
          {/* ✅ Ancien bouton sidebar DJ désactivé */}
          <View style={{ width: 40 }} />
          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.messagesButton}
              onPress={() => {
                setActiveSection('bookings');
                refreshUnreadCount();
              }}
            >
              <Ionicons name="chatbubbles" size={24} color="#fff" />
              <NotificationBadge count={unreadCount} onPress={markAllAsRead} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ✅ Sections DJ: onglets horizontaux (remplace le sidebar DJ) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sectionTabs}
          contentContainerStyle={styles.sectionTabsContent}
        >
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.sectionTab,
                activeSection === item.id && styles.sectionTabActive,
              ]}
              onPress={() => {
                setActiveSection(item.id);
                if (item.id === 'bookings') markAllAsRead();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.sectionTabIconWrap}>
                <Text style={styles.sectionTabIcon}>{item.icon}</Text>
                {item.id === 'bookings' && unreadCount > 0 && (
                  <NotificationBadge count={unreadCount} />
                )}
              </View>
              <Text
                style={[
                  styles.sectionTabText,
                  activeSection === item.id && styles.sectionTabTextActive,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {renderContent()}
      </View>

      {/* Lecteur vidéo modal */}
      {selectedVideo && (
        <VideoPlayer
          videoUrl={selectedVideo.url}
          thumbnailUrl={selectedVideo.thumbnail}
          title={selectedVideo.title}
          isYouTube={selectedVideo.isYouTube || false}
          visible={videoPlayerVisible}
          onClose={() => {
            setVideoPlayerVisible(false);
            setSelectedVideo(null);
          }}
        />
      )}

      <BuiltInStreamPlayerModal
        visible={streamPreviewPlayer.visible}
        embedUri={streamPreviewPlayer.uri}
        title={streamPreviewPlayer.title}
        language={language}
        onClose={() =>
          setStreamPreviewPlayer({ visible: false, uri: null, title: '' })
        }
      />

      {/* Modal d'édition de titre */}
      <Modal
        visible={editingTitle !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setEditingTitle(null);
          setEditTitleValue('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {language === 'fr' ? 'Modifier le titre' : 'Edit Title'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={editTitleValue}
              onChangeText={setEditTitleValue}
              placeholder={language === 'fr' ? 'Titre du média' : 'Media title'}
              placeholderTextColor="rgba(255,255,255,0.4)"
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setEditingTitle(null);
                  setEditTitleValue('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={() => {
                  if (editingTitle && editingTitle.id) {
                    updateMediaTitle(editingTitle.id, editingTitle.type, editTitleValue);
                  }
                }}
              >
                <Text style={styles.modalButtonSaveText}>
                  {language === 'fr' ? 'Enregistrer' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de chat */}
      <Modal
        visible={chatModalVisible}
        transparent={true}
        animationType="slide"
        presentationStyle="overFullScreen"
        onDismiss={() => {
          if (!pendingOpenContractEditorRef.current) return;
          pendingOpenContractEditorRef.current = false;
          if (openContractEditorFallbackTimerRef.current) {
            clearTimeout(openContractEditorFallbackTimerRef.current);
            openContractEditorFallbackTimerRef.current = null;
          }
          setContractEditorVisible(true);
        }}
        onRequestClose={() => {
          reopenChatAfterContractRef.current = false;
          flushPendingContractEditor();
          setChatModalVisible(false);
          setSelectedChatEventDjId(null);
          setSelectedChatEventId(null);
          setIsGroupChat(false);
          setChatMessages([]);
          setNewMessageText('');
          setContractEditorVisible(false);
          setShowPaymentTermsModal(false);
          setShowCancellationModal(false);
          setShowEventEndModal(false);
          // Rafraîchir le compteur après fermeture
          refreshUnreadCount();
        }}
      >
        <View style={styles.chatModalContainer}>
          <KeyboardAvoidingView
            style={styles.chatModalContent}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
          >
            <ScrollView
              ref={chatScrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={true}
              onContentSizeChange={() => {
                if (chatScrollViewRef.current) {
                  chatScrollViewRef.current.scrollToEnd({ animated: true });
                }
              }}
            >
            {/* Header du chat */}
            <View style={styles.chatHeaderContainer}>
            <View style={styles.chatHeader}>
              <TouchableOpacity
                onPress={() => {
                  reopenChatAfterContractRef.current = false;
                  flushPendingContractEditor();
                  setChatModalVisible(false);
                  setSelectedChatEventDjId(null);
                  setSelectedChatEventId(null);
                  setIsGroupChat(false);
                  setChatMessages([]);
                  setNewMessageText('');
                  setContractEditorVisible(false);
                  setShowPaymentTermsModal(false);
                  setShowCancellationModal(false);
                  setShowEventEndModal(false);
                  // Rafraîchir le compteur après fermeture
                  refreshUnreadCount();
                }}
                style={styles.chatCloseButton}
              >
                <Text style={styles.chatCloseButtonText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.chatHeaderTitle}>
                {isGroupChat 
                  ? (language === 'fr' ? 'Chat de groupe' : 'Group chat')
                  : (language === 'fr' ? 'Chat' : 'Chat')
                }
              </Text>
              <View style={{ width: 40 }} />
            </View>
            </View>

            {/* ✅ Contrat (uniquement chat privé) */}
            {!isGroupChat && selectedChatEventDjId ? (
              <View style={styles.contractCard}>
              <TouchableOpacity
                activeOpacity={0.92}
                disabled={contractLoading || !contractData}
                onPress={() => {
                  if (contractLoading || !contractData) return;
                  if (contractData.status === 'SENT' && contractData.sentBy === 'BOOKER') {
                    openContractEditorFromChat();
                  }
                }}
              >
                <View>
                <View style={styles.contractTopRow}>
                  <Text style={styles.contractTitle}>
                    🧾 {language === 'fr' ? 'Contrat de booking' : 'Booking contract'}
                  </Text>
                  {contractLoading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Text style={styles.contractStatus}>
                      {contractData?.status === 'SIGNED'
                        ? (language === 'fr' ? 'Accepté' : 'Accepted')
                        : contractData?.status === 'SENT'
                          ? (language === 'fr' ? 'Envoyé' : 'Sent')
                          : (language === 'fr' ? 'Brouillon' : 'Draft')}
                    </Text>
                  )}
                </View>

                {contractBooking?.eventTitle ? (
                  <Text style={styles.contractMeta} numberOfLines={2}>
                    🎵 {contractBooking.eventTitle}
                  </Text>
                ) : null}

                <Text style={styles.contractLine}>
                  💰 {language === 'fr' ? 'Prix' : 'Price'}:{' '}
                  <Text style={styles.contractLineStrong}>
                    {contractData?.payload?.priceEur != null ? `${contractData.payload.priceEur} €` : (language === 'fr' ? 'À définir' : 'To define')}
                  </Text>
                  {contractData?.payload?.depositPercent != null ? ` • ${language === 'fr' ? 'Acompte' : 'Deposit'}: ${contractData.payload.depositPercent} %` : ''}
                </Text>

                {contractData?.payload?.paymentTerms ? (
                  <Text style={styles.contractSmall} numberOfLines={2}>
                    💳 {PAYMENT_TERMS_OPTIONS.find(o => o.value === contractData.payload.paymentTerms)?.[language === 'fr' ? 'labelFr' : 'labelEn'] || cleanText(contractData.payload.paymentTerms)}
                  </Text>
                ) : null}
                {contractData?.payload?.eventEnd ? (
                  <Text style={styles.contractSmall} numberOfLines={1}>
                    🕐 {language === 'fr' ? 'Fin' : 'End'}: {cleanText(String(contractData.payload.eventEnd))}
                  </Text>
                ) : null}
                {contractData?.payload?.cancellation ? (
                  <Text style={styles.contractSmall} numberOfLines={4}>
                    🧯 {cleanText(cancellationPolicyLabel(contractData.payload.cancellation, language))}
                  </Text>
                ) : null}

                {djVenueGateBlocks ? (
                  <Text style={styles.contractHint}>
                    {language === 'fr'
                      ? 'Le contrat avec le lieu doit être accepté avant de finaliser ton contrat.'
                      : 'The venue contract must be accepted before you can finalize your contract.'}
                  </Text>
                ) : null}
                </View>
              </TouchableOpacity>

                {contractData?.status === 'SENT' && contractData?.sentBy === 'BOOKER' ? (
                  <TouchableOpacity
                    style={[styles.contractButton, styles.contractButtonSecondary, styles.contractPdfPreviewBtn]}
                    onPress={() =>
                      openContractPdfPreview({
                        previewPayload: buildDjContractPayload(contractDraft),
                        pendingAction: 'preview',
                      })
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.contractButtonText}>
                      {language === 'fr' ? 'Voir le contrat (PDF)' : 'View contract (PDF)'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {contractData?.status === 'SENT' && contractData?.sentBy === 'BOOKER' ? (
                  <View style={styles.contractAckRow}>
                    <TouchableOpacity
                      style={[
                        styles.contractAckCheckbox,
                        contractAcceptAck && styles.contractAckCheckboxChecked,
                      ]}
                      onPress={() => setContractAcceptAck(!contractAcceptAck)}
                      activeOpacity={0.7}
                    >
                      {contractAcceptAck ? (
                        <Text style={styles.contractAckCheckmark}>✓</Text>
                      ) : null}
                    </TouchableOpacity>
                    <Text style={styles.contractAckText}>{contractAcceptAckLabel(language)}</Text>
                  </View>
                ) : null}

                <View style={styles.contractActionsRow}>
                  {contractData?.status === 'SENT' ? (
                    contractData?.sentBy === 'BOOKER' ? (
                      <>
                        <TouchableOpacity
                          style={[styles.contractButton, styles.contractButtonSecondary]}
                          onPress={openContractEditorFromChat}
                        >
                          <Text style={styles.contractButtonText}>
                            {language === 'fr' ? 'Contre-proposer' : 'Counter'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.contractButton,
                            styles.contractButtonPrimary,
                            (djVenueGateBlocks || !contractAcceptAck) && { opacity: 0.45 },
                          ]}
                          onPress={() =>
                            openContractPdfPreview({
                              previewPayload: buildDjContractPayload(contractDraft),
                              pendingAction: 'accept',
                            })
                          }
                          disabled={djVenueGateBlocks || !contractAcceptAck}
                        >
                          <Text style={styles.contractButtonTextDark}>
                            {language === 'fr' ? 'Accepter' : 'Accept'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={styles.contractHint}>
                        {language === 'fr'
                          ? 'En attente de la réponse de l\'organisateur.'
                          : 'Waiting for organizer response.'}
                      </Text>
                    )
                  ) : contractData?.status === 'SIGNED' ? (
                    <Text style={styles.contractHint}>
                      {language === 'fr' ? '✅ Contrat accepté.' : '✅ Contract accepted.'}
                    </Text>
                  ) : (
                    <Text style={styles.contractHint}>
                      {language === 'fr'
                        ? 'En attente de l\'organisateur.'
                        : 'Waiting for organizer.'}
                    </Text>
                  )}
                </View>
              </View>
            ) : null}

            {/* Messages */}
            {loadingChatMessages ? (
              <View style={styles.chatLoadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <View style={styles.chatMessagesContainer}>
                {chatMessages.length === 0 ? (
                  <View style={styles.chatEmptyState}>
                    <Text style={styles.chatEmptyStateText}>
                      {language === 'fr' 
                        ? 'Aucun message pour le moment. Commencez la conversation !' 
                        : 'No messages yet. Start the conversation!'}
                    </Text>
                  </View>
                ) : (
                  chatMessages.map((msg) => (
                    <View
                      key={msg.id}
                      style={[
                        styles.chatMessage,
                        msg.isOwn ? styles.chatMessageOwn : styles.chatMessageOther,
                      ]}
                    >
                      {!msg.isOwn && msg.senderInfo && (
                        <TouchableOpacity
                          style={styles.chatMessageSender}
                          activeOpacity={0.8}
                          onPress={() => {
                            if (msg.senderInfo.type === 'DJ') {
                              navigate('djProfile', { djId: msg.senderId });
                            }
                          }}
                        >
                          {msg.senderInfo.image ? (
                            <Image
                              source={{ uri: normalizeMediaUrl(msg.senderInfo.image) }}
                              style={styles.chatMessageAvatar}
                            />
                          ) : (
                            <View style={[styles.chatMessageAvatar, styles.chatMessageAvatarPlaceholder]}>
                              <Text style={styles.chatMessageAvatarText}>
                                {msg.senderInfo.name ? msg.senderInfo.name.charAt(0).toUpperCase() : '?'}
                              </Text>
                            </View>
                          )}
                          <Text style={styles.chatMessageSenderName}>
                            {msg.senderInfo.name || (msg.senderInfo.type === 'BOOKER' ? 'Organisateur' : 'DJ')}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onLongPress={() => {
                          if (!msg.isOwn || msg.deleted) return;
                          showConfirm(
                            language === 'fr' ? 'Supprimer le message' : 'Delete message',
                            language === 'fr'
                              ? 'Voulez-vous supprimer ce message ? Il sera remplacé par "message supprimé".'
                              : 'Do you want to delete this message? It will be replaced by "message deleted".',
                            [
                              { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
                              { text: language === 'fr' ? 'Supprimer' : 'Delete', style: 'destructive', onPress: () => handleDeleteMessage(msg.id) },
                            ]
                          );
                        }}
                      >
                        <View
                          style={[
                            styles.chatMessageBubble,
                            msg.isOwn ? styles.chatMessageBubbleOwn : styles.chatMessageBubbleOther,
                            msg.deleted && styles.chatMessageBubbleDeleted,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chatMessageText,
                              msg.isOwn ? styles.chatMessageTextOwn : styles.chatMessageTextOther,
                              msg.deleted && styles.chatMessageTextDeleted,
                            ]}
                          >
                            {msg.deleted
                              ? language === 'fr'
                                ? 'message supprimé'
                                : 'message deleted'
                              : msg.content}
                          </Text>
                          <Text
                            style={[
                              styles.chatMessageTime,
                              msg.isOwn ? styles.chatMessageTimeOwn : styles.chatMessageTimeOther,
                            ]}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            </ScrollView>

            {/* Input pour envoyer un message */}
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                value={newMessageText}
                onChangeText={setNewMessageText}
                placeholder={language === 'fr' ? 'Tapez votre message...' : 'Type your message...'}
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                maxLength={500}
                onFocus={() => {
                  // Scroll vers le bas quand on focus l'input
                  setTimeout(() => {
                    if (chatScrollViewRef.current) {
                      chatScrollViewRef.current.scrollToEnd({ animated: true });
                    }
                  }, 100);
                }}
              />
              <TouchableOpacity
                style={[styles.chatSendButton, sendingMessage && styles.chatSendButtonDisabled]}
                onPress={sendMessage}
                disabled={!newMessageText.trim() || sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.chatSendButtonText}>➤</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modals contrat — hors du modal chat (évite modaux imbriqués sur iOS) */}
      <Modal
        visible={contractEditorVisible}
        transparent={true}
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={closeContractEditorSession}
      >
        {Platform.OS === 'ios' ? (
          <View style={styles.contractModalOverlay}>
            <View
              style={[
                styles.contractModalCard,
                { height: contractEditorModalCardHeight, maxWidth: 520, alignSelf: 'center' },
              ]}
              collapsable={false}
            >
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 24 }}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator
                nestedScrollEnabled
                removeClippedSubviews={false}
              >
                <Text style={styles.contractModalTitle}>
                  {language === 'fr' ? 'Contre-proposition' : 'Counter-proposal'}
                </Text>

                <ContractDraftEditorFields
                  mode="dj"
                  draft={contractDraft}
                  setDraft={setContractDraft}
                  language={language}
                  styles={styles}
                  PAYMENT_TERMS_OPTIONS={PAYMENT_TERMS_OPTIONS}
                setShowPaymentTermsModal={setShowPaymentTermsModalForContract}
                setShowDealTypeModal={() => {}}
                setShowCancellationModal={setShowCancellationModalForContract}
                eventEndOptions={contractEventEndOptions}
                eventWindowHint={contractEventWindowHint}
                setShowEventEndModal={setShowEventEndModalForContract}
              />

                <View style={styles.contractModalActions}>
                  <TouchableOpacity
                    style={[styles.contractButton, styles.contractButtonSecondary]}
                    onPress={closeContractEditorSession}
                  >
                    <Text style={styles.contractButtonText}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contractButton, styles.contractButtonPrimary]}
                    onPress={() =>
                      openContractPdfPreview({
                        previewPayload: buildDjContractPayload(contractDraft),
                        pendingAction: 'counter',
                      })
                    }
                  >
                    <Text style={styles.contractButtonTextDark}>{language === 'fr' ? 'Envoyer' : 'Send'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView enabled style={styles.contractModalOverlay} behavior="height">
            <View
              style={[
                styles.contractModalCard,
                { height: contractEditorModalCardHeight, maxWidth: 520, alignSelf: 'center' },
              ]}
            >
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 24 }}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.contractModalTitle}>
                  {language === 'fr' ? 'Contre-proposition' : 'Counter-proposal'}
                </Text>

                <ContractDraftEditorFields
                  mode="dj"
                  draft={contractDraft}
                  setDraft={setContractDraft}
                  language={language}
                  styles={styles}
                  PAYMENT_TERMS_OPTIONS={PAYMENT_TERMS_OPTIONS}
                setShowPaymentTermsModal={setShowPaymentTermsModalForContract}
                setShowDealTypeModal={() => {}}
                setShowCancellationModal={setShowCancellationModalForContract}
                eventEndOptions={contractEventEndOptions}
                eventWindowHint={contractEventWindowHint}
                setShowEventEndModal={setShowEventEndModalForContract}
              />

                <View style={styles.contractModalActions}>
                  <TouchableOpacity
                    style={[styles.contractButton, styles.contractButtonSecondary]}
                    onPress={closeContractEditorSession}
                  >
                    <Text style={styles.contractButtonText}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contractButton, styles.contractButtonPrimary]}
                    onPress={() =>
                      openContractPdfPreview({
                        previewPayload: buildDjContractPayload(contractDraft),
                        pendingAction: 'counter',
                      })
                    }
                  >
                    <Text style={styles.contractButtonTextDark}>{language === 'fr' ? 'Envoyer' : 'Send'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        )}
      </Modal>

      <Modal
        visible={showPaymentTermsModal}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowPaymentTermsModal(false)}
      >
        <View style={styles.paymentTermsOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowPaymentTermsModal(false)} />
          <View style={styles.paymentTermsModalContent}>
            <Text style={styles.contractModalTitle}>
              {language === 'fr' ? 'Modalités de paiement' : 'Payment terms'}
            </Text>
            {PAYMENT_TERMS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.paymentTermsOption, contractDraft.paymentTerms === opt.value && styles.paymentTermsOptionSelected]}
                onPress={() => {
                  setContractDraft((p) => ({ ...p, paymentTerms: opt.value }));
                  setShowPaymentTermsModal(false);
                }}
              >
                <Text style={[styles.paymentTermsOptionText, contractDraft.paymentTerms === opt.value && styles.paymentTermsOptionTextSelected]}>
                  {language === 'fr' ? opt.labelFr : opt.labelEn}
                </Text>
                {contractDraft.paymentTerms === opt.value ? <Text style={styles.paymentTermsCheck}>✓</Text> : null}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.paymentTermsClose} onPress={() => setShowPaymentTermsModal(false)}>
              <Text style={styles.contractButtonText}>{language === 'fr' ? 'Fermer' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CancellationPolicyPickerModal
        visible={showCancellationModal}
        onClose={() => setShowCancellationModal(false)}
        value={contractDraft.cancellation}
        onSelect={(v) => setContractDraft((p) => ({ ...p, cancellation: v }))}
        language={language}
        styles={styles}
      />

      <EventEndTimePickerModal
        visible={showEventEndModal}
        onClose={() => setShowEventEndModal(false)}
        value={contractDraft.eventEnd}
        onSelect={(v) => setContractDraft((p) => ({ ...p, eventEnd: v }))}
        language={language}
        styles={styles}
        options={contractEventEndOptions}
      />

      <ContractPdfPreviewModal
        visible={contractPdfPreview.visible}
        onClose={closeContractPdfPreview}
        onConfirm={confirmContractPdfPreview}
        previewOnly={contractPdfPreview.pendingAction === 'preview'}
        doneReadingLabel={
          language === 'fr' ? 'Fermer après lecture' : 'Close after reading'
        }
        title={language === 'fr' ? 'Aperçu du contrat (PDF)' : 'Contract preview (PDF)'}
        cancelLabel={language === 'fr' ? 'Annuler' : 'Cancel'}
        confirmLabel={
          contractPdfPreview.pendingAction === 'accept'
            ? language === 'fr'
              ? "J'ai lu et j'accepte"
              : 'I have read and accept'
            : language === 'fr'
              ? 'Confirmer la contre-proposition'
              : 'Confirm counter-proposal'
        }
        pdfBase64={contractPdfPreview.pdfBase64}
        loading={contractPdfPreview.loading}
        errorText={contractPdfPreview.error}
        language={language}
      />

      <RejectReasonModal
        visible={rejectModalVisible}
        onClose={() => {
          setRejectModalVisible(false);
          setRejectModalInvitationId(null);
        }}
        onConfirm={handleRejectConfirm}
        title={rejectModalAction === 'cancel' ? (language === 'fr' ? 'Annuler le booking' : 'Cancel booking') : (language === 'fr' ? 'Refuser l\'invitation' : 'Reject invitation')}
        confirmLabel={rejectModalAction === 'cancel' ? (language === 'fr' ? 'Annuler' : 'Cancel') : (language === 'fr' ? 'Refuser' : 'Reject')}
        language={language}
        loading={processingInvitation === rejectModalInvitationId}
      />

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
