import { useState, useEffect, useRef } from 'react';
import { api } from '../api/config';
import { useChatPoll } from './useChatPoll';
import { useBookerContractEditor } from './useBookerContractEditor';
import { useBookerContractFlows } from './useBookerContractFlows';

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
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedChatEventDjId, setSelectedChatEventDjId] = useState(null);
  const [selectedChatEventVenueId, setSelectedChatEventVenueId] = useState(null);
  const [selectedChatEventId, setSelectedChatEventId] = useState(null);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [isVenueChat, setIsVenueChat] = useState(false);
  const [isPrestataireChat, setIsPrestataireChat] = useState(false);
  const [selectedChatEventPrestataireId, setSelectedChatEventPrestataireId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingChatMessages, setLoadingChatMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const chatScrollViewRef = useRef(null);

  const editor = useBookerContractEditor({ chatModalVisible, setChatModalVisible });

  const flows = useBookerContractFlows({
    user,
    language,
    showError,
    showSuccess,
    chatModalVisible,
    setChatModalVisible,
    isVenueChat,
    isPrestataireChat,
    selectedChatEventDjId,
    selectedChatEventVenueId,
    selectedChatEventPrestataireId,
    contractEditorVisible: editor.contractEditorVisible,
    setContractEditorVisible: editor.setContractEditorVisible,
    closeContractEditorSession: editor.closeContractEditorSession,
    reopenChatAfterContractRef: editor.reopenChatAfterContractRef,
    contractEditorWasVisibleForPdfRef: editor.contractEditorWasVisibleForPdfRef,
  });

  const resetChatTargets = () => ({
    dj: null,
    venue: null,
    event: null,
    prestataire: null,
    group: false,
    venueFlag: false,
    prestataireFlag: false,
  });

  const openChat = async (eventDjId) => {
    const r = resetChatTargets();
    setSelectedChatEventDjId(eventDjId);
    setSelectedChatEventId(r.event);
    setIsGroupChat(r.group);
    setIsVenueChat(r.venueFlag);
    setIsPrestataireChat(r.prestataireFlag);
    setSelectedChatEventVenueId(r.venue);
    setSelectedChatEventPrestataireId(r.prestataire);
    setChatModalVisible(true);
    setChatMessages([]);
    await loadChatMessages(eventDjId, false);
    await markAllAsRead();
    await flows.loadContract(eventDjId);
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
    await flows.loadVenueContract(eventVenueId);
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
    await flows.loadPrestataireContract(eventPrestataireId);
  };

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
  }, [
    user?.token,
    routeParams?.openChatType,
    routeParams?.openChatEventDjId,
    routeParams?.openChatEventVenueId,
    routeParams?.openChatEventPrestataireId,
    routeParams?.openChatEventId,
  ]);

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
            chatScrollViewRef.current?.scrollToEnd({ animated: true });
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
    if (!isGroupChat && !selectedChatEventDjId && !selectedChatEventVenueId && !selectedChatEventPrestataireId) {
      return;
    }
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
        showError(response?.message || (language === 'fr' ? "Impossible d'envoyer le message." : 'Unable to send message.'));
        setNewMessageText(messageText);
      }
    } catch (error) {
      console.error('Erreur envoi message:', error);
      showError(language === 'fr' ? "Impossible d'envoyer le message." : 'Unable to send message.');
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
    ...editor,
    ...flows,
    openChat,
    openGroupChat,
    openVenueChat,
    openPrestataireChat,
    sendMessage,
    handleDeleteMessage,
  };
}
