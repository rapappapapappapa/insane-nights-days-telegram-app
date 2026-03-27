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
  Dimensions,
  Platform,
  Linking,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
// Audio migration: expo-av -> expo-audio (no direct replacement for setIsEnabledAsync)
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, API_CONFIG, normalizeMediaUrl } from '../../api/config';
import Colors from '../../constants/colors';
import StarRating from '../../components/StarRating';
import VideoPlayer from '../../components/VideoPlayer';
import AudioPlayer from '../../components/AudioPlayer';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../contexts/ConfirmContext';
import NotificationBadge from '../../components/NotificationBadge';
import { useNotifications } from '../../hooks/useNotifications';
import RejectReasonModal from '../../components/RejectReasonModal';
import ContractDraftEditorFields from '../../components/ContractDraftEditorFields';
import CancellationPolicyPickerModal from '../../components/CancellationPolicyPickerModal';
import EventEndTimePickerModal from '../../components/EventEndTimePickerModal';
import {
  draftFromPayload,
  buildDjContractPayload,
  contractAcceptAckLabel,
  cancellationPolicyLabel,
  buildEventEndTimeOptions,
  formatEventWindowHint,
} from '../../constants/contractPayload';
import { Ionicons } from '@expo/vector-icons';

function cleanText(s) {
  if (!s) return '';
  return String(s).replace(/\s+/g, ' ').trim();
}

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 280;

