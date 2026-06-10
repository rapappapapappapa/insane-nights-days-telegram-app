import { useState, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { api } from '../api/config';
import {
  draftFromPayload,
  buildVenueContractPayload,
  buildDjContractPayload,
  buildEventEndTimeOptions,
  formatEventWindowHint,
} from '../constants/contractPayload';

/**
 * Chargement / envoi / PDF des contrats booker (DJ, lieu, prestataire).
 */
export function useBookerContractFlows({
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
  contractEditorVisible,
  setContractEditorVisible,
  closeContractEditorSession,
  reopenChatAfterContractRef,
  contractEditorWasVisibleForPdfRef,
}) {
  const [contractLoading, setContractLoading] = useState(false);
  const [contractData, setContractData] = useState(null);
  const [contractBooking, setContractBooking] = useState(null);
  const [contractDraft, setContractDraft] = useState(() => draftFromPayload({}, 'dj'));
  const [venueContractGate, setVenueContractGate] = useState(null);
  const [contractAcceptAck, setContractAcceptAck] = useState(false);
  const [contractDraftReadAck, setContractDraftReadAck] = useState(false);
  const [contractPdfPreview, setContractPdfPreview] = useState({
    visible: false,
    loading: false,
    pdfBase64: null,
    error: null,
    pendingAction: null,
  });

  const activeContractId = isVenueChat
    ? selectedChatEventVenueId
    : isPrestataireChat
      ? selectedChatEventPrestataireId
      : selectedChatEventDjId;

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

  const reloadActiveContract = async () => {
    if (isVenueChat && selectedChatEventVenueId) await loadVenueContract(selectedChatEventVenueId);
    else if (isPrestataireChat && selectedChatEventPrestataireId) {
      await loadPrestataireContract(selectedChatEventPrestataireId);
    } else if (selectedChatEventDjId) await loadContract(selectedChatEventDjId);
  };

  const saveContractDraft = async () => {
    if (!user?.token || !activeContractId) return false;
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
        await reloadActiveContract();
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
    if (!user?.token || !activeContractId) return;
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
        await reloadActiveContract();
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d’envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('[BookerDashboard] sendContract error:', e);
      showError(language === 'fr' ? 'Erreur envoi contrat.' : 'Contract send error.');
    }
  };

  const acceptContract = async () => {
    if (!user?.token || !activeContractId) return;
    try {
      const res = isVenueChat
        ? await api.acceptVenueContract(user.token, selectedChatEventVenueId)
        : isPrestataireChat
          ? await api.acceptPrestataireContract(user.token, selectedChatEventPrestataireId)
          : await api.acceptBookingContract(user.token, selectedChatEventDjId);
      if (res?.success) {
        showSuccess(
          res?.contract?.status === 'PENDING_SIGNATURE'
            ? (language === 'fr'
                ? 'Contrat accepté — signature électronique envoyée par email.'
                : 'Contract accepted — e-signature sent by email.')
            : (language === 'fr' ? 'Contrat accepté.' : 'Contract accepted.')
        );
        await reloadActiveContract();
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d’accepter.' : 'Unable to accept.'));
      }
    } catch (e) {
      console.error('[BookerDashboard] acceptContract error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
    }
  };

  const counterContract = async () => {
    if (!user?.token || !activeContractId) return;
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
        await reloadActiveContract();
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
    if (!user?.token || !activeContractId) return;
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
          ? await api.previewVenueContractPdf(user.token, activeContractId, previewPayload)
          : isPrestataireChat
            ? await api.previewPrestataireContractPdf(user.token, activeContractId, previewPayload)
            : await api.previewBookingContractPdf(user.token, activeContractId, previewPayload);
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
    contractLoading,
    contractData,
    contractBooking,
    contractDraft,
    setContractDraft,
    venueContractGate,
    contractAcceptAck,
    setContractAcceptAck,
    contractDraftReadAck,
    setContractDraftReadAck,
    contractPdfPreview,
    loadContract,
    loadVenueContract,
    loadPrestataireContract,
    saveContractDraft,
    openContractPdfPreview,
    closeContractPdfPreview,
    confirmContractPdfPreview,
    contractEventEndOptions,
    contractEventWindowHint,
    djVenueGateBlocks,
  };
}
