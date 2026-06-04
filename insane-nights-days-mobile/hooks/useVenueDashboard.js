import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Platform, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { api, normalizeMediaUrl } from '../api/config';
import { useChatPoll } from './useChatPoll';
import {
  draftFromPayload,
  buildVenueContractPayload,
  buildEventEndTimeOptions,
  formatEventWindowHint,
} from '../constants/contractPayload';
import { PAYMENT_TERMS_OPTIONS } from '../utils/venueDashboardUtils';

export function useVenueDashboard({
  user, language, routeParams, navigate, goBack, showError, showSuccess, showConfirm,
  refreshUnreadCount, markAllAsRead,
}) {
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
  
    const loadChatMessages = async (eventVenueId, options = {}) => {
      const silent = options.silent === true;
      if (!user?.token || !eventVenueId) return;
      if (!silent) setLoadingChatMessages(true);
      try {
        const response = await api.getVenueMessages(user.token, eventVenueId);
        if (response?.success && Array.isArray(response.messages)) {
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
              chatScrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      } catch (e) {
        console.error('[VenueDashboard] loadChatMessages error:', e);
      } finally {
        if (!silent) setLoadingChatMessages(false);
      }
    };
  
    const pollVenueChatRef = useRef(() => {});
    pollVenueChatRef.current = () => {
      if (!user?.token || !chatModalVisible || !selectedChatEventVenueId) return;
      loadChatMessages(selectedChatEventVenueId, { silent: true });
    };
    useChatPoll({
      active: chatModalVisible && !!user?.token && !!selectedChatEventVenueId,
      pollRef: pollVenueChatRef,
    });
  
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
  
  return {
    loading, venue, ratings, photos, videos, videoModalVisible, setVideoModalVisible,
    selectedVideo, setSelectedVideo, savingMedia, activeTab, setActiveTab, bookings,
    loadingBookings, processingInvitation, rejectModalVisible, setRejectModalVisible,
    rejectModalEventVenueId, setRejectModalEventVenueId, rejectModalAction, setRejectModalAction,
    chatModalVisible, setChatModalVisible, selectedChatEventVenueId, setSelectedChatEventVenueId,
    chatMessages, loadingChatMessages, sendingMessage, newMessageText, setNewMessageText,
    chatScrollViewRef, contractLoading, contractData, contractDraft, setContractDraft,
    contractEditorVisible, setContractEditorVisible, showPaymentTermsModal, setShowPaymentTermsModal,
    showCancellationModal, setShowCancellationModal, showEventEndModal, setShowEventEndModal,
    showDealTypeModal, setShowDealTypeModal, contractAcceptAck, setContractAcceptAck,
    contractPdfPreview, flushPendingContractEditor, closeContractEditorSession,
    openContractEditorFromChat, setShowPaymentTermsModalForContract, setShowDealTypeModalForContract,
    setShowCancellationModalForContract, setShowEventEndModalForContract,
    contractEventEndOptions, contractEventWindowHint, pickMedia, handleDeleteMedia,
    deletingMediaId, openVenueChat, sendMessage, handleDeleteMessage, openContractPdfPreview,
    closeContractPdfPreview, confirmContractPdfPreview, handleAcceptVenueInvitation,
    handleRejectVenueInvitation, handleCancelVenueBooking, handleRejectVenueConfirm,
    fetchBookings, PAYMENT_TERMS_OPTIONS, buildVenueContractPayload, navigate, goBack,
    reopenChatAfterContractRef, pendingOpenContractEditorRef, openContractEditorFallbackTimerRef,
  };
}
