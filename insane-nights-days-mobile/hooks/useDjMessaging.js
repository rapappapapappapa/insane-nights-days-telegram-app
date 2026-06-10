import { useState, useEffect, useRef, useMemo } from 'react';
import { Platform } from 'react-native';
import { api } from '../api/config';
import { useChatPoll } from './useChatPoll';
import {
  draftFromPayload,
  buildDjContractPayload,
  buildEventEndTimeOptions,
  formatEventWindowHint,
} from '../constants/contractPayload';

/**
 * Chat privé/groupe + contrats (dashboard DJ).
 */
export function useDjMessaging({
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
  
  
    useEffect(() => {
      setContractAcceptAck(false);
    }, [selectedChatEventDjId, contractData?.id, contractData?.status, contractData?.sentBy]);
  
  
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
          showSuccess(
            res?.contract?.status === 'PENDING_SIGNATURE'
              ? (language === 'fr'
                  ? 'Contrat accepté — signature électronique envoyée par email.'
                  : 'Contract accepted — e-signature sent by email.')
              : (language === 'fr' ? 'Contrat accepté.' : 'Contract accepted.')
          );
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
  

  return {
    chatModalVisible,
    setChatModalVisible,
    selectedChatEventDjId,
    setSelectedChatEventDjId,
    selectedChatEventId,
    setSelectedChatEventId,
    isGroupChat,
    setIsGroupChat,
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
    showPaymentTermsModal,
    setShowPaymentTermsModal,
    showCancellationModal,
    setShowCancellationModal,
    showEventEndModal,
    setShowEventEndModal,
    contractPdfPreview,
    reopenChatAfterContractRef,
    pendingOpenContractEditorRef,
    openContractEditorFallbackTimerRef,
    flushPendingContractEditor,
    closeContractEditorSession,
    openContractEditorFromChat,
    setShowPaymentTermsModalForContract,
    setShowCancellationModalForContract,
    setShowEventEndModalForContract,
    openChat,
    openGroupChat,
    openContractPdfPreview,
    closeContractPdfPreview,
    confirmContractPdfPreview,
    sendMessage,
    handleDeleteMessage,
    contractEventEndOptions,
    contractEventWindowHint,
    djVenueGateBlocks,
  };
}
