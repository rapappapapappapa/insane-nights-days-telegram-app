import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { api } from '../api/config';
import {
  draftFromPayload,
  buildVenueContractPayload,
  buildEventEndTimeOptions,
  formatEventWindowHint,
} from '../constants/contractPayload';

/**
 * Contrat lieu ↔ orga dans le chat NOX (extrait de useVenueDashboard).
 */
export function useVenueBookingContract({
  eventVenueId,
  token,
  language,
  showError,
  showSuccess,
}) {
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

  const contractEditorWasVisibleForPdfRef = useRef(false);
  const contractEditorWasHiddenForChildModalRef = useRef(false);
  const iosPickerOpeningRef = useRef(false);

  const closeContractEditorSession = useCallback(() => {
    contractEditorWasHiddenForChildModalRef.current = false;
    iosPickerOpeningRef.current = false;
    setContractEditorVisible(false);
    setShowPaymentTermsModal(false);
    setShowDealTypeModal(false);
    setShowCancellationModal(false);
    setShowEventEndModal(false);
  }, []);

  const liftContractEditorForIosPicker = useCallback((openPicker) => {
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
  }, [contractEditorVisible]);

  const setShowPaymentTermsModalForContract = useCallback((v) => {
    if (!v) return setShowPaymentTermsModal(false);
    liftContractEditorForIosPicker(() => setShowPaymentTermsModal(true));
  }, [liftContractEditorForIosPicker]);

  const setShowDealTypeModalForContract = useCallback((v) => {
    if (!v) return setShowDealTypeModal(false);
    liftContractEditorForIosPicker(() => setShowDealTypeModal(true));
  }, [liftContractEditorForIosPicker]);

  const setShowCancellationModalForContract = useCallback((v) => {
    if (!v) return setShowCancellationModal(false);
    liftContractEditorForIosPicker(() => setShowCancellationModal(true));
  }, [liftContractEditorForIosPicker]);

  const setShowEventEndModalForContract = useCallback((v) => {
    if (!v) return setShowEventEndModal(false);
    liftContractEditorForIosPicker(() => setShowEventEndModal(true));
  }, [liftContractEditorForIosPicker]);

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
    [contractBooking?.eventTime, contractBooking?.durationHours],
  );

  const contractEventWindowHint = useMemo(
    () => formatEventWindowHint(contractBooking?.eventTime, contractBooking?.durationHours, language),
    [contractBooking?.eventTime, contractBooking?.durationHours, language],
  );

  const loadVenueContract = useCallback(async () => {
    if (!token || !eventVenueId) return;
    setContractLoading(true);
    try {
      const res = await api.getVenueContract(token, eventVenueId);
      if (res?.success) {
        setContractData(res.contract || null);
        setContractBooking(res.booking || null);
        setContractDraft(draftFromPayload(res.contract?.payload || {}, 'venue'));
        setContractAcceptAck(false);
      }
    } catch (e) {
      console.error('[useVenueBookingContract] load error:', e);
    } finally {
      setContractLoading(false);
    }
  }, [token, eventVenueId]);

  useEffect(() => {
    loadVenueContract();
  }, [loadVenueContract]);

  const acceptContract = useCallback(async () => {
    if (!token || !eventVenueId) return;
    try {
      const res = await api.acceptVenueContract(token, eventVenueId);
      if (res?.success) {
        showSuccess?.(
          res?.contract?.status === 'PENDING_PAYMENT'
            ? language === 'fr'
              ? 'Contrat accepté — en attente du paiement de l’organisateur.'
              : 'Contract accepted — waiting for organizer payment.'
            : res?.contract?.status === 'PENDING_SIGNATURE'
              ? language === 'fr'
                ? 'Contrat accepté — signature électronique envoyée par email.'
                : 'Contract accepted — e-signature sent by email.'
              : language === 'fr'
                ? 'Contrat accepté.'
                : 'Contract accepted.',
        );
        await loadVenueContract();
      } else {
        showError?.(res?.message || (language === 'fr' ? 'Impossible d\'accepter.' : 'Unable to accept.'));
      }
    } catch (e) {
      console.error('[useVenueBookingContract] accept error:', e);
      showError?.(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
    }
  }, [token, eventVenueId, language, loadVenueContract, showError, showSuccess]);

  const counterContract = useCallback(async () => {
    if (!token || !eventVenueId) return;
    try {
      const payload = buildVenueContractPayload(contractDraft);
      const res = await api.counterVenueContract(token, eventVenueId, payload);
      if (res?.success) {
        showSuccess?.(language === 'fr' ? 'Contre-proposition envoyée.' : 'Counter-proposal sent.');
        closeContractEditorSession();
        await loadVenueContract();
      } else {
        showError?.(res?.message || (language === 'fr' ? 'Impossible d\'envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('[useVenueBookingContract] counter error:', e);
      showError?.(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
    }
  }, [
    token,
    eventVenueId,
    contractDraft,
    language,
    closeContractEditorSession,
    loadVenueContract,
    showError,
    showSuccess,
  ]);

  const closeContractPdfPreview = useCallback(() => {
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
      setTimeout(() => setContractEditorVisible(true), Platform.OS === 'ios' ? 350 : 0);
    }
  }, []);

  const openContractPdfPreview = useCallback(
    async ({ previewPayload, pendingAction }) => {
      if (!token || !eventVenueId) return;
      contractEditorWasVisibleForPdfRef.current = contractEditorVisible;
      setContractEditorVisible(false);
      setContractPdfPreview({
        visible: true,
        loading: true,
        pdfBase64: null,
        error: null,
        pendingAction,
      });
      try {
        const res = await api.previewVenueContractPdf(token, eventVenueId, previewPayload);
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
    },
    [token, eventVenueId, contractEditorVisible, language],
  );

  const confirmContractPdfPreview = useCallback(async () => {
    contractEditorWasVisibleForPdfRef.current = false;
    const action = contractPdfPreview.pendingAction;
    setContractPdfPreview({
      visible: false,
      loading: false,
      pdfBase64: null,
      error: null,
      pendingAction: null,
    });
    if (action === 'accept') await acceptContract();
    else if (action === 'counter') await counterContract();
  }, [contractPdfPreview.pendingAction, acceptContract, counterContract]);

  const openContractEditorFromChat = useCallback(() => {
    setContractEditorVisible(true);
  }, []);

  return {
    contractLoading,
    contractData,
    contractBooking,
    contractDraft,
    setContractDraft,
    contractAcceptAck,
    setContractAcceptAck,
    contractEditorVisible,
    closeContractEditorSession,
    openContractEditorFromChat,
    openContractPdfPreview,
    closeContractPdfPreview,
    confirmContractPdfPreview,
    contractPdfPreview,
    contractEventEndOptions,
    contractEventWindowHint,
    showPaymentTermsModal,
    setShowPaymentTermsModal,
    showDealTypeModal,
    setShowDealTypeModal,
    showCancellationModal,
    setShowCancellationModal,
    showEventEndModal,
    setShowEventEndModal,
    setShowPaymentTermsModalForContract,
    setShowDealTypeModalForContract,
    setShowCancellationModalForContract,
    setShowEventEndModalForContract,
    loadVenueContract,
  };
}
