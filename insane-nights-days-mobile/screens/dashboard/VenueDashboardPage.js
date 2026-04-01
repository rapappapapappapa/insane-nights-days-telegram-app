import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  Linking,
  Modal,
  KeyboardAvoidingView,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Colors from '../../constants/colors';
import VideoPlayer from '../../components/VideoPlayer';
import StarRating from '../../components/StarRating';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useNotifications } from '../../hooks/useNotifications';
import RejectReasonModal from '../../components/RejectReasonModal';
import ContractDraftEditorFields from '../../components/ContractDraftEditorFields';
import DealTypePickerModal from '../../components/DealTypePickerModal';
import CancellationPolicyPickerModal from '../../components/CancellationPolicyPickerModal';
import EventEndTimePickerModal from '../../components/EventEndTimePickerModal';
import ContractPdfPreviewModal from '../../components/ContractPdfPreviewModal';
import {
  draftFromPayload,
  buildVenueContractPayload,
  dealTypeLabel,
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

const PAYMENT_TERMS_OPTIONS = [
  { value: 'jour_booking', labelFr: 'Jour booking', labelEn: 'Booking day' },
  { value: 'j-1_prestation', labelFr: 'J-1 prestation', labelEn: 'D-1 performance' },
  { value: 'j+1_prestation', labelFr: 'J+1 prestation', labelEn: 'D+1 performance' },
  { value: 'j+15', labelFr: 'J+15', labelEn: 'D+15' },
  { value: 'j+30', labelFr: 'J+30', labelEn: 'D+30' },
];

export default function VenueDashboardPage() {
  const { height: contractModalWindowH } = useWindowDimensions();
  const contractEditorModalCardHeight = Math.round(contractModalWindowH * 0.88);
  const { language } = useLanguage();
  const { goBack, navigate, routeParams } = useNavigation();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();
  const { user } = useAuth();
  const { refreshUnreadCount, markAllAsRead } = useNotifications();

  // Drawer global géré dans App.js
  const [loading, setLoading] = useState(true);
  const [savingMedia, setSavingMedia] = useState(false);
  const [venue, setVenue] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [deletingMediaId, setDeletingMediaId] = useState(null);
  const shouldOpenBookings = !!routeParams?.openBookings || !!routeParams?.openChatEventVenueId;
  const [activeTab, setActiveTab] = useState(shouldOpenBookings ? 'bookings' : 'infos'); // infos | medias | avis | bookings

  // Bookings
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectModalEventVenueId, setRejectModalEventVenueId] = useState(null);
  const [rejectModalAction, setRejectModalAction] = useState('reject'); // 'reject' | 'cancel'

  // Chat
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedChatEventVenueId, setSelectedChatEventVenueId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingChatMessages, setLoadingChatMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const chatScrollViewRef = useRef(null);

  // Contrat
  const [contractLoading, setContractLoading] = useState(false);
  const [contractData, setContractData] = useState(null);
  const [contractBooking, setContractBooking] = useState(null);
  const [contractEditorVisible, setContractEditorVisible] = useState(false);
  const [contractDraft, setContractDraft] = useState(() => draftFromPayload({}, 'venue'));
  const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showEventEndModal, setShowEventEndModal] = useState(false);
  const [showDealTypeModal, setShowDealTypeModal] = useState(false);
  const [contractAcceptAck, setContractAcceptAck] = useState(false);
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
    setShowDealTypeModal(false);
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
  const setShowDealTypeModalForContract = (v) => {
    if (!v) return setShowDealTypeModal(false);
    liftContractEditorForIosPicker(() => setShowDealTypeModal(true));
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
    const anyOpen =
      showPaymentTermsModal || showDealTypeModal || showCancellationModal || showEventEndModal;
    if (anyOpen) return;
    if (!contractEditorWasHiddenForChildModalRef.current) return;
    contractEditorWasHiddenForChildModalRef.current = false;
    const tid = setTimeout(() => setContractEditorVisible(true), 80);
    return () => clearTimeout(tid);
  }, [showPaymentTermsModal, showDealTypeModal, showCancellationModal, showEventEndModal]);

  const contractEventEndOptions = useMemo(
    () => buildEventEndTimeOptions(contractBooking?.eventTime, contractBooking?.durationHours, 30),
    [contractBooking?.eventTime, contractBooking?.durationHours]
  );
  const contractEventWindowHint = useMemo(
    () => formatEventWindowHint(contractBooking?.eventTime, contractBooking?.durationHours, language),
    [contractBooking?.eventTime, contractBooking?.durationHours, language]
  );

  const loadVenue = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      // Si un venueId est passé via la navigation, on l'utilise en priorité
      const targetVenueId = routeParams?.venueId;

      if (targetVenueId) {
        const ratingsRes = await api.getVenueRatings(targetVenueId);
        if (ratingsRes?.success) {
          setRatings(ratingsRes.ratings);
        }
        // Récupérer le profil via getVenues (accessible aux bookers) sinon via getUserProfiles
        const profiles = await api.getUserProfiles(user.token);
        const venueFromProfiles = profiles?.profiles?.venue?.find((v) => v.id === targetVenueId);
        if (venueFromProfiles) {
          setVenue(venueFromProfiles);
        }
        await loadVenueMedia(targetVenueId);
      } else {
        const profiles = await api.getUserProfiles(user.token);
        const firstVenue = profiles?.profiles?.venue?.[0];
        if (firstVenue) {
          setVenue(firstVenue);
          const ratingsRes = await api.getVenueRatings(firstVenue.id);
          if (ratingsRes?.success) {
            setRatings(ratingsRes.ratings);
          }
          await loadVenueMedia(firstVenue.id);
        }
      }
    } catch (error) {
      console.error('Erreur chargement venue dashboard:', error);
      showError(language === 'fr' ? 'Impossible de charger le lieu.' : 'Unable to load venue.');
    } finally {
      setLoading(false);
    }
  };

  const loadVenueMedia = async (venueId) => {
    if (!venueId) return;
    try {
      const mediaRes = await api.getVenueMedia(venueId);
      if (mediaRes?.success && Array.isArray(mediaRes.media)) {
        const allMedia = mediaRes.media.map((m) => ({ ...m, url: normalizeMediaUrl(m.url) }));
        setPhotos(allMedia.filter((m) => m.type === 'photo'));
        setVideos(allMedia.filter((m) => m.type === 'video'));
      }
    } catch (error) {
      console.error('Erreur récupération médias lieu:', error);
    }
  };

  useEffect(() => {
    loadVenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, routeParams?.venueId]);

  const fetchBookings = async () => {
    if (!user?.token) return;
    setLoadingBookings(true);
    try {
      const response = await api.getVenueBookings(user.token);
      if (response?.success) {
        setBookings(response.bookings || []);
      }
    } catch (error) {
      console.error('Erreur récupération bookings lieu:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bookings' && user?.token) {
      fetchBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.token]);

  useEffect(() => {
    setContractAcceptAck(false);
  }, [selectedChatEventVenueId, contractData?.id, contractData?.status, contractData?.sentBy]);

  const openVenueChat = async (eventVenueId) => {
    setSelectedChatEventVenueId(eventVenueId);
    setChatModalVisible(true);
    setChatMessages([]);
    await loadChatMessages(eventVenueId);
    await markAllAsRead();
    await loadVenueContract(eventVenueId);
  };

  const loadChatMessages = async (eventVenueId) => {
    if (!user?.token || !eventVenueId) return;
    setLoadingChatMessages(true);
    try {
      const response = await api.getVenueMessages(user.token, eventVenueId);
      if (response?.success && Array.isArray(response.messages)) {
        setChatMessages(response.messages);
      }
    } catch (e) {
      console.error('[VenueDashboard] loadChatMessages error:', e);
    } finally {
      setLoadingChatMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!user?.token || !newMessageText.trim() || sendingMessage || !selectedChatEventVenueId) return;
    const messageText = newMessageText.trim();
    setNewMessageText('');
    setSendingMessage(true);
    try {
      const response = await api.sendVenueMessage(user.token, selectedChatEventVenueId, messageText);
      if (response?.success) {
        await loadChatMessages(selectedChatEventVenueId);
      } else {
        showError(response?.message || (language === 'fr' ? 'Impossible d\'envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('[VenueDashboard] sendMessage error:', e);
      showError(language === 'fr' ? 'Erreur envoi message.' : 'Message send error.');
    } finally {
      setSendingMessage(false);
    }
  };

  const loadVenueContract = async (eventVenueId) => {
    if (!user?.token || !eventVenueId) return;
    setContractLoading(true);
    try {
      const res = await api.getVenueContract(user.token, eventVenueId);
      if (res?.success) {
        setContractData(res.contract || null);
        setContractBooking(res.booking || null);
        const p = res.contract?.payload || {};
        setContractDraft(draftFromPayload(p, 'venue'));
      }
    } catch (e) {
      console.error('[VenueDashboard] loadVenueContract error:', e);
    } finally {
      setContractLoading(false);
    }
  };

  const saveContractDraft = async () => {
    if (!user?.token || !selectedChatEventVenueId) return false;
    try {
      const payload = buildVenueContractPayload(contractDraft);
      const res = await api.saveVenueContractDraft(user.token, selectedChatEventVenueId, payload);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contrat sauvegardé.' : 'Contract saved.');
        closeContractEditorSession();
        await loadVenueContract(selectedChatEventVenueId);
        return true;
      }
      showError(res?.message || (language === 'fr' ? 'Impossible de sauvegarder.' : 'Unable to save.'));
      return false;
    } catch (e) {
      console.error('[VenueDashboard] saveContractDraft error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
      return false;
    }
  };

  const sendContract = async () => {
    if (!user?.token || !selectedChatEventVenueId) return;
    try {
      const res = await api.sendVenueContract(user.token, selectedChatEventVenueId);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contrat envoyé au lieu.' : 'Contract sent to venue.');
        await loadVenueContract(selectedChatEventVenueId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d\'envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('[VenueDashboard] sendContract error:', e);
      showError(language === 'fr' ? 'Erreur envoi contrat.' : 'Contract send error.');
    }
  };

  const acceptContract = async () => {
    if (!user?.token || !selectedChatEventVenueId) return;
    try {
      const res = await api.acceptVenueContract(user.token, selectedChatEventVenueId);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contrat accepté.' : 'Contract accepted.');
        await loadVenueContract(selectedChatEventVenueId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d\'accepter.' : 'Unable to accept.'));
      }
    } catch (e) {
      console.error('[VenueDashboard] acceptContract error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
    }
  };

  const counterContract = async () => {
    if (!user?.token || !selectedChatEventVenueId) return;
    try {
      const payload = buildVenueContractPayload(contractDraft);
      const res = await api.counterVenueContract(user.token, selectedChatEventVenueId, payload);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contre-proposition envoyée.' : 'Counter-proposal sent.');
        closeContractEditorSession();
        await loadVenueContract(selectedChatEventVenueId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d\'envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('[VenueDashboard] counterContract error:', e);
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
    if (!user?.token || !selectedChatEventVenueId) return;
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
        const res = await api.previewVenueContractPdf(user.token, selectedChatEventVenueId, previewPayload);
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

  const handleAcceptVenueInvitation = async (eventVenueId) => {
    if (!user?.token || processingInvitation) return;
    setProcessingInvitation(eventVenueId);
    try {
      const response = await api.acceptVenueInvitation(user.token, eventVenueId);
      if (response?.success) {
        await fetchBookings();
        showSuccess(language === 'fr' ? 'Invitation acceptée.' : 'Invitation accepted.');
      } else {
        showError(response?.message || (language === 'fr' ? 'Impossible d\'accepter.' : 'Unable to accept.'));
      }
    } catch (error) {
      console.error('Erreur acceptation invitation lieu:', error);
      showError(language === 'fr' ? 'Impossible d\'accepter.' : 'Unable to accept.');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleRejectVenueInvitation = (eventVenueId) => {
    if (!user?.token || processingInvitation) return;
    setRejectModalAction('reject');
    setRejectModalEventVenueId(eventVenueId);
    setRejectModalVisible(true);
  };

  const handleCancelVenueBooking = (eventVenueId) => {
    if (!user?.token || processingInvitation) return;
    setRejectModalAction('cancel');
    setRejectModalEventVenueId(eventVenueId);
    setRejectModalVisible(true);
  };

  const handleRejectVenueConfirm = async (reason) => {
    if (!user?.token || !rejectModalEventVenueId) return;
    setProcessingInvitation(rejectModalEventVenueId);
    const isCancel = rejectModalAction === 'cancel';
    try {
      const response = isCancel
        ? await api.cancelVenueBooking(user.token, rejectModalEventVenueId, reason)
        : await api.rejectVenueInvitation(user.token, rejectModalEventVenueId, reason);
      setRejectModalVisible(false);
      setRejectModalEventVenueId(null);
      if (response?.success) {
        await fetchBookings();
        showSuccess(
          isCancel
            ? (language === 'fr' ? 'Booking annulé.' : 'Booking cancelled.')
            : (language === 'fr' ? 'Invitation refusée.' : 'Invitation rejected.')
        );
      } else {
        showError(response?.message || (language === 'fr' ? (isCancel ? 'Impossible d\'annuler.' : 'Impossible de refuser.') : (isCancel ? 'Unable to cancel.' : 'Unable to reject.')));
      }
    } catch (error) {
      setRejectModalVisible(false);
      setRejectModalEventVenueId(null);
      console.error(isCancel ? 'Erreur annulation lieu:' : 'Erreur refus invitation lieu:', error);
      showError(language === 'fr' ? (isCancel ? 'Impossible d\'annuler.' : 'Impossible de refuser.') : (isCancel ? 'Unable to cancel.' : 'Unable to reject.'));
    } finally {
      setProcessingInvitation(null);
    }
  };

  useEffect(() => {
    if (!user?.token) return;
    const eventVenueId = routeParams?.openChatEventVenueId;
    if (eventVenueId) {
      setActiveTab('bookings');
      openVenueChat(eventVenueId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, routeParams?.openChatEventVenueId]);

  const pickMedia = async (mediaType) => {
    if (!venue) return;
    if (savingMedia) return;
    
    try {
      // Sur iOS, vérifier et demander les permissions spécifiquement pour les vidéos
      if (Platform.OS === 'ios' && mediaType === 'video') {
        // Vérifier d'abord l'état actuel
        const { status: existingStatus, canAskAgain, accessPrivileges } = await ImagePicker.getMediaLibraryPermissionsAsync();
        console.log('[pickMedia] État permissions iOS:', { existingStatus, canAskAgain, accessPrivileges });
        
        let finalStatus = existingStatus;
        let finalAccessPrivileges = accessPrivileges;

        // Si les permissions ne sont pas accordées et qu'on peut encore demander
        if (existingStatus !== 'granted' && canAskAgain) {
          const response = await ImagePicker.requestMediaLibraryPermissionsAsync();
          finalStatus = response.status;
          finalAccessPrivileges = response.accessPrivileges;
          console.log('[pickMedia] Nouveau statut après demande:', { status: finalStatus, accessPrivileges: finalAccessPrivileges });
        }

        // Vérifier si l'accès est limité (seulement photos sélectionnées)
        // Sur iOS, même si le statut est "granted", l'accès peut être limité
        if (finalStatus === 'granted' && (finalAccessPrivileges === 'limited' || finalAccessPrivileges === 'addOnly')) {
          showConfirm(
            language === 'fr' ? 'Accès limité détecté' : 'Limited Access Detected',
            language === 'fr' 
              ? 'L\'accès à la galerie semble limité. Pour sélectionner des vidéos, vous devez autoriser l\'accès complet à toutes les photos dans les paramètres iOS de l\'app (Réglages > [Nom de l\'app] > Photos > Toutes les photos).' 
              : 'Gallery access appears limited. To select videos, you must grant full access to all photos in iOS app settings (Settings > [App Name] > Photos > All Photos).',
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
                      setSavingMedia(true);
                      await api.uploadVenueMediaFile(user.token, venue.id, docResult.assets[0].uri, mediaType);
                      await loadVenueMedia(venue.id);
                      showSuccess(language === 'fr' ? 'Média ajouté au lieu.' : 'Media added to venue.');
                    }
                  } catch (docError) {
                    console.error('[pickMedia] Erreur DocumentPicker:', docError);
                    showError(language === 'fr' ? 'Impossible de sélectionner la vidéo' : 'Unable to select video');
                  } finally {
                    setSavingMedia(false);
                  }
                },
              },
            ]
          );
          return;
        }
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
      } else if (Platform.OS === 'android') {
        // Sur Android, demander directement
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showError(language === 'fr' ? 'Permission d\'accès à la galerie requise' : 'Gallery access permission required');
          return;
        }
      }

      // Options pour ImagePicker
      const pickerOptions = {
        mediaTypes: mediaType === 'photo' 
          ? ImagePicker.MediaTypeOptions.Images 
          : ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        allowsEditing: false,
      };

      // Ne pas utiliser quality pour les vidéos sur iOS (peut causer l'erreur 3164)
      if (mediaType === 'photo') {
        pickerOptions.quality = 0.8;
      }

      let result;
      try {
        result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      } catch (pickerError) {
        // Attraper l'erreur directement depuis launchImageLibraryAsync
        const errorMessage = pickerError.message || pickerError.toString() || '';
        console.error('[pickMedia] Erreur ImagePicker:', pickerError);
        
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
                      type: mediaType === 'video' ? 'video/*' : 'image/*',
                      copyToCacheDirectory: true,
                      multiple: false,
                    });
                    if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
                      setSavingMedia(true);
                      await api.uploadVenueMediaFile(user.token, venue.id, docResult.assets[0].uri, mediaType);
                      await loadVenueMedia(venue.id);
                      showSuccess(language === 'fr' ? 'Média ajouté au lieu.' : 'Media added to venue.');
                    }
                  } catch (docError) {
                    console.error('[pickMedia] Erreur DocumentPicker:', docError);
                    showError(language === 'fr' ? 'Impossible de sélectionner le média' : 'Unable to select media');
                  } finally {
                    setSavingMedia(false);
                  }
                },
              },
            ]
          );
          return;
        }
        // Si ce n'est pas l'erreur 3164, relancer l'erreur pour qu'elle soit gérée par le catch externe
        throw pickerError;
      }

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        return;
      }

      setSavingMedia(true);
      await api.uploadVenueMediaFile(user.token, venue.id, asset.uri, mediaType);
      await loadVenueMedia(venue.id);
      showSuccess(language === 'fr' ? 'Média ajouté au lieu.' : 'Media added to venue.');
    } catch (error) {
      console.error('Erreur upload média lieu:', error);
      
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
                    setSavingMedia(true);
                    await api.uploadVenueMediaFile(user.token, venue.id, docResult.assets[0].uri, mediaType);
                    await loadVenueMedia(venue.id);
                    showSuccess(language === 'fr' ? 'Média ajouté au lieu.' : 'Media added to venue.');
                  }
                } catch (docError) {
                  console.error('[pickMedia] Erreur DocumentPicker:', docError);
                  showError(language === 'fr' ? 'Impossible de sélectionner la vidéo' : 'Unable to select video');
                } finally {
                  setSavingMedia(false);
                }
              },
            },
          ]
        );
      } else {
        showError(language === 'fr' ? 'Impossible d\'ajouter le média.' : 'Unable to add media.');
      }
    } finally {
      setSavingMedia(false);
    }
  };

  const handleDeleteMedia = async (media) => {
    if (!user?.token || !venue) return;
    showConfirm(
      language === 'fr' ? 'Supprimer le média' : 'Delete media',
      language === 'fr' ? 'Confirmer la suppression de ce média ?' : 'Confirm deletion of this media?',
      [
        { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: language === 'fr' ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingMediaId(media.id);
              const resp = await api.deleteVenueMedia(user.token, venue.id, media.id);
              if (resp?.success) {
                setPhotos((p) => p.filter((m) => m.id !== media.id));
                setVideos((v) => v.filter((m) => m.id !== media.id));
                showSuccess(language === 'fr' ? 'Média supprimé.' : 'Media deleted.');
              } else {
                showError(resp?.message || (language === 'fr' ? 'Suppression impossible' : 'Delete failed'));
              }
            } catch (err) {
              console.error('Erreur suppression média:', err);
              showError(language === 'fr' ? 'Suppression impossible.' : 'Delete failed.');
            } finally {
              setDeletingMediaId(null);
            }
          },
        },
      ]
    );
  };

  const renderRatings = () => {
    if (!ratings) {
      return (
        <Text style={styles.comingSoon}>
          {language === 'fr' ? 'Aucune note pour le moment.' : 'No ratings yet.'}
        </Text>
      );
    }

    return (
      <View style={styles.ratingCard}>
        <Text style={styles.sectionSubtitle}>{language === 'fr' ? 'Moyennes' : 'Averages'}</Text>
        <View style={styles.ratingRow}>
          <StarRating rating={ratings.averageRatingGlobal ?? 0} size={20} showStars={false} />
          <Text style={styles.ratingValue}>{(ratings.averageRatingGlobal ?? 0).toFixed(1)} / 5</Text>
        </View>
        <Text style={styles.ratingDetail}>
          {language === 'fr' ? 'Communauté' : 'Community'}: {(ratings.averageRatingCommunity ?? 0).toFixed(1)} · {language === 'fr' ? 'Organisateurs' : 'Organizers'}: {(ratings.averageRatingBooker ?? 0).toFixed(1)} · DJs: {(ratings.averageRatingDj ?? 0).toFixed(1)}
        </Text>

        {ratings.allRatings?.length ? (
          <View style={styles.reviewsList}>
            {ratings.allRatings.map((r) => (
              <View key={r.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewRating}>★ {r.rating.toFixed(1)}</Text>
                  <Text style={styles.reviewMeta}>
                    {r.eventTitle ? `${r.eventTitle} · ` : ''}{new Date(r.eventDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                  </Text>
                </View>
                {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.comingSoon}>
            {language === 'fr' ? 'Pas encore d\'avis détaillés.' : 'No detailed reviews yet.'}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderScreen}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{language === 'fr' ? 'Chargement...' : 'Loading...'}</Text>
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={styles.loaderScreen}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>
          {language === 'fr'
            ? 'Aucun lieu associé à ce compte. Créez-en un depuis la page d’inscription lieu.'
            : 'No venue linked to this account. Please create one from venue registration.'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
      <View style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {language === 'fr' ? 'Dashboard Lieu' : 'Venue Dashboard'}
          </Text>
          <View style={{ width: 44 }} />
        </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {[
          { id: 'infos', label: language === 'fr' ? 'Infos' : 'Info' },
          { id: 'medias', label: language === 'fr' ? 'Médias' : 'Media' },
          { id: 'avis', label: language === 'fr' ? 'Avis & Notes' : 'Reviews' },
          { id: 'bookings', label: language === 'fr' ? 'Réservations' : 'Bookings' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text
              style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }}>
        {activeTab === 'infos' && (
          <View style={styles.card}>
            <Text style={styles.venueName}>{venue.venueName}</Text>
            <Text style={styles.venueAddress}>📍 {venue.address}</Text>
            {ratings ? (
              <View style={styles.ratingRow}>
                <StarRating rating={ratings.averageRatingGlobal ?? 0} size={20} showStars={false} />
                <Text style={styles.ratingValue}>{(ratings.averageRatingGlobal ?? 0).toFixed(1)} / 5</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigate('venueProfile', { venueId: venue.id })}
            >
              <Text style={styles.profileButtonText}>
                {language === 'fr' ? 'Voir le profil public' : 'View public profile'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'medias' && (
          <View style={styles.card}>
            <View style={styles.mediaHeader}>
              <Text style={styles.sectionTitle}>{language === 'fr' ? 'Médias du lieu' : 'Venue media'}</Text>
              <View style={styles.mediaActions}>
                <TouchableOpacity
                  style={styles.addFileButton}
                  onPress={() => pickMedia('photo')}
                  disabled={savingMedia}
                >
                  <Text style={styles.addFileButtonText}>{language === 'fr' ? '+ Photo' : '+ Photo'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addFileButton, styles.addFileButtonSecondary]}
                  onPress={() => pickMedia('video')}
                  disabled={savingMedia}
                >
                  <Text style={styles.addFileButtonText}>{language === 'fr' ? '+ Vidéo' : '+ Video'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Photos */}
            <Text style={styles.sectionSubtitle}>{language === 'fr' ? 'Photos' : 'Photos'}</Text>
            <Text style={styles.mediaHint}>
              {language === 'fr' ? 'Taille max ~100 Mo par média' : 'Max size ~100 MB per media'}
            </Text>
            {photos.length > 0 ? (
              <View style={styles.photoGrid}>
                {photos.map((photo) => (
                  <View key={photo.id} style={styles.photoWrapper}>
                    <Image
                      source={{ uri: photo.url }}
                      style={styles.photoItem}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.deleteBadge}
                      onPress={() => handleDeleteMedia(photo)}
                      disabled={deletingMediaId === photo.id}
                    >
                      {deletingMediaId === photo.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.deleteBadgeText}>✕</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noMedia}>{language === 'fr' ? 'Aucune photo' : 'No photos yet'}</Text>
            )}

            {/* Vidéos */}
            <Text style={styles.sectionSubtitle}>{language === 'fr' ? 'Vidéos' : 'Videos'}</Text>
            <Text style={styles.mediaHint}>
              {language === 'fr' ? 'Taille max ~100 Mo par média' : 'Max size ~100 MB per media'}
            </Text>
            {videos.length > 0 ? (
              <View style={{ gap: 12 }}>
                {videos.map((video) => (
                  <View key={video.id} style={styles.videoItem}>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedVideo(video);
                        setVideoModalVisible(true);
                      }}
                    >
                      <View style={styles.videoPlaceholder}>
                        <Text style={styles.playIcon}>▶</Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.videoRow}>
                      {video.title ? <Text style={styles.videoTitle}>{video.title}</Text> : <View />}
                      <TouchableOpacity
                        style={styles.deleteBadgeSmall}
                        onPress={() => handleDeleteMedia(video)}
                        disabled={deletingMediaId === video.id}
                      >
                        {deletingMediaId === video.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.deleteBadgeText}>✕</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noMedia}>{language === 'fr' ? 'Aucune vidéo' : 'No videos yet'}</Text>
            )}
          </View>
        )}

        {activeTab === 'avis' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{language === 'fr' ? 'Avis & Notes' : 'Reviews & Ratings'}</Text>
            {renderRatings()}
          </View>
        )}

        {activeTab === 'bookings' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{language === 'fr' ? 'Réservations' : 'Bookings'}</Text>
            {loadingBookings ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>{language === 'fr' ? 'Chargement...' : 'Loading...'}</Text>
              </View>
            ) : bookings.length === 0 ? (
              <Text style={styles.comingSoon}>
                {language === 'fr' ? 'Aucune réservation pour le moment.' : 'No bookings yet.'}
              </Text>
            ) : (
              <>
                {(() => {
                  const pendingInvitations = bookings.filter((b) => b.invitationStatus === 'PENDING');
                  const acceptedBookings = bookings.filter((b) => b.invitationStatus === 'ACCEPTED');
                  const renderBookingCard = (booking, showAcceptReject = false) => {
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
                      <View key={booking.id} style={[styles.bookingCard, showAcceptReject && { borderColor: 'rgba(255,165,0,0.4)' }]}>
                        <View style={styles.bookingHeader}>
                          <Text style={styles.bookingTitle} numberOfLines={2}>
                            {booking.eventTitle}
                          </Text>
                          <View style={[styles.bookingStatus, { backgroundColor: (statusColors[booking.eventStatus] || Colors.primary) + '20' }]}>
                            <Text style={[styles.bookingStatusText, { color: statusColors[booking.eventStatus] || Colors.primary }]}>
                              {showAcceptReject ? (language === 'fr' ? 'En attente' : 'Pending') : (statusLabels[booking.eventStatus] || booking.eventStatus)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.bookingInfo}>
                          <Text style={styles.bookingInfoLabel}>📅 {language === 'fr' ? 'Date' : 'Date'}</Text>
                          <Text style={styles.bookingInfoValue}>
                            {formattedDate} {booking.eventTime && `à ${booking.eventTime}`}
                          </Text>
                        </View>
                        {booking.booker && (
                          <View style={styles.bookingInfo}>
                            <Text style={styles.bookingInfoLabel}>👤 {language === 'fr' ? 'Organisateur' : 'Organizer'}</Text>
                            <Text style={styles.bookingInfoValue}>
                              {booking.booker.name} ({booking.booker.type})
                            </Text>
                          </View>
                        )}
                        <View style={styles.bookingInfo}>
                          <Text style={styles.bookingInfoLabel}>📍 {language === 'fr' ? 'Adresse' : 'Address'}</Text>
                          <Text style={styles.bookingInfoValue}>{booking.eventLocation || '-'}</Text>
                        </View>
                        {showAcceptReject ? (
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                            <TouchableOpacity
                              style={[styles.chatButton, { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }]}
                              onPress={() => openVenueChat(booking.eventVenueId)}
                            >
                              <Text style={styles.chatButtonText}>💬 {language === 'fr' ? 'Chat' : 'Chat'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.chatButton, { flex: 1, backgroundColor: '#EF4444' }]}
                              onPress={() => handleRejectVenueInvitation(booking.eventVenueId)}
                              disabled={processingInvitation === booking.eventVenueId}
                            >
                              {processingInvitation === booking.eventVenueId ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={styles.chatButtonText}>✕ {language === 'fr' ? 'Refuser' : 'Reject'}</Text>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.chatButton, { flex: 1, backgroundColor: '#4CAF50' }]}
                              onPress={() => handleAcceptVenueInvitation(booking.eventVenueId)}
                              disabled={processingInvitation === booking.eventVenueId}
                            >
                              {processingInvitation === booking.eventVenueId ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={styles.chatButtonText}>✓ {language === 'fr' ? 'Accepter' : 'Accept'}</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.bookingActionsRow}>
                            <TouchableOpacity
                              style={[styles.chatButton, styles.bookingActionPrimary, { flex: 1 }]}
                              onPress={() => openVenueChat(booking.eventVenueId)}
                            >
                              <Text style={styles.chatButtonText}>
                                💬 {language === 'fr' ? 'Chat' : 'Chat'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.bookingActionDestructive, { flex: 1 }]}
                              onPress={() => handleCancelVenueBooking(booking.eventVenueId)}
                              disabled={processingInvitation === booking.eventVenueId}
                            >
                              {processingInvitation === booking.eventVenueId ? (
                                <ActivityIndicator size="small" color="#FF5252" />
                              ) : (
                                <Text style={styles.bookingActionDestructiveText}>
                                  ✕ {language === 'fr' ? 'Annuler' : 'Cancel'}
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  };
                  return (
                    <View style={styles.bookingsList}>
                      {pendingInvitations.length > 0 && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={[styles.sectionTitle, { fontSize: 15, marginBottom: 10 }]}>
                            📩 {language === 'fr' ? 'Invitations en attente' : 'Pending invitations'}
                          </Text>
                          {pendingInvitations.map((b) => renderBookingCard(b, true))}
                        </View>
                      )}
                      {acceptedBookings.length > 0 && (
                        <View>
                          <Text style={[styles.sectionTitle, { fontSize: 15, marginBottom: 10 }]}>
                            ✅ {language === 'fr' ? 'Réservations confirmées' : 'Confirmed bookings'}
                          </Text>
                          {acceptedBookings.map((b) => renderBookingCard(b, false))}
                        </View>
                      )}
                    </View>
                  );
                })()}
              </>
            )}
          </View>
        )}
      </ScrollView>
      <VideoPlayer
        videoUrl={selectedVideo?.url}
        title={selectedVideo?.title}
        visible={videoModalVisible}
        onClose={() => setVideoModalVisible(false)}
      />

      {/* Modal de chat Organisateur ↔ Lieu */}
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
          setSelectedChatEventVenueId(null);
          setChatMessages([]);
          setNewMessageText('');
          setContractEditorVisible(false);
          setShowPaymentTermsModal(false);
          setShowDealTypeModal(false);
          setShowCancellationModal(false);
          setShowEventEndModal(false);
          refreshUnreadCount?.();
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
              <View style={styles.chatHeaderContainer}>
                <View style={styles.chatHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      reopenChatAfterContractRef.current = false;
                      flushPendingContractEditor();
                      setChatModalVisible(false);
                      setSelectedChatEventVenueId(null);
                      setChatMessages([]);
                      setNewMessageText('');
                      setContractEditorVisible(false);
                      setShowPaymentTermsModal(false);
                      setShowDealTypeModal(false);
                      setShowCancellationModal(false);
                      setShowEventEndModal(false);
                      refreshUnreadCount?.();
                    }}
                    style={styles.chatCloseButton}
                  >
                    <Text style={styles.chatCloseButtonText}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.chatHeaderTitle}>
                    {language === 'fr' ? 'Chat avec l\'organisateur' : 'Chat with organizer'}
                  </Text>
                  <View style={{ width: 40 }} />
                </View>
              </View>

              {/* Contrat Organisateur ↔ Lieu */}
              {selectedChatEventVenueId ? (
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
                      🧾 {language === 'fr' ? 'Contrat lieu' : 'Venue contract'}
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
                  {contractData?.payload?.dealType ? (
                    <Text style={styles.contractSmall} numberOfLines={2}>
                      📋 {dealTypeLabel(contractData.payload.dealType, language)}
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
                  </View>
                </TouchableOpacity>
                  {contractData?.status === 'SENT' && contractData?.sentBy === 'BOOKER' ? (
                    <TouchableOpacity
                      style={[styles.contractButton, styles.contractButtonSecondary, styles.contractPdfPreviewBtn]}
                      onPress={() =>
                        openContractPdfPreview({
                          previewPayload: buildVenueContractPayload(contractDraft),
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
                              !contractAcceptAck && { opacity: 0.45 },
                            ]}
                            onPress={() =>
                              openContractPdfPreview({
                                previewPayload: buildVenueContractPayload(contractDraft),
                                pendingAction: 'accept',
                              })
                            }
                            disabled={!contractAcceptAck}
                          >
                            <Text style={styles.contractButtonTextDark}>
                              {language === 'fr' ? 'Accepter' : 'Accept'}
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <Text style={styles.contractHint}>
                          {language === 'fr' ? 'En attente de la réponse de l\'organisateur.' : 'Waiting for organizer response.'}
                        </Text>
                      )
                    ) : contractData?.status === 'SIGNED' ? (
                      <Text style={styles.contractHint}>
                        {language === 'fr' ? '✅ Contrat accepté.' : '✅ Contract accepted.'}
                      </Text>
                    ) : (
                      <Text style={styles.contractHint}>
                        {language === 'fr' ? 'En attente de l\'organisateur.' : 'Waiting for organizer.'}
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
                        {language === 'fr' ? 'Aucun message. Commencez la conversation !' : 'No messages yet. Start the conversation!'}
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
                              ? (language === 'fr' ? 'message supprimé' : 'message deleted')
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
                      </View>
                    ))
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                value={newMessageText}
                onChangeText={setNewMessageText}
                placeholder={language === 'fr' ? 'Tapez votre message...' : 'Type your message...'}
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                maxLength={500}
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
                  mode="venue"
                  draft={contractDraft}
                  setDraft={setContractDraft}
                  language={language}
                  styles={styles}
                  PAYMENT_TERMS_OPTIONS={PAYMENT_TERMS_OPTIONS}
                  setShowPaymentTermsModal={setShowPaymentTermsModalForContract}
                  setShowDealTypeModal={setShowDealTypeModalForContract}
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
                        previewPayload: buildVenueContractPayload(contractDraft),
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
              >
                <Text style={styles.contractModalTitle}>
                  {language === 'fr' ? 'Contre-proposition' : 'Counter-proposal'}
                </Text>
                <ContractDraftEditorFields
                  mode="venue"
                  draft={contractDraft}
                  setDraft={setContractDraft}
                  language={language}
                  styles={styles}
                  PAYMENT_TERMS_OPTIONS={PAYMENT_TERMS_OPTIONS}
                  setShowPaymentTermsModal={setShowPaymentTermsModalForContract}
                  setShowDealTypeModal={setShowDealTypeModalForContract}
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
                        previewPayload: buildVenueContractPayload(contractDraft),
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

      <DealTypePickerModal
        visible={showDealTypeModal}
        onClose={() => setShowDealTypeModal(false)}
        value={contractDraft.dealType}
        onSelect={(v) => setContractDraft((p) => ({ ...p, dealType: v }))}
        language={language}
        styles={styles}
      />

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
          setRejectModalEventVenueId(null);
        }}
        onConfirm={handleRejectVenueConfirm}
        title={rejectModalAction === 'cancel' ? (language === 'fr' ? 'Annuler le booking' : 'Cancel booking') : (language === 'fr' ? 'Refuser l\'invitation' : 'Reject invitation')}
        confirmLabel={rejectModalAction === 'cancel' ? (language === 'fr' ? 'Annuler' : 'Cancel') : (language === 'fr' ? 'Refuser' : 'Reject')}
        language={language}
        loading={processingInvitation === rejectModalEventVenueId}
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
    backgroundColor: '#0b0b0e',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  menuButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.35)',
    backgroundColor: 'rgba(11,11,14,0.65)',
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsScroll: {
    marginHorizontal: 20,
    marginBottom: 12,
    maxHeight: 52,
  },
  tabsContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: 'rgba(255,23,68,0.18)',
    borderRadius: 8,
  },
  tabText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  venueName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  venueAddress: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ratingValue: {
    color: '#fff',
    fontWeight: '700',
  },
  profileButton: {
    marginTop: 8,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  profileButtonText: {
    color: '#0b0b0e',
    fontWeight: '700',
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  mediaHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
  },
  mediaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addFileButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addFileButtonSecondary: {
    backgroundColor: '#444',
  },
  addFileButtonText: {
    color: '#0b0b0e',
    fontWeight: '700',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoItem: {
    width: (width - 60) / 2,
    height: 160,
    borderRadius: 10,
    backgroundColor: '#111',
  },
  videoItem: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111',
    padding: 8,
  },
  videoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  videoPlaceholder: {
    height: 180,
    borderRadius: 8,
    backgroundColor: '#0d0d11',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: Colors.primary,
    fontSize: 32,
    fontWeight: '800',
  },
  videoTitle: {
    color: '#fff',
    padding: 8,
    fontWeight: '600',
  },
  deleteBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteBadgeSmall: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  deleteBadgeText: {
    color: '#fff',
    fontWeight: '800',
  },
  noMedia: {
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
  },
  comingSoon: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  ratingCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ratingDetail: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  reviewsList: {
    marginTop: 10,
    gap: 10,
  },
  reviewItem: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewRating: {
    color: Colors.primary,
    fontWeight: '800',
  },
  reviewMeta: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  reviewComment: {
    color: '#fff',
  },
  loaderScreen: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  // Bookings
  bookingsList: { gap: 12 },
  bookingCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.25)',
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  bookingTitle: { color: '#fff', fontSize: 16, fontWeight: '800', flex: 1, minWidth: 0, paddingRight: 8 },
  bookingStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  bookingStatusText: { fontSize: 12, fontWeight: '700' },
  bookingInfo: { marginBottom: 6 },
  bookingInfoLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 2 },
  bookingInfoValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  chatButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  bookingActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'stretch' },
  bookingActionPrimary: { justifyContent: 'center' },
  bookingActionDestructive: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255,82,82,0.9)',
  },
  bookingActionDestructiveText: { color: '#FF8A80', fontWeight: '800', fontSize: 14 },
  chatButtonText: { color: '#0b0b0e', fontWeight: '800', fontSize: 14 },
  // Chat modal
  chatModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  chatModalContent: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    marginTop: Platform.OS === 'ios' ? 50 : 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '100%',
  },
  chatHeaderContainer: { zIndex: 10 },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(26,26,31,0.95)',
  },
  chatCloseButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  chatCloseButtonText: { color: '#fff', fontSize: 24, fontWeight: '300' },
  chatHeaderTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
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
  contractTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  contractTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  contractStatus: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  contractMeta: { marginTop: 6, color: '#fff', fontSize: 12, fontWeight: '700' },
  contractLine: { marginTop: 6, color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  contractLineStrong: { color: '#fff', fontWeight: '900' },
  contractSmall: { marginTop: 4, color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  contractActionsRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },
  contractPdfPreviewBtn: { alignSelf: 'stretch', marginTop: 8, marginBottom: 2 },
  contractHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },
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
    color: 'rgba(255,255,255,0.88)',
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
  contractButtonPrimary: { backgroundColor: Colors.primary },
  contractButtonSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  contractButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  contractButtonTextDark: { color: '#0b0b0e', fontSize: 12, fontWeight: '900' },
  chatLoadingContainer: { padding: 40, alignItems: 'center' },
  chatMessagesContainer: { padding: 16, paddingBottom: 20 },
  chatEmptyState: { padding: 30, alignItems: 'center' },
  chatEmptyStateText: { color: 'rgba(255,255,255,0.6)', fontSize: 14,
    textAlign: 'center' },
  chatMessage: { marginBottom: 10 },
  chatMessageOwn: { alignItems: 'flex-end' },
  chatMessageOther: { alignItems: 'flex-start' },
  chatMessageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  chatMessageBubbleOwn: {
    backgroundColor: 'rgba(255,23,68,0.25)',
    borderColor: 'rgba(255,23,68,0.4)',
  },
  chatMessageBubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chatMessageBubbleDeleted: { opacity: 0.6 },
  chatMessageText: { fontSize: 15 },
  chatMessageTextOwn: { color: '#fff' },
  chatMessageTextOther: { color: '#fff' },
  chatMessageTextDeleted: { color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' },
  chatMessageTime: { fontSize: 11, marginTop: 4 },
  chatMessageTimeOwn: { color: 'rgba(255,255,255,0.6)' },
  chatMessageTimeOther: { color: 'rgba(255,255,255,0.5)' },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(26,26,31,0.95)',
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
  },
  chatSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendButtonDisabled: { opacity: 0.5 },
  chatSendButtonText: { color: '#0b0b0e', fontSize: 18, fontWeight: '800' },
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
    backgroundColor: '#0b0b0e',
  },
  contractModalTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 10 },
  contractModalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  contractModalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
    fontSize: 13,
  },
  contractModalDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contractModalInputText: { color: '#fff', fontSize: 13, flex: 1 },
  contractModalChevron: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginLeft: 8 },
  contractModalActions: { flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'flex-end' },
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
  paymentTermOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  paymentTermOptionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  paymentTermsOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentTermsOptionSelected: { backgroundColor: 'rgba(255,23,68,0.12)' },
  paymentTermsOptionText: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  paymentTermsOptionTextSelected: { color: '#FF1744' },
  paymentTermsCheck: { color: '#FF1744', fontSize: 16, fontWeight: '800' },
  paymentTermsClose: { marginTop: 12, padding: 12, alignItems: 'center' },
});
