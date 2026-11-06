import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../api/config';
import { useChatPoll } from './useChatPoll';
import {
  draftFromPayload,
  buildDjContractPayload,
  buildEventEndTimeOptions,
  formatEventWindowHint,
} from '../constants/contractPayload';

/**
 * Chat privé + contrat (dashboard prestataire).
 */
export function usePrestataireMessaging({ user, language, routeParams }) {
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedEpId, setSelectedEpId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const chatScrollRef = useRef(null);

  const [contractLoading, setContractLoading] = useState(false);
  const [contractData, setContractData] = useState(null);
  const [contractBooking, setContractBooking] = useState(null);
  const [contractDraft, setContractDraft] = useState(() => draftFromPayload({}, 'dj'));
  const [contractEditorVisible, setContractEditorVisible] = useState(false);

  const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showEventEndModal, setShowEventEndModal] = useState(false);

  const contractEventEndOptions = useMemo(
    () => buildEventEndTimeOptions(contractBooking?.eventTime, contractBooking?.durationHours, 30),
    [contractBooking?.eventTime, contractBooking?.durationHours]
  );
  const contractEventWindowHint = useMemo(
    () => formatEventWindowHint(contractBooking?.eventTime, contractBooking?.durationHours, language),
    [contractBooking?.eventTime, contractBooking?.durationHours, language]
  );

  const loadChatMessages = async (eventPrestataireId, options = {}) => {
    const silent = options.silent === true;
    if (!user?.token || !eventPrestataireId) return;
    if (!silent) setLoadingChat(true);
    try {
      const res = await api.getPrestataireMessages(user.token, eventPrestataireId);
      if (res?.success && Array.isArray(res.messages)) {
        setChatMessages(res.messages);
        if (!silent) {
          setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 80);
        }
      }
    } catch (e) {
      console.error('[PrestataireDashboard] loadChatMessages', e);
    } finally {
      if (!silent) setLoadingChat(false);
    }
  };

  const pollRef = useRef(() => {});
  pollRef.current = () => {
    if (!chatModalVisible || !selectedEpId || !user?.token) return;
    loadChatMessages(selectedEpId, { silent: true });
  };
  useChatPoll({ active: chatModalVisible && !!user?.token && !!selectedEpId, pollRef });

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
      }
    } catch (e) {
      console.error('[PrestataireDashboard] loadPrestataireContract', e);
    } finally {
      setContractLoading(false);
    }
  };

  const openChat = async (eventPrestataireId) => {
    setSelectedEpId(eventPrestataireId);
    setChatModalVisible(true);
    setChatMessages([]);
    await loadChatMessages(eventPrestataireId);
    await api.markAllMessagesAsRead(user.token).catch(() => {});
    await loadPrestataireContract(eventPrestataireId);
  };

  useEffect(() => {
    if (!user?.token) return;
    const id = routeParams?.openChatEventPrestataireId;
    if (id) openChat(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, routeParams?.openChatEventPrestataireId]);

  const sendMessage = async () => {
    if (!user?.token || !newMessageText.trim() || sendingMessage || !selectedEpId) return;
    const t = newMessageText.trim();
    setNewMessageText('');
    setSendingMessage(true);
    try {
      const res = await api.sendPrestataireMessage(user.token, selectedEpId, t);
      if (res?.success) await loadChatMessages(selectedEpId);
    } catch (e) {
      console.error('[PrestataireDashboard] sendMessage', e);
    } finally {
      setSendingMessage(false);
    }
  };

  const acceptContract = async () => {
    if (!user?.token || !selectedEpId) return;
    try {
      const res = await api.acceptPrestataireContract(user.token, selectedEpId);
      if (res?.success) await loadPrestataireContract(selectedEpId);
    } catch (e) {
      console.error('[PrestataireDashboard] acceptContract', e);
    }
  };

  const counterContract = async () => {
    if (!user?.token || !selectedEpId) return;
    try {
      const payload = buildDjContractPayload(contractDraft);
      const res = await api.counterPrestataireContract(user.token, selectedEpId, payload);
      if (res?.success) {
        setContractEditorVisible(false);
        await loadPrestataireContract(selectedEpId);
      }
    } catch (e) {
      console.error('[PrestataireDashboard] counterContract', e);
    }
  };

  const canCounter = contractData?.status === 'SENT' && contractData?.sentBy === 'BOOKER';

  return {
    chatModalVisible,
    setChatModalVisible,
    selectedEpId,
    chatMessages,
    loadingChat,
    sendingMessage,
    newMessageText,
    setNewMessageText,
    chatScrollRef,
    contractLoading,
    contractData,
    contractBooking,
    contractDraft,
    setContractDraft,
    contractEditorVisible,
    setContractEditorVisible,
    showPaymentTermsModal,
    setShowPaymentTermsModal,
    showCancellationModal,
    setShowCancellationModal,
    showEventEndModal,
    setShowEventEndModal,
    contractEventEndOptions,
    contractEventWindowHint,
    openChat,
    sendMessage,
    acceptContract,
    counterContract,
    canCounter,
  };
}
