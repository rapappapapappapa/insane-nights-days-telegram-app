const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../screens/dashboard/DjDashboardPage.js');
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join('\n');

const compDir = path.join(__dirname, '../components/djDashboard');
fs.mkdirSync(compDir, { recursive: true });

const mediaModal = `import React from 'react';
import { Text, View, TouchableOpacity, TextInput, Modal } from 'react-native';
import VideoPlayer from '../VideoPlayer';
import BuiltInStreamPlayerModal from '../BuiltInStreamPlayerModal';

/** Lecteur vidéo, stream Spotify/SoundCloud, édition titre média. */
export default function DjMediaModals(props) {
  const {
    language,
    styles,
    selectedVideo,
    videoPlayerVisible,
    setVideoPlayerVisible,
    setSelectedVideo,
    streamPreviewPlayer,
    setStreamPreviewPlayer,
    editingTitle,
    setEditingTitle,
    editTitleValue,
    setEditTitleValue,
    updateMediaTitle,
  } = props;

  return (
    <>
${slice(1691, 1765).split('\n').map((l) => '      ' + l).join('\n')}
    </>
  );
}
`;

const chatModal = `import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { normalizeMediaUrl } from '../../api/config';
import {
  buildDjContractPayload,
  contractAcceptAckLabel,
  cancellationPolicyLabel,
} from '../../constants/contractPayload';
import Colors from '../../constants/colors';
import { PAYMENT_TERMS_OPTIONS, cleanText } from '../../utils/djDashboardUtils';

/** Modal chat + contrat inline (dashboard DJ). */
export default function DjChatModal(props) {
  const {
    language,
    styles,
    navigate,
    showConfirm,
    chatModalVisible,
    pendingOpenContractEditorRef,
    openContractEditorFallbackTimerRef,
    setContractEditorVisible,
    reopenChatAfterContractRef,
    flushPendingContractEditor,
    setChatModalVisible,
    setSelectedChatEventDjId,
    setSelectedChatEventId,
    setIsGroupChat,
    setChatMessages,
    setNewMessageText,
    setShowPaymentTermsModal,
    setShowCancellationModal,
    setShowEventEndModal,
    refreshUnreadCount,
    chatScrollViewRef,
    isGroupChat,
    selectedChatEventDjId,
    contractLoading,
    contractData,
    contractDraft,
    contractAcceptAck,
    setContractAcceptAck,
    contractBooking,
    venueContractGate,
    djVenueGateBlocks,
    openContractEditorFromChat,
    openContractPdfPreview,
    loadingChatMessages,
    chatMessages,
    handleDeleteMessage,
    newMessageText,
    sendMessage,
    sendingMessage,
  } = props;

  return (
${slice(1768, 2152).split('\n').map((l) => '    ' + l).join('\n')}
  );
}
`;

const contractModals = `import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import ContractDraftEditorFields from '../ContractDraftEditorFields';
import CancellationPolicyPickerModal from '../CancellationPolicyPickerModal';
import EventEndTimePickerModal from '../EventEndTimePickerModal';
import ContractPdfPreviewModal from '../ContractPdfPreviewModal';
import { buildDjContractPayload } from '../../constants/contractPayload';
import { PAYMENT_TERMS_OPTIONS } from '../../utils/djDashboardUtils';

/** Modals contrat hors chat (dashboard DJ). */
export default function DjContractModals(props) {
  const {
    language,
    styles,
    contractEditorVisible,
    contractEditorModalCardHeight,
    closeContractEditorSession,
    contractDraft,
    setContractDraft,
    setShowPaymentTermsModalForContract,
    setShowCancellationModalForContract,
    contractEventEndOptions,
    contractEventWindowHint,
    setShowEventEndModalForContract,
    openContractPdfPreview,
    showPaymentTermsModal,
    setShowPaymentTermsModal,
    showCancellationModal,
    setShowCancellationModal,
    showEventEndModal,
    setShowEventEndModal,
    contractPdfPreview,
    closeContractPdfPreview,
    confirmContractPdfPreview,
  } = props;

  return (
    <>
${slice(2155, 2357).split('\n').map((l) => '      ' + l).join('\n')}
    </>
  );
}
`;

fs.writeFileSync(path.join(compDir, 'DjMediaModals.js'), mediaModal);
fs.writeFileSync(path.join(compDir, 'DjChatModal.js'), chatModal);
fs.writeFileSync(path.join(compDir, 'DjContractModals.js'), contractModals);
console.log('DJ modals written to', compDir);