export default function DjDashboardPage() {
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
  const [audioFiles, setAudioFiles] = useState([]); // Array of { id, url }
  const [bannerImage, setBannerImage] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  
  // Édition de titre
  const [editingTitle, setEditingTitle] = useState(null); // { type: 'video'|'audio', id, currentTitle }
  const [editTitleValue, setEditTitleValue] = useState('');
  
  // Sélection de photo pour profil/bannière
  const [selectingPhotoFor, setSelectingPhotoFor] = useState(null); // 'profile' | 'banner' | null
  
  // Bookings
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

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

  const PAYMENT_TERMS_OPTIONS = [
    { value: 'jour_booking', labelFr: 'Jour booking', labelEn: 'Booking day' },
    { value: 'j-1_prestation', labelFr: 'J-1 prestation', labelEn: 'D-1 performance' },
    { value: 'j+1_prestation', labelFr: 'J+1 prestation', labelEn: 'D+1 performance' },
    { value: 'j+15', labelFr: 'J+15', labelEn: 'D+15' },
    { value: 'j+30', labelFr: 'J+30', labelEn: 'D+30' },
  ];

  const handleBack = async () => {
    try {
      // Note: expo-audio ne nécessite plus setIsEnabledAsync
      // Les players audio se gèrent individuellement
    } catch (e) {
      console.error("Erreur lors de l'arrêt de l'audio au retour dashboard:", e);
    }
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

  const [processingInvitation, setProcessingInvitation] = useState(null);

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
        setContractEditorVisible(false);
        setShowPaymentTermsModal(false);
        setShowCancellationModal(false);
        setShowEventEndModal(false);
        await loadContract(selectedChatEventDjId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d’envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('[DjDashboard] counterContract error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
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

  const loadChatMessages = async (id, isGroup = false) => {
    if (!user?.token || !id) return;
    
    setLoadingChatMessages(true);
    try {
      const response = isGroup 
        ? await api.getGroupMessages(user.token, id)
        : await api.getMessages(user.token, id);
      if (response && response.success && response.messages) {
        setChatMessages(response.messages);
        // Scroll vers le bas après un court délai
        setTimeout(() => {
          if (chatScrollViewRef.current) {
            chatScrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      showError(
        language === 'fr' ? 'Impossible de charger les messages.' : 'Unable to load messages.'
      );
    } finally {
      setLoadingChatMessages(false);
    }
  };

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

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectModalInvitationId, setRejectModalInvitationId] = useState(null);
  const [rejectModalAction, setRejectModalAction] = useState('reject'); // 'reject' | 'cancel'

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
            setAudioFiles(media.filter(m => m.type === 'audio').map(m => ({ id: m.id, url: m.url, title: m.title })));
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
              setAudioFiles(media.filter(m => m.type === 'audio').map(m => ({ id: m.id, url: m.url, title: m.title })));
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
        } else if (type === 'audio') {
          setAudioFiles(audioFiles.map(a => 
            a.id === mediaId ? { ...a, title: newTitle } : a
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
        } else if (type === 'audio') {
          setAudioFiles(audioFiles.filter(a => a.id !== mediaId));
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

  // Upload de fichiers audio MP3
  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const audioAssets = result.assets.filter(
          asset => asset.mimeType?.includes('audio') || asset.name?.endsWith('.mp3')
        );
        
        // Sauvegarder chaque fichier audio et récupérer l'ID
        for (const asset of audioAssets) {
          try {
            const response = await saveMedia('audio', asset.uri);
            if (response && response.success && response.media) {
              // Utiliser l'URL retournée par le serveur (URL publique)
              setAudioFiles([...audioFiles, { id: response.media.id, url: response.media.url, title: response.media.title }]);
            } else {
              setAudioFiles([...audioFiles, { id: null, url: asset.uri }]);
            }
          } catch (error) {
            console.error('[pickAudio] Erreur sauvegarde audio:', error);
          }
        }
        
        if (audioAssets.length > 0) {
          showSuccess(
            language === 'fr' 
              ? `${audioAssets.length} fichier(s) audio ajouté(s)` 
              : `${audioAssets.length} audio file(s) added`
          );
        }
      }
    } catch (error) {
      console.error('Erreur sélection audio:', error);
      showError(
        language === 'fr' ? 'Erreur lors de la sélection du fichier audio' : 'Error selecting audio file'
      );
    }
  };

  // Upload photo de profil
  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError(language === 'fr' ? "Permission d'accès à la galerie requise" : 'Gallery access permission required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      
      // Sauvegarder avec feedback
      try {
        const response = await saveMedia('photo', uri, 'profile');
        if (response && response.success && response.media) {
          // Utiliser l'URL retournée par le serveur (URL publique)
          setProfileImage(normalizeMediaUrl(response.media.url));
          showSuccess(
            language === 'fr' ? 'Photo de profil mise à jour' : 'Profile picture updated'
          );
        }
      } catch (error) {
        console.error('Erreur sauvegarde photo de profil:', error);
        // L'erreur est déjà gérée dans saveMedia
      }
    }
  };

  // Upload bannière
  const pickBannerImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError(language === 'fr' ? "Permission d'accès à la galerie requise" : 'Gallery access permission required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaTypeOptions.Images],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      
      // Sauvegarder avec feedback
      try {
        const response = await saveMedia('photo', uri, 'banner');
        if (response && response.success && response.media) {
          // Utiliser l'URL retournée par le serveur (URL publique)
          setBannerImage(normalizeMediaUrl(response.media.url));
          
          showSuccess(
            language === 'fr' ? 'Bannière mise à jour' : 'Banner updated'
          );
        }
      } catch (error) {
        console.error('Erreur sauvegarde bannière:', error);
        // L'erreur est déjà gérée dans saveMedia
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

  const renderContent = () => {
    switch (activeSection) {
      case 'profil':
  return (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
          >
            <ScrollView 
              style={styles.contentScroll} 
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
            <Text style={styles.sectionTitle}>
              {language === 'fr' ? 'INFORMATIONS D\'ARTISTE' : 'ARTIST INFORMATION'}
        </Text>

            {!(djProfile?.legalName || djProfile?.address || djProfile?.postalCode || djProfile?.country || djProfile?.siret || djProfile?.vatNumber) && (
              <View style={styles.legalBanner}>
                <Text style={styles.legalBannerText}>
                  📋 {language === 'fr' ? 'Complétez vos infos légales (nom civil, SIRET, adresse) pour les contrats. Faites défiler vers le bas.' : 'Complete your legal info (legal name, SIRET, address) for contracts. Scroll down.'}
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Nom d\'artiste' : 'Artist Name'}</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{artistName || '-'}</Text>
              </View>
              <Text style={styles.readOnlyHint}>{language === 'fr' ? 'Ce champ ne peut pas être modifié' : 'This field cannot be modified'}</Text>
      </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Pseudo' : 'Alias'}</Text>
              <TextInput
                style={styles.input}
                value={pseudo}
                onChangeText={setPseudo}
                placeholder="Kayzen"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
                </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Nom réel' : 'Real Name'}</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{realName || '-'}</Text>
                </View>
              <Text style={styles.readOnlyHint}>{language === 'fr' ? 'Ce champ ne peut pas être modifié' : 'This field cannot be modified'}</Text>
                </View>

            {/* Photos de profil et bannière */}
            <View style={styles.imageUploadSection}>
              <View style={styles.profileImageContainer}>
                <TouchableOpacity 
                  style={profileImage ? styles.profileImageWrapper : styles.profileImagePlaceholder} 
                  onPress={() => setSelectingPhotoFor('profile')}
                  activeOpacity={0.8}
                >
                  {profileImage ? (
                    <>
                      <Image source={{ uri: profileImage }} style={styles.profileImage} />
                      <View style={[styles.imageEditOverlay, { borderRadius: 40 }]} pointerEvents="none">
                        <Text style={styles.imageEditIcon}>✏️</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.uploadIcon}>👤</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={bannerImage ? styles.bannerImageWrapper : styles.bannerPlaceholder} 
                  onPress={() => setSelectingPhotoFor('banner')}
                  activeOpacity={0.8}
                >
                  {bannerImage ? (
                    <>
                      <Image source={{ uri: bannerImage }} style={styles.bannerImage} />
                      <View style={[styles.imageEditOverlay, { borderRadius: 8 }]} pointerEvents="none">
                        <Text style={styles.imageEditIcon}>✏️</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.uploadIcon}>+</Text>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.imageHint}>
                {language === 'fr' ? 'Appuyez sur une image pour choisir parmi vos photos' : 'Tap an image to choose from your photos'}
                  </Text>
                </View>

            {(() => {
              const legalEditable = !(djProfile?.legalName || djProfile?.address || djProfile?.postalCode || djProfile?.country || djProfile?.siret || djProfile?.vatNumber);
              return (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, styles.legalSectionTitle]}>{language === 'fr' ? 'Infos légales (pour les contrats)' : 'Legal info (for contracts)'}</Text>
                  {legalEditable ? (
                    <>
                      <Text style={styles.legalHint}>{language === 'fr' ? 'Complétez une seule fois. Ces champs ne pourront plus être modifiés après enregistrement.' : 'Fill once. These fields cannot be edited after saving.'}</Text>
                      <Text style={styles.label}>{language === 'fr' ? 'Nom légal' : 'Legal name'}</Text>
                      <TextInput style={styles.input} value={legalName} onChangeText={setLegalName} placeholder={language === 'fr' ? 'Nom civil complet' : 'Full legal name'} placeholderTextColor="rgba(255,255,255,0.4)" />
                      <Text style={styles.label}>{language === 'fr' ? 'Adresse' : 'Address'}</Text>
                      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder={language === 'fr' ? 'Adresse complète' : 'Full address'} placeholderTextColor="rgba(255,255,255,0.4)" />
                      <Text style={styles.label}>{language === 'fr' ? 'Code postal' : 'Postal code'}</Text>
                      <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} placeholder="75001" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" />
                      <Text style={styles.label}>{language === 'fr' ? 'Pays' : 'Country'}</Text>
                      <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="France" placeholderTextColor="rgba(255,255,255,0.4)" />
                      <Text style={styles.label}>SIRET</Text>
                      <TextInput style={styles.input} value={siret} onChangeText={setSiret} placeholder="123 456 789 00012" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" />
                      <Text style={styles.label}>{language === 'fr' ? 'N° TVA' : 'VAT number'}</Text>
                      <TextInput style={styles.input} value={vatNumber} onChangeText={setVatNumber} placeholder="FR12345678901" placeholderTextColor="rgba(255,255,255,0.4)" />
                    </>
                  ) : (
                    <View style={styles.readOnlyLegalWrap}>
                      {legalName ? <Text style={styles.readOnlyLegalText}>{language === 'fr' ? 'Nom légal' : 'Legal name'}: {legalName}</Text> : null}
                      {address ? <Text style={styles.readOnlyLegalText}>{language === 'fr' ? 'Adresse' : 'Address'}: {address}</Text> : null}
                      {(postalCode || country) ? <Text style={styles.readOnlyLegalText}>{postalCode} {country}</Text> : null}
                      {siret ? <Text style={styles.readOnlyLegalText}>SIRET: {siret}</Text> : null}
                      {vatNumber ? <Text style={styles.readOnlyLegalText}>{language === 'fr' ? 'N° TVA' : 'VAT'}: {vatNumber}</Text> : null}
                      <Text style={styles.readOnlyLegalHint}>{language === 'fr' ? 'Ces informations ne peuvent plus être modifiées.' : 'These details cannot be modified.'}</Text>
                    </View>
                  )}
                </View>
              );
            })()}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Bio courte' : 'Short Bio'}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder={language === 'fr' ? 'Votre biographie...' : 'Your biography...'}
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                numberOfLines={4}
              />
                </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Date de naissance' : 'Date of Birth'}</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{birthDate || '-'}</Text>
              </View>
              <Text style={styles.readOnlyHint}>{language === 'fr' ? 'Ce champ ne peut pas être modifié' : 'This field cannot be modified'}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Genre musical principal' : 'Main Music Genre'}</Text>
              <TextInput
                style={styles.input}
                value={genre}
                onChangeText={setGenre}
                placeholder="Techno"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
          </View>

            {/* Zones de déplacement */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Zones déplacées' : 'Travel Zones'}</Text>
              <View style={styles.daysContainer}>
                {Object.keys(availableDays).map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      availableDays[day] && styles.dayButtonActive
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      availableDays[day] && styles.dayButtonTextActive
                    ]}>
                      {day}
            </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Ville (inscription)' : 'City (registration)'}</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{city || '-'}</Text>
              </View>
              <Text style={styles.readOnlyHint}>{language === 'fr' ? 'Ce champ ne peut pas être modifié' : 'This field cannot be modified'}</Text>
          </View>
          
          <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Ville principale (optionnelle)' : 'Main City (optional)'}</Text>
              <TextInput
                style={styles.input}
                value={mainCity}
                onChangeText={setMainCity}
                placeholder={language === 'fr' ? 'Ville principale pour les déplacements' : 'Main city for travel'}
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
              </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Langues parlées' : 'Spoken Languages'}</Text>
              <TextInput
                style={styles.input}
                value={languages}
                onChangeText={setLanguages}
                placeholder="Français, Anglais"
                placeholderTextColor="rgba(255,255,255,0.4)"
                returnKeyType="done"
                blurOnSubmit={true}
              />
            </View>

            {/* Réseaux sociaux */}
            <Text style={[styles.sectionTitle, { marginTop: 30, marginBottom: 16 }]}>
              {language === 'fr' ? 'RÉSEAUX SOCIAUX' : 'SOCIAL NETWORKS'}
                </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>🎵 SoundCloud</Text>
              <TextInput
                style={styles.input}
                value={soundcloudUrl}
                onChangeText={setSoundcloudUrl}
                placeholder="https://soundcloud.com/..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="url"
                autoCapitalize="none"
              />
              </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>☁️ Spotify</Text>
              <TextInput
                style={styles.input}
                value={spotifyUrl}
                onChangeText={setSpotifyUrl}
                placeholder="https://open.spotify.com/..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>▶️ YouTube</Text>
              <TextInput
                style={styles.input}
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                placeholder="https://youtube.com/..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="url"
                autoCapitalize="none"
              />
          </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>📷 Instagram</Text>
              <TextInput
                style={styles.input}
                value={instagramUrl}
                onChangeText={setInstagramUrl}
                placeholder="https://instagram.com/..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>🎬 TikTok</Text>
              <TextInput
                style={styles.input}
                value={tiktokUrl}
                onChangeText={setTiktokUrl}
                placeholder="https://tiktok.com/..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {language === 'fr' ? 'Enregistrer' : 'Save'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
          </KeyboardAvoidingView>
        );

      case 'tarifs':
        return (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
          >
            <ScrollView 
              style={styles.contentScroll} 
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
            <Text style={styles.sectionTitle}>
              {language === 'fr' ? 'DISPONIBILITÉS' : 'AVAILABILITIES'}
          </Text>

          <Text style={styles.comingSoon}>
            {language === 'fr'
              ? 'Le prix sera fixé via un contrat avec l\'organisateur (dans le chat privé).'
              : 'Pricing will be agreed via a contract with the organizer (in private chat).'}
          </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Disponibilités' : 'Availabilities'}</Text>
              <View style={styles.daysContainer}>
                {Object.keys(availableDays).map((day) => (
          <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      availableDays[day] && styles.dayButtonActive
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      availableDays[day] && styles.dayButtonTextActive
                    ]}>
                      {day}
              </Text>
          </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.switchContainer}>
                <Text style={styles.label}>{language === 'fr' ? 'Statut' : 'Status'}</Text>
                <TouchableOpacity
                  style={[styles.toggle, availableStatus && styles.toggleActive]}
                  onPress={() => setAvailableStatus(!availableStatus)}
                >
                  <View style={[styles.toggleThumb, availableStatus && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.statusText}>
                {availableStatus 
                  ? (language === 'fr' ? 'Disponible' : 'Available')
                  : (language === 'fr' ? 'Indisponible' : 'Unavailable')}
              </Text>
        </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                  {language === 'fr' ? 'Enregistrer' : 'Save'}
              </Text>
            )}
          </TouchableOpacity>
      </ScrollView>
          </KeyboardAvoidingView>
        );

      case 'materiel':
        return (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
          >
            <ScrollView 
              style={styles.contentScroll} 
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.sectionTitle}>
                {language === 'fr' ? 'MATÉRIEL & RIDER' : 'EQUIPMENT & RIDER'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{language === 'fr' ? 'Matériel et rider technique' : 'Technical Equipment & Rider'}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={equipment}
                  onChangeText={setEquipment}
                  placeholder={language === 'fr' ? 'Listez votre matériel et vos besoins techniques...' : 'List your equipment and technical needs...'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  multiline
                  numberOfLines={10}
                />
        </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {language === 'fr' ? 'Enregistrer' : 'Save'}
                  </Text>
                )}
              </TouchableOpacity>
      </ScrollView>
          </KeyboardAvoidingView>
        );

      case 'bookings':
        // Séparer les invitations PENDING des bookings ACCEPTED
        const pendingInvitations = bookings.filter(b => b.invitationStatus === 'PENDING');
        const acceptedBookings = bookings.filter(b => b.invitationStatus === 'ACCEPTED');
        const rejectedInvitations = bookings.filter(b => b.invitationStatus === 'REJECTED');
        
        return (
          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.sectionTitle}>
              {language === 'fr' ? 'BOOKINGS' : 'BOOKINGS'}
            </Text>
            
            {loadingBookings ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>
                  {language === 'fr' ? 'Chargement...' : 'Loading...'}
                </Text>
              </View>
            ) : (
              <>
                {/* Invitations en attente */}
                {pendingInvitations.length > 0 && (
                  <View style={styles.invitationsSection}>
                    <Text style={styles.invitationsSectionTitle}>
                      {language === 'fr' ? '📩 Invitations en attente' : '📩 Pending invitations'}
                    </Text>
              <View style={styles.bookingsList}>
                      {pendingInvitations.map((booking) => {
                        const eventDate = new Date(booking.eventDate);
                        const formattedDate = eventDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                        
                        return (
                          <View key={booking.id} style={[styles.bookingCard, styles.pendingInvitationCard]}>
                            <View style={styles.bookingHeader}>
                              <Text style={styles.bookingTitle}>{booking.eventTitle}</Text>
                              <View style={[styles.bookingStatus, { backgroundColor: '#FFA50020' }]}>
                                <Text style={[styles.bookingStatusText, { color: '#FFA500' }]}>
                                  {language === 'fr' ? 'En attente' : 'Pending'}
                                </Text>
                              </View>
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
                            
                            <View style={styles.invitationActions}>
                              {/* Première ligne : Chat et Groupe */}
                              <View style={styles.invitationActionsRow}>
                                <TouchableOpacity
                                  style={[styles.invitationButton, styles.chatButton]}
                                  onPress={() => openChat(booking.id)}
                                >
                                  <Text style={styles.invitationButtonText}>
                                    💬 {language === 'fr' ? 'Chat' : 'Chat'}
                                  </Text>
                                </TouchableOpacity>
                                {/* Bouton chat de groupe pour les invitations acceptées ou si l'invitation est acceptée */}
                                {booking.eventId ? (
                                  <TouchableOpacity
                                    style={[styles.invitationButton, { backgroundColor: '#2196F3' }]}
                                    onPress={() => openGroupChat(booking.eventId)}
                                  >
                                    <Text style={styles.invitationButtonText}>
                                      👥 {language === 'fr' ? 'Groupe' : 'Group'}
                                    </Text>
                                  </TouchableOpacity>
                                ) : (
                                  <View style={styles.invitationButtonPlaceholder} />
                                )}
                              </View>
                              {/* Deuxième ligne : Refuser et Accepter - bien séparés */}
                              <View style={styles.invitationActionsRowCritical}>
                                <TouchableOpacity
                                  style={[styles.invitationButtonCritical, styles.rejectButton]}
                                  onPress={() => handleRejectInvitation(booking.id)}
                                  disabled={processingInvitation === booking.id}
                                >
                                  {processingInvitation === booking.id ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                  ) : (
                                    <Text style={styles.invitationButtonCriticalText}>
                                      ✕ {language === 'fr' ? 'Refuser' : 'Reject'}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.invitationButtonCritical, styles.acceptButton]}
                                  onPress={() => handleAcceptInvitation(booking.id)}
                                  disabled={processingInvitation === booking.id}
                                >
                                  {processingInvitation === booking.id ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                  ) : (
                                    <Text style={styles.invitationButtonCriticalText}>
                                      ✓ {language === 'fr' ? 'Accepter' : 'Accept'}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
                
                {/* Bookings acceptés */}
                {acceptedBookings.length > 0 && (
                  <View style={styles.invitationsSection}>
                    <Text style={styles.invitationsSectionTitle}>
                      {language === 'fr' ? '✅ Bookings confirmés' : '✅ Confirmed bookings'}
                    </Text>
                    <View style={styles.bookingsList}>
                      {acceptedBookings.map((booking) => {
                  const eventDate = new Date(booking.eventDate);
                  const formattedDate = eventDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  
                  const statusColors = {
                    UPCOMING: Colors.primary,
                    ONGOING: '#4CAF50',
                    FINISHED: Colors.textSecondary,
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
              {language === 'fr' ? 'VIDÉOS & MUSIQUE' : 'VIDEOS & MUSIC'}
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

            {/* Audio MP3 */}
            <Text style={styles.mediaSubtitle}>
              {language === 'fr' ? 'AUDIO (MP3)' : 'AUDIO (MP3)'}
            </Text>
            <Text style={styles.mediaHint}>
              {language === 'fr' ? 'Taille max ~100 Mo par média' : 'Max size ~100 MB per media'}
            </Text>
            <View style={styles.mediaList}>
              {audioFiles
                .filter(audio => {
                  const audioUrl = audio?.url || (typeof audio === 'string' ? audio : null);
                  return audioUrl && typeof audioUrl === 'string';
                })
                .map((audio, index) => {
                  const audioUrl = audio?.url || (typeof audio === 'string' ? audio : null);
                  const audioTitle = audio?.title || `${language === 'fr' ? 'Set audio' : 'Audio Set'} ${index + 1}`;
                  
                  if (!audioUrl || typeof audioUrl !== 'string') {
                    return null;
                  }

                  let finalAudioUrl = audioUrl;
                  
                  // Pour les URLs HTTP/HTTPS, s'assurer qu'elles sont complètes
                  if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
                    // Vérifier si c'est une URL de l'ancien tunnel Cloudflare et la remplacer
                    const oldTunnelPattern = /https?:\/\/[^\/]+\.trycloudflare\.com/;
                    if (oldTunnelPattern.test(audioUrl)) {
                      // Remplacer l'ancienne URL du tunnel par la nouvelle
                      finalAudioUrl = normalizeMediaUrl(audioUrl);
                    } else {
                    finalAudioUrl = audioUrl;
                    }
                  } else {
                    finalAudioUrl = normalizeMediaUrl(audioUrl);
                  }

                  return (
                    <View key={audio?.id || index} style={styles.audioItemContainer}>
                      <View style={styles.audioPlayerWrapper}>
                        <AudioPlayer
                          audioUrl={finalAudioUrl}
                          title={audioTitle}
                        />
                      </View>
                      <View style={styles.audioActions}>
                        {audio.id && (
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => {
                              setEditingTitle({ type: 'audio', id: audio.id, currentTitle: audioTitle });
                              setEditTitleValue(audioTitle);
                            }}
                          >
                            <Text style={styles.editButtonText}>✏️</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.deleteButtonAudio}
                          onPress={() => {
                            if (audio.id) {
                              showConfirm(
                                language === 'fr' ? 'Supprimer' : 'Delete',
                                language === 'fr' ? 'Supprimer ce fichier audio ?' : 'Delete this audio file?',
                                [
                                  { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
                                  { text: language === 'fr' ? 'Supprimer' : 'Delete', style: 'destructive', onPress: () => deleteMedia(audio.id, 'audio') },
                                ]
                              );
                            } else {
                              setAudioFiles(audioFiles.filter((_, i) => i !== index));
                            }
                          }}
                        >
                          <Text style={styles.deleteButtonText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              <TouchableOpacity style={styles.addAudioButton} onPress={pickAudio}>
                <Text style={styles.addAudioButtonText}>
                  {language === 'fr' ? '+ Ajouter un set audio' : '+ Add audio set'}
                </Text>
              </TouchableOpacity>
            </View>
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
              <TouchableOpacity style={styles.addAudioSetButton} onPress={pickAudio}>
                <Text style={styles.addAudioSetButtonText}>
                  + {language === 'fr' ? 'Ajouter un set audio' : 'Add an audio set'}
                </Text>
              </TouchableOpacity>
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
        onRequestClose={() => {
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
        presentationStyle="overFullScreen"
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
                          onPress={() => setContractEditorVisible(true)}
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
                          onPress={acceptContract}
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
        onRequestClose={() => {
          setContractEditorVisible(false);
          setShowPaymentTermsModal(false);
          setShowCancellationModal(false);
          setShowEventEndModal(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.contractModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.contractModalCard}>
            <ScrollView
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
                setShowPaymentTermsModal={setShowPaymentTermsModal}
                setShowDealTypeModal={() => {}}
                setShowCancellationModal={setShowCancellationModal}
                eventEndOptions={contractEventEndOptions}
                eventWindowHint={contractEventWindowHint}
                setShowEventEndModal={setShowEventEndModal}
              />

              <View style={styles.contractModalActions}>
                <TouchableOpacity
                  style={[styles.contractButton, styles.contractButtonSecondary]}
                  onPress={() => {
                    setContractEditorVisible(false);
                    setShowPaymentTermsModal(false);
                    setShowCancellationModal(false);
                    setShowEventEndModal(false);
                  }}
                >
                  <Text style={styles.contractButtonText}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contractButton, styles.contractButtonPrimary]}
                  onPress={counterContract}
                >
                  <Text style={styles.contractButtonTextDark}>{language === 'fr' ? 'Envoyer' : 'Send'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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

      {/* Modal de sélection de photo pour profil/bannière */}
      <Modal
        visible={selectingPhotoFor !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectingPhotoFor(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.photoSelectionModal}>
            <View style={styles.photoSelectionHeader}>
              <Text style={styles.modalTitle}>
                {language === 'fr' 
                  ? (selectingPhotoFor === 'profile' ? 'Choisir une photo de profil' : 'Choisir une bannière')
                  : (selectingPhotoFor === 'profile' ? 'Choose a profile picture' : 'Choose a banner')
                }
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setSelectingPhotoFor(null)}
              >
                <Text style={styles.closeModalButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.photoSelectionContent}>
              {photos.length > 0 ? (
                <View style={styles.photoSelectionGrid}>
                  {photos.map((photo, index) => (
                    <TouchableOpacity
                      key={photo.id || index}
                      style={styles.photoSelectionItem}
                      onPress={async () => {
                        try {
                          await saveMedia('photo', photo.url, selectingPhotoFor);
                          if (selectingPhotoFor === 'profile') {
                            setProfileImage(normalizeMediaUrl(photo.url));
                          } else {
                            setBannerImage(normalizeMediaUrl(photo.url));
                          }
                          showSuccess(language === 'fr' 
                            ? (selectingPhotoFor === 'profile' ? 'Photo de profil mise à jour' : 'Bannière mise à jour')
                            : (selectingPhotoFor === 'profile' ? 'Profile picture updated' : 'Banner updated'));
                          setSelectingPhotoFor(null);
                        } catch (error) {
                          console.error('Erreur sélection photo:', error);
                        }
                      }}
                    >
                      <Image source={{ uri: photo.url }} style={styles.photoSelectionImage} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.photoSelectionEmpty}>
                  <Text style={styles.photoSelectionEmptyText}>
                    {language === 'fr' 
                      ? 'Aucune photo disponible. Ajoutez d\'abord des photos dans la section Médias.'
                      : 'No photos available. Add photos first in the Media section.'
                    }
                  </Text>
                  <TouchableOpacity
                    style={styles.addPhotoButton}
                    onPress={() => {
                      setSelectingPhotoFor(null);
                      setActiveSection('medias');
                    }}
                  >
                    <Text style={styles.addPhotoButtonText}>
                      {language === 'fr' ? 'Aller aux médias' : 'Go to Media'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.text,
    marginTop: 16,
    fontSize: 16,
  },
  // Sidebar
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: Colors.backgroundCard,
    borderRightWidth: 2,
    borderRightColor: Colors.borderActive,
    zIndex: 1000,
    elevation: 5,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sidebarTitle: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '300',
  },
  sidebarContent: {
    flex: 1,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuItemActive: {
    backgroundColor: Colors.primary + '20',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  menuItemIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  menuItemIcon: {
    fontSize: 20,
  },
  menuItemText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sidebarFooterTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  addAudioSetButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  addAudioSetButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  // Main content
  mainContent: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTabs: {
    paddingHorizontal: 12,
    marginBottom: 10,
    maxHeight: 54,
  },
  sectionTabsContent: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: 12,
    alignItems: 'center',
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    maxWidth: 150,
  },
  sectionTabActive: {
    borderColor: 'rgba(255,23,68,0.55)',
    backgroundColor: 'rgba(255,23,68,0.12)',
  },
  sectionTabIconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 6,
  },
  sectionTabIcon: {
    fontSize: 14,
  },
  sectionTabText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  sectionTabTextActive: {
    color: '#fff',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    marginRight: 16,
    padding: 8,
  },
  menuButtonText: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: '700',
  },
  messagesButton: {
    position: 'relative',
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    flex: 1,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionTitle: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imageUploadSection: {
    marginBottom: 20,
  },
  profileImageContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  profileImageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundCard,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerImageWrapper: {
    width: 120,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.backgroundCard,
  },
  bannerPlaceholder: {
    width: 120,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageEditOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageEditIcon: {
    fontSize: 20,
  },
  uploadIcon: {
    color: Colors.primary,
    fontSize: 24,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayButtonActive: {
    backgroundColor: Colors.primary + '30',
    borderColor: Colors.primary,
  },
  dayButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  legalBanner: {
    backgroundColor: 'rgba(255,23,68,0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  legalBannerText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  legalSectionTitle: { marginTop: 16 },
  legalHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 12 },
  readOnlyLegalWrap: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 12 },
  readOnlyLegalText: { color: '#fff', fontSize: 14, marginBottom: 4 },
  readOnlyLegalHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  // Avis & notes
  reviewSummaryCard: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderActive,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  reviewSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  reviewSummaryTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  reviewRefresh: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  reviewSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewSummaryScore: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  reviewSummaryMeta: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
  },
  reviewCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewCardType: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  reviewCardEvent: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  reviewCardComment: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 18,
  },
  reviewCardCommentEmpty: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.textSecondary,
  },
  toggleThumbActive: {
    backgroundColor: Colors.text,
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  // Media section
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  addFileButton: {
    borderWidth: 1,
    borderColor: Colors.borderActive,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
    justifyContent: 'center',
  },
  addFileButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  mediaSubtitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 16,
  },
  mediaHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  mediaItem: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.backgroundCard,
  },
  addMediaButton: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    borderRadius: 8,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMediaButtonText: {
    color: Colors.primary,
    fontSize: 32,
    fontWeight: '300',
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  deleteButtonText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  mediaList: {
    gap: 12,
    marginBottom: 24,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  videoThumbnail: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnailImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    position: 'absolute',
  },
  videoPlaceholderIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  videoPlaceholderText: {
    color: Colors.text,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.9,
  },
  playButtonOverlay: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 23, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  playIcon: {
    color: Colors.primary,
    fontSize: 24,
  },
  playIconWhite: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 2,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  addVideoButton: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  addVideoButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  audioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  audioItemContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  audioIcon: {
    fontSize: 24,
  },
  audioInfo: {
    flex: 1,
  },
  audioTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  waveform: {
    height: 20,
    backgroundColor: Colors.background,
    borderRadius: 4,
  },
  addAudioButton: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  addAudioButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  comingSoon: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  readOnlyInput: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  readOnlyText: {
    color: Colors.text,
    fontSize: 16,
  },
  readOnlyHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  videoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 16,
  },
  deleteButtonVideo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPlayerWrapper: {
    flex: 1,
  },
  audioActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  deleteButtonAudio: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    color: Colors.text,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalButtonCancelText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSave: {
    backgroundColor: Colors.primary,
  },
  modalButtonSaveText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  imageHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  photoSelectionModal: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeModalButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalButtonText: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '300',
  },
  photoSelectionContent: {
    padding: 16,
  },
  photoSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoSelectionItem: {
    width: (width - 100) / 3,
    height: (width - 100) / 3,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  photoSelectionImage: {
    width: '100%',
    height: '100%',
  },
  photoSelectionEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  photoSelectionEmptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  addPhotoButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  addPhotoButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  // Bookings
  invitationsSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  invitationsSectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  bookingsList: {
    gap: 16,
    marginTop: 8,
  },
  bookingCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pendingInvitationCard: {
    borderColor: '#FFA500',
    borderWidth: 2,
  },
  invitationActions: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  invitationActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  invitationButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  invitationButtonPlaceholder: {
    flex: 1,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#45a049',
  },
  rejectButton: {
    backgroundColor: '#F44336',
    borderColor: '#d32f2f',
  },
  invitationButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  invitationActionsRowCritical: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 4,
  },
  invitationButtonCritical: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  invitationButtonCriticalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  bookingStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bookingStatusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bookingInfo: {
    marginBottom: 10,
  },
  bookingInfoLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  bookingInfoValue: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  chatButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
  },
  // Chat Modal
  chatModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  chatModalContent: {
    flex: 1,
    backgroundColor: Colors.background,
    marginTop: Platform.OS === 'ios' ? 50 : 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '100%',
  },
  chatHeaderContainer: {
    zIndex: 10,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
  },
  chatCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatCloseButtonText: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '300',
  },
  chatHeaderTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  // ✅ Contrat (chat privé)
  contractCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.22)',
    backgroundColor: 'rgba(255,23,68,0.06)',
  },
  contractTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  contractTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  contractStatus: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  contractMeta: {
    marginTop: 6,
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  contractLine: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  contractLineStrong: {
    color: Colors.text,
    fontWeight: '900',
  },
  contractSmall: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  contractActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  contractHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  contractAckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    marginBottom: 4,
    paddingRight: 4,
  },
  contractAckCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,23,68,0.55)',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractAckCheckboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  contractAckCheckmark: {
    color: '#0b0b0e',
    fontSize: 14,
    fontWeight: '800',
  },
  contractAckText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  contractButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  contractButtonSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  contractButtonText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  contractButtonTextDark: {
    color: '#0b0b0e',
    fontSize: 12,
    fontWeight: '900',
  },
  contractModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  contractModalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.25)',
    backgroundColor: Colors.background,
  },
  contractModalTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  contractModalLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  contractModalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    backgroundColor: 'rgba(255,255,255,0.04)',
    fontSize: 13,
  },
  contractModalDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contractModalInputText: {
    color: Colors.text,
    fontSize: 13,
    flex: 1,
  },
  contractModalChevron: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginLeft: 8,
  },
  paymentTermsInline: {
    marginTop: 8,
  },
  paymentTermsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 18,
  },
  paymentTermsModalContent: {
    backgroundColor: '#0b0b0e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  paymentTermsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  paymentTermsOptionSelected: {
    borderColor: 'rgba(255,23,68,0.5)',
    backgroundColor: 'rgba(255,23,68,0.1)',
  },
  paymentTermsOptionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  paymentTermsOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '800',
  },
  paymentTermsCheck: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  paymentTermsClose: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  contractModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  chatLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  chatMessagesContainer: {
    flex: 1,
    flexGrow: 1,
  },
  chatMessagesContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  chatEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  chatEmptyStateText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  chatMessage: {
    marginBottom: 16,
  },
  chatMessageOwn: {
    alignItems: 'flex-end',
  },
  chatMessageOther: {
    alignItems: 'flex-start',
  },
  chatMessageSender: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatMessageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  chatMessageAvatarPlaceholder: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatMessageAvatarText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  chatMessageSenderName: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  chatMessageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  chatMessageBubbleOwn: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  chatMessageBubbleOther: {
    backgroundColor: Colors.backgroundCard,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chatMessageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  chatMessageTextOwn: {
    color: Colors.text,
  },
  chatMessageTextOther: {
    color: Colors.text,
  },
  chatMessageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  chatMessageTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  chatMessageTimeOther: {
    color: Colors.textSecondary,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'android' ? 20 : 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
    minHeight: 60,
    zIndex: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 12 : 10,
    maxHeight: 100,
    minHeight: Platform.OS === 'android' ? 44 : 40,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlignVertical: 'center',
  },
  chatSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  chatSendButtonDisabled: {
    opacity: 0.5,
  },
  chatSendButtonText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
});
