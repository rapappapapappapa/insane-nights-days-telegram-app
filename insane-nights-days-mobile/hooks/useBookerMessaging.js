import { useState, useEffect, useRef, useMemo } from 'react';
import { Platform } from 'react-native';
import { api } from '../api/config';
import { useChatPoll } from './useChatPoll';
import {
  draftFromPayload,
  buildVenueContractPayload,
  buildDjContractPayload,
  buildEventEndTimeOptions,
  formatEventWindowHint,
} from '../constants/contractPayload';

/**
 * Chat privé/groupe + contrats (dashboard organisateur).
 */
export function useBookerMessaging({
  user,
  language,
  showError,
  showSuccess,
  markAllAsRead,
  routeParams,
  shouldOpenBookings,
  setActiveSection,
}) {
    // Chat
    const [chatModalVisible, setChatModalVisible] = useState(false);
    const [selectedChatEventDjId, setSelectedChatEventDjId] = useState(null);
    const [selectedChatEventVenueId, setSelectedChatEventVenueId] = useState(null);
    const [selectedChatEventId, setSelectedChatEventId] = useState(null); // Pour les chats de groupe
    const [isGroupChat, setIsGroupChat] = useState(false);
    const [isVenueChat, setIsVenueChat] = useState(false);
    const [isPrestataireChat, setIsPrestataireChat] = useState(false);
    const [selectedChatEventPrestataireId, setSelectedChatEventPrestataireId] = useState(null);
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
    /** Brouillon : lecture du PDF avant envoi au DJ / lieu. */
    const [contractDraftReadAck, setContractDraftReadAck] = useState(false);
    const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);
    const [showCancellationModal, setShowCancellationModal] = useState(false);
    const [showEventEndModal, setShowEventEndModal] = useState(false);
    const [showDealTypeModal, setShowDealTypeModal] = useState(false);
    const [contractPdfPreview, setContractPdfPreview] = useState({
      visible: false,
      loading: false,
      pdfBase64: null,
      error: null,
      pendingAction: null,
    });
    /** iOS : évite deux Modal overFullScreen empilés (touches mortes sur l’éditeur). */
    const reopenChatAfterContractRef = useRef(false);
    /** iOS : ouvrir l’éditeur seulement après fermeture du chat (onDismiss + repli timeout). */
    const pendingOpenContractEditorRef = useRef(false);
    const openContractEditorFallbackTimerRef = useRef(null);
    /** Évite deux Modal visibles (éditeur + PDF) sur iOS ; réouverture si annulation PDF. */
    const contractEditorWasVisibleForPdfRef = useRef(false);
    /** Évite éditeur + modal de liste (paiement, etc.) en même temps sur iOS. */
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
  
    // Fonctions de chat
    const openChat = async (eventDjId) => {
      setSelectedChatEventDjId(eventDjId);
      setSelectedChatEventId(null);
      setIsGroupChat(false);
      setIsVenueChat(false);
      setIsPrestataireChat(false);
      setSelectedChatEventPrestataireId(null);
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
      setSelectedChatEventVenueId(null);
      setSelectedChatEventPrestataireId(null);
      setSelectedChatEventId(eventId);
      setIsGroupChat(true);
      setIsVenueChat(false);
      setIsPrestataireChat(false);
      setChatModalVisible(true);
      setChatMessages([]);
      await loadChatMessages(eventId, true);
      await markAllAsRead();
    };
  
    const openVenueChat = async (eventVenueId) => {
      setSelectedChatEventDjId(null);
      setSelectedChatEventId(null);
      setSelectedChatEventVenueId(eventVenueId);
      setSelectedChatEventPrestataireId(null);
      setIsGroupChat(false);
      setIsVenueChat(true);
      setIsPrestataireChat(false);
      setChatModalVisible(true);
      setChatMessages([]);
      await loadChatMessages(eventVenueId, false, true);
      await markAllAsRead();
      await loadVenueContract(eventVenueId);
    };
  
    const openPrestataireChat = async (eventPrestataireId) => {
      setSelectedChatEventDjId(null);
      setSelectedChatEventId(null);
      setSelectedChatEventVenueId(null);
      setSelectedChatEventPrestataireId(eventPrestataireId);
      setIsGroupChat(false);
      setIsVenueChat(false);
      setIsPrestataireChat(true);
      setChatModalVisible(true);
      setChatMessages([]);
      await loadChatMessages(eventPrestataireId, false, false, { prestataire: true });
      await markAllAsRead();
      await loadPrestataireContract(eventPrestataireId);
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
        console.error('[BookerDashboard] loadContract error:', e);
      } finally {
        setContractLoading(false);
      }
    };
  
    const saveContractDraft = async () => {
      if (!user?.token) return false;
      const id = isVenueChat ? selectedChatEventVenueId : isPrestataireChat ? selectedChatEventPrestataireId : selectedChatEventDjId;
      if (!id) return false;
      try {
        const payload = isVenueChat ? buildVenueContractPayload(contractDraft) : buildDjContractPayload(contractDraft);
        const res = isVenueChat
          ? await api.saveVenueContractDraft(user.token, selectedChatEventVenueId, payload)
          : isPrestataireChat
            ? await api.savePrestataireContractDraft(user.token, selectedChatEventPrestataireId, payload)
            : await api.saveBookingContractDraft(user.token, selectedChatEventDjId, payload);
        if (res?.success) {
          showSuccess(language === 'fr' ? 'Contrat sauvegardé.' : 'Contract saved.');
          closeContractEditorSession();
          if (isVenueChat) await loadVenueContract(selectedChatEventVenueId);
          else if (isPrestataireChat) await loadPrestataireContract(selectedChatEventPrestataireId);
          else await loadContract(selectedChatEventDjId);
          return true;
        }
        showError(res?.message || (language === 'fr' ? 'Impossible de sauvegarder.' : 'Unable to save.'));
        return false;
      } catch (e) {
        console.error('[BookerDashboard] saveContractDraft error:', e);
        showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
        return false;
      }
    };
  
    const sendContract = async () => {
      if (!user?.token) return;
      const id = isVenueChat ? selectedChatEventVenueId : isPrestataireChat ? selectedChatEventPrestataireId : selectedChatEventDjId;
      if (!id) return;
      try {
        const res = isVenueChat
          ? await api.sendVenueContract(user.token, selectedChatEventVenueId)
          : isPrestataireChat
            ? await api.sendPrestataireContract(user.token, selectedChatEventPrestataireId)
            : await api.sendBookingContract(user.token, selectedChatEventDjId);
        if (res?.success) {
          showSuccess(
            isVenueChat
              ? language === 'fr'
                ? 'Contrat envoyé au lieu.'
                : 'Contract sent to venue.'
              : isPrestataireChat
                ? language === 'fr'
                  ? 'Contrat envoyé au prestataire.'
                  : 'Contract sent to provider.'
                : language === 'fr'
                  ? 'Contrat envoyé au DJ.'
                  : 'Contract sent to DJ.'
          );
          if (isVenueChat) await loadVenueContract(selectedChatEventVenueId);
          else if (isPrestataireChat) await loadPrestataireContract(selectedChatEventPrestataireId);
          else await loadContract(selectedChatEventDjId);
        } else {
          showError(res?.message || (language === 'fr' ? 'Impossible d’envoyer.' : 'Unable to send.'));
        }
      } catch (e) {
        console.error('[BookerDashboard] sendContract error:', e);
        showError(language === 'fr' ? 'Erreur envoi contrat.' : 'Contract send error.');
      }
    };
  
    const acceptContract = async () => {
      if (!user?.token) return;
      const id = isVenueChat ? selectedChatEventVenueId : isPrestataireChat ? selectedChatEventPrestataireId : selectedChatEventDjId;
      if (!id) return;
      try {
        const res = isVenueChat
          ? await api.acceptVenueContract(user.token, selectedChatEventVenueId)
          : isPrestataireChat
            ? await api.acceptPrestataireContract(user.token, selectedChatEventPrestataireId)
            : await api.acceptBookingContract(user.token, selectedChatEventDjId);
        if (res?.success) {
          showSuccess(language === 'fr' ? 'Contrat accepté.' : 'Contract accepted.');
          if (isVenueChat) await loadVenueContract(selectedChatEventVenueId);
          else if (isPrestataireChat) await loadPrestataireContract(selectedChatEventPrestataireId);
          else await loadContract(selectedChatEventDjId);
        } else {
          showError(res?.message || (language === 'fr' ? 'Impossible d’accepter.' : 'Unable to accept.'));
        }
      } catch (e) {
        console.error('[BookerDashboard] acceptContract error:', e);
        showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
      }
    };
  
    const counterContract = async () => {
      if (!user?.token) return;
      const id = isVenueChat ? selectedChatEventVenueId : isPrestataireChat ? selectedChatEventPrestataireId : selectedChatEventDjId;
      if (!id) return;
      try {
        const payload = isVenueChat ? buildVenueContractPayload(contractDraft) : buildDjContractPayload(contractDraft);
        const res = isVenueChat
          ? await api.counterVenueContract(user.token, selectedChatEventVenueId, payload)
          : isPrestataireChat
            ? await api.counterPrestataireContract(user.token, selectedChatEventPrestataireId, payload)
            : await api.counterBookingContract(user.token, selectedChatEventDjId, payload);
        if (res?.success) {
          showSuccess(language === 'fr' ? 'Contre-proposition envoyée.' : 'Counter-proposal sent.');
          closeContractEditorSession();
          if (isVenueChat) await loadVenueContract(selectedChatEventVenueId);
          else if (isPrestataireChat) await loadPrestataireContract(selectedChatEventPrestataireId);
          else await loadContract(selectedChatEventDjId);
        } else {
          showError(res?.message || (language === 'fr' ? 'Impossible d’envoyer.' : 'Unable to send.'));
        }
      } catch (e) {
        console.error('[BookerDashboard] counterContract error:', e);
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
      const id = isVenueChat ? selectedChatEventVenueId : isPrestataireChat ? selectedChatEventPrestataireId : selectedChatEventDjId;
      if (!user?.token || !id) return;
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
          const res = isVenueChat
            ? await api.previewVenueContractPdf(user.token, id, previewPayload)
            : isPrestataireChat
              ? await api.previewPrestataireContractPdf(user.token, id, previewPayload)
              : await api.previewBookingContractPdf(user.token, id, previewPayload);
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
  
      /** iOS : chat + PDF en deux Modal overFullScreen = touches mortes / couche fantôme — fermer le chat d’abord. */
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
        if (action === 'send') {
          const ok = await saveContractDraft();
          if (ok) await sendContract();
        } else if (action === 'accept') {
          await acceptContract();
        } else if (action === 'counter') {
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
          setVenueContractGate(null);
        }
      } catch (e) {
        console.error('[BookerDashboard] loadVenueContract error:', e);
      } finally {
        setContractLoading(false);
      }
    };
  
    const loadPrestataireContract = async (eventPrestataireId) => {
      if (!user?.token || !eventPrestataireId) return;
      setContractLoading(true);
      try {
        const res = await api.getPrestataireContract(user.token, eventPrestataireId);
        if (res?.success) {
          setContractData(res.contract || null);
          setContractBooking(res.booking || null);
          const p = res.contract?.payload || {};
          setContractDraft(draftFromPayload(p, 'dj'));
          setVenueContractGate(null);
        }
      } catch (e) {
        console.error('[BookerDashboard] loadPrestataireContract error:', e);
      } finally {
        setContractLoading(false);
      }
    };
  
  
    useEffect(() => {
      setContractAcceptAck(false);
      setContractDraftReadAck(false);
    }, [
      selectedChatEventDjId,
      selectedChatEventVenueId,
      selectedChatEventPrestataireId,
      isVenueChat,
      isPrestataireChat,
      contractData?.id,
      contractData?.status,
      contractData?.sentBy,
    ]);
  
    // ✅ Ouvrir automatiquement la conversation depuis une notification (BOOKER)
    useEffect(() => {
      if (!user?.token) return;
      const type = routeParams?.openChatType;
      const eventDjId = routeParams?.openChatEventDjId;
      const eventVenueId = routeParams?.openChatEventVenueId;
      const eventPrestataireId = routeParams?.openChatEventPrestataireId;
      const eventId = routeParams?.openChatEventId;
  
      if (shouldOpenBookings) {
        setActiveSection('events');
      }
  
      if (type === 'PRIVATE' && eventDjId) {
        openChat(eventDjId);
      } else if (type === 'PRIVATE' && eventVenueId) {
        openVenueChat(eventVenueId);
      } else if (type === 'PRIVATE' && eventPrestataireId) {
        openPrestataireChat(eventPrestataireId);
      } else if (type === 'GROUP' && eventId) {
        openGroupChat(eventId);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.token, routeParams?.openChatType, routeParams?.openChatEventDjId, routeParams?.openChatEventVenueId, routeParams?.openChatEventPrestataireId, routeParams?.openChatEventId]);
  
    const loadChatMessages = async (id, isGroup = false, isVenue = false, options = {}) => {
      const silent = options.silent === true;
      const isPrestataire = options.prestataire === true;
      if (!user?.token || !id) return;
  
      if (!silent) setLoadingChatMessages(true);
      try {
        let response;
        if (isGroup) {
          response = await api.getGroupMessages(user.token, id);
        } else if (isPrestataire) {
          response = await api.getPrestataireMessages(user.token, id);
        } else if (isVenue) {
          response = await api.getVenueMessages(user.token, id);
        } else {
          response = await api.getMessages(user.token, id);
        }
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
          showError(language === 'fr' ? 'Impossible de charger les messages.' : 'Unable to load messages.');
        }
      } finally {
        if (!silent) setLoadingChatMessages(false);
      }
    };
  
    const pollBookerChatRef = useRef(() => {});
    pollBookerChatRef.current = () => {
      if (!user?.token || !chatModalVisible) return;
      const id = isGroupChat
        ? selectedChatEventId
        : isVenueChat
          ? selectedChatEventVenueId
          : isPrestataireChat
            ? selectedChatEventPrestataireId
            : selectedChatEventDjId;
      if (!id) return;
      loadChatMessages(id, isGroupChat, isVenueChat, { silent: true, prestataire: isPrestataireChat });
    };
    useChatPoll({
      active: chatModalVisible && !!user?.token,
      pollRef: pollBookerChatRef,
    });
  
    const sendMessage = async () => {
      if (!user?.token || !newMessageText.trim() || sendingMessage) return;
      if (!isGroupChat && !selectedChatEventDjId && !selectedChatEventVenueId && !selectedChatEventPrestataireId) return;
      if (isGroupChat && !selectedChatEventId) return;
      
      const messageText = newMessageText.trim();
      setNewMessageText('');
      setSendingMessage(true);
      
      try {
        let response;
        if (isGroupChat) {
          response = await api.sendGroupMessage(user.token, selectedChatEventId, messageText);
        } else if (isPrestataireChat) {
          response = await api.sendPrestataireMessage(user.token, selectedChatEventPrestataireId, messageText);
        } else if (isVenueChat) {
          response = await api.sendVenueMessage(user.token, selectedChatEventVenueId, messageText);
        } else {
          response = await api.sendMessage(user.token, selectedChatEventDjId, messageText);
        }
        if (response && response.success) {
          const id = isGroupChat
            ? selectedChatEventId
            : isVenueChat
              ? selectedChatEventVenueId
              : isPrestataireChat
                ? selectedChatEventPrestataireId
                : selectedChatEventDjId;
          await loadChatMessages(id, isGroupChat, isVenueChat, { prestataire: isPrestataireChat });
        } else {
          showError(response?.message || (language === 'fr' ? 'Impossible d\'envoyer le message.' : 'Unable to send message.'));
          setNewMessageText(messageText);
        }
      } catch (error) {
        console.error('Erreur envoi message:', error);
        showError(language === 'fr' ? 'Impossible d\'envoyer le message.' : 'Unable to send message.');
        setNewMessageText(messageText);
      } finally {
        setSendingMessage(false);
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
        showError(language === 'fr' ? 'Impossible de supprimer le message.' : 'Unable to delete message.');
      }
    };
  
    const contractEventEndOptions = useMemo(
      () => buildEventEndTimeOptions(contractBooking?.eventTime, contractBooking?.durationHours, 30),
      [contractBooking?.eventTime, contractBooking?.durationHours]
    );
    const contractEventWindowHint = useMemo(
      () => formatEventWindowHint(contractBooking?.eventTime, contractBooking?.durationHours, language),
      [contractBooking?.eventTime, contractBooking?.durationHours, language]
    );
  
    const djVenueGateBlocks =
      !isVenueChat &&
      !isPrestataireChat &&
      venueContractGate?.hasVenueOnEvent === true &&
      venueContractGate?.canFinalizeDjContract === false;

  return {
    chatModalVisible,
    setChatModalVisible,
    selectedChatEventDjId,
    setSelectedChatEventDjId,
    selectedChatEventVenueId,
    setSelectedChatEventVenueId,
    selectedChatEventId,
    setSelectedChatEventId,
    isGroupChat,
    setIsGroupChat,
    isVenueChat,
    setIsVenueChat,
    isPrestataireChat,
    setIsPrestataireChat,
    selectedChatEventPrestataireId,
    setSelectedChatEventPrestataireId,
    chatMessages,
    loadingChatMessages,
    sendingMessage,
    newMessageText,
    setNewMessageText,
    chatScrollViewRef,
    contractLoading,
    contractData,
    contractBooking,
    contractEditorVisible,
    setContractEditorVisible,
    contractDraft,
    setContractDraft,
    venueContractGate,
    contractAcceptAck,
    setContractAcceptAck,
    contractDraftReadAck,
    setContractDraftReadAck,
    showPaymentTermsModal,
    setShowPaymentTermsModal,
    showCancellationModal,
    setShowCancellationModal,
    showEventEndModal,
    setShowEventEndModal,
    showDealTypeModal,
    setShowDealTypeModal,
    contractPdfPreview,
    reopenChatAfterContractRef,
    pendingOpenContractEditorRef,
    openContractEditorFallbackTimerRef,
    flushPendingContractEditor,
    closeContractEditorSession,
    openContractEditorFromChat,
    setShowPaymentTermsModalForContract,
    setShowDealTypeModalForContract,
    setShowCancellationModalForContract,
    setShowEventEndModalForContract,
    openChat,
    openGroupChat,
    openVenueChat,
    openPrestataireChat,
    openContractPdfPreview,
    closeContractPdfPreview,
    confirmContractPdfPreview,
    saveContractDraft,
    sendMessage,
    handleDeleteMessage,
    contractEventEndOptions,
    contractEventWindowHint,
    djVenueGateBlocks,
  };
}
