import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Éditeur contrat booker + modales imbriquées (gestion iOS).
 */
export function useBookerContractEditor({ chatModalVisible, setChatModalVisible }) {
  const [contractEditorVisible, setContractEditorVisible] = useState(false);
  const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showEventEndModal, setShowEventEndModal] = useState(false);
  const [showDealTypeModal, setShowDealTypeModal] = useState(false);

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

  return {
    contractEditorVisible,
    setContractEditorVisible,
    showPaymentTermsModal,
    setShowPaymentTermsModal,
    showCancellationModal,
    setShowCancellationModal,
    showEventEndModal,
    setShowEventEndModal,
    showDealTypeModal,
    setShowDealTypeModal,
    reopenChatAfterContractRef,
    pendingOpenContractEditorRef,
    openContractEditorFallbackTimerRef,
    contractEditorWasVisibleForPdfRef,
    flushPendingContractEditor,
    closeContractEditorSession,
    openContractEditorFromChat,
    setShowPaymentTermsModalForContract,
    setShowDealTypeModalForContract,
    setShowCancellationModalForContract,
    setShowEventEndModalForContract,
  };
}
