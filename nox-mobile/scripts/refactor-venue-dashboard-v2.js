const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../screens/dashboard/VenueDashboardPage.js');
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join('\n');

const DESTRUCTURING = `  const {
    language, styles, venue, ratings, photos, videos, navigate, user,
    savingMedia, pickMedia, handleDeleteMedia, deletingMediaId,
    setSelectedVideo, setVideoModalVisible, bookings, loadingBookings,
    processingInvitation, openVenueChat, handleAcceptVenueInvitation,
    handleRejectVenueInvitation, handleCancelVenueBooking, showConfirm,
    setRejectModalVisible, setRejectModalEventVenueId, setRejectModalAction,
  } = props;`;

const tabImports = `import React from 'react';
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import StarRating from '../../StarRating';
import { normalizeMediaUrl } from '../../../api/config';
import { SCREEN_WIDTH } from '../../../utils/venueDashboardUtils';
`;

const sectionsDir = path.join(__dirname, '../components/venueDashboard/sections');
fs.mkdirSync(sectionsDir, { recursive: true });

fs.writeFileSync(
  path.join(sectionsDir, 'VenueAvisTab.js'),
  `import React from 'react';
import { Text, View } from 'react-native';
import StarRating from '../../StarRating';

export default function VenueAvisTab({ language, styles, ratings }) {
${slice(869, 908)
  .split('\n')
  .map((l) => '  ' + l)
  .join('\n')}
}
`
);

for (const { name, start, end } of [
  { name: 'VenueInfosTab', start: 979, end: 999 },
  { name: 'VenueMediasTab', start: 1000, end: 1095 },
  { name: 'VenueBookingsTab', start: 1103, end: 1250 },
]) {
  let body = slice(start, end);
  body = body.replace(/\s*\{activeTab === '[^']+' && \(\s*/g, '');
  body = body.replace(/\s*\)\}\s*$/g, '');
  fs.writeFileSync(
    path.join(sectionsDir, `${name}.js`),
    `${tabImports}\nexport default function ${name}(props) {\n${DESTRUCTURING}\n  return (\n${body
      .split('\n')
      .map((l) => '    ' + l)
      .join('\n')}\n  );\n}\n`
  );
}

// utils + styles + hook (if not exists)
if (!fs.existsSync(path.join(__dirname, '../utils/venueDashboardUtils.js'))) {
  fs.writeFileSync(
    path.join(__dirname, '../utils/venueDashboardUtils.js'),
    `import { Dimensions } from 'react-native';
import { PAYMENT_TERMS_OPTIONS } from './bookerDashboardUtils';
export function cleanText(s) {
  if (!s) return '';
  return String(s).replace(/\\s+/g, ' ').trim();
}
export { PAYMENT_TERMS_OPTIONS };
export const SCREEN_WIDTH = Dimensions.get('window').width;
`
  );
}

const styleBody = slice(1800).replace(/^const styles = /, 'export const styles = ');
fs.writeFileSync(
  path.join(__dirname, '../screens/dashboard/VenueDashboardPage.styles.js'),
  "import { StyleSheet, Platform } from 'react-native';\nimport Colors from '../../constants/colors';\n\n" +
    styleBody
);

const hookBody = slice(75, 867);
let hook = `import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
${hookBody.split('\n').map((l) => '  ' + l).join('\n')}
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
`;
hook = hook.replace(/import React, \{ useEffect, useState, useRef, useMemo, useCallback \}/,
  'import React, { useEffect, useState, useRef, useMemo }');
fs.writeFileSync(path.join(__dirname, '../hooks/useVenueDashboard.js'), hook);

// Chat modal
const CHAT_D = `  const {
    language, styles, chatModalVisible, pendingOpenContractEditorRef,
    openContractEditorFallbackTimerRef, setContractEditorVisible, reopenChatAfterContractRef,
    flushPendingContractEditor, setChatModalVisible, setSelectedChatEventVenueId,
    setChatMessages, setNewMessageText, setShowPaymentTermsModal, setShowDealTypeModal,
    setShowCancellationModal, setShowEventEndModal, refreshUnreadCount, chatScrollViewRef,
    contractLoading, contractData, contractDraft, setContractDraft, contractAcceptAck,
    setContractAcceptAck, contractEventEndOptions, contractEventWindowHint,
    setShowPaymentTermsModalForContract, setShowDealTypeModalForContract,
    setShowCancellationModalForContract, setShowEventEndModalForContract,
    openContractEditorFromChat, openContractPdfPreview, loadingChatMessages, chatMessages,
    handleDeleteMessage, newMessageText, sendMessage, sendingMessage, showConfirm,
    buildVenueContractPayload, contractAcceptAckLabel, dealTypeLabel, cancellationPolicyLabel,
    PAYMENT_TERMS_OPTIONS,
  } = props;`;

fs.writeFileSync(
  path.join(__dirname, '../components/venueDashboard/VenueChatModal.js'),
  `import React from 'react';
import { Text, View, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { buildVenueContractPayload, contractAcceptAckLabel, dealTypeLabel, cancellationPolicyLabel } from '../../constants/contractPayload';
import ContractDraftEditorFields from '../ContractDraftEditorFields';
import { PAYMENT_TERMS_OPTIONS } from '../../utils/venueDashboardUtils';
export default function VenueChatModal(props) {
${CHAT_D}
  return (
${slice(1259, 1565)
  .split('\n')
  .map((l) => '    ' + l)
  .join('\n')}
  );
}
`
);

fs.writeFileSync(
  path.join(__dirname, '../components/venueDashboard/VenueContractModals.js'),
  `import React from 'react';
import { Text, View, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import ContractDraftEditorFields from '../ContractDraftEditorFields';
import DealTypePickerModal from '../DealTypePickerModal';
import CancellationPolicyPickerModal from '../CancellationPolicyPickerModal';
import EventEndTimePickerModal from '../EventEndTimePickerModal';
import ContractPdfPreviewModal from '../ContractPdfPreviewModal';
import { buildVenueContractPayload } from '../../constants/contractPayload';
export default function VenueContractModals(props) {
  const {
    language, styles, contractEditorVisible, contractEditorModalCardHeight,
    closeContractEditorSession, contractDraft, setContractDraft, PAYMENT_TERMS_OPTIONS,
    setShowPaymentTermsModalForContract, setShowDealTypeModalForContract,
    setShowCancellationModalForContract, contractEventEndOptions, contractEventWindowHint,
    setShowEventEndModalForContract, openContractPdfPreview, showPaymentTermsModal,
    setShowPaymentTermsModal, showDealTypeModal, setShowDealTypeModal, showCancellationModal,
    setShowCancellationModal, showEventEndModal, setShowEventEndModal, contractPdfPreview,
    closeContractPdfPreview, confirmContractPdfPreview,
  } = props;
  return (
    <>
${slice(1567, 1774)
  .split('\n')
  .map((l) => '      ' + l)
  .join('\n')}
    </>
  );
}
`
);

const jsxEarly = slice(911, 936);
const jsxMain = slice(937, 1258);

const thin = `import React from 'react';
import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useNotifications } from '../../hooks/useNotifications';
import Toast from '../../components/Toast';
import VideoPlayer from '../../components/VideoPlayer';
import RejectReasonModal from '../../components/RejectReasonModal';
import { useVenueDashboard } from '../../hooks/useVenueDashboard';
import { styles } from './VenueDashboardPage.styles';
import Colors from '../../constants/colors';
import VenueInfosTab from '../../components/venueDashboard/sections/VenueInfosTab';
import VenueMediasTab from '../../components/venueDashboard/sections/VenueMediasTab';
import VenueAvisTab from '../../components/venueDashboard/sections/VenueAvisTab';
import VenueBookingsTab from '../../components/venueDashboard/sections/VenueBookingsTab';
import VenueChatModal from '../../components/venueDashboard/VenueChatModal';
import VenueContractModals from '../../components/venueDashboard/VenueContractModals';

export default function VenueDashboardPage() {
  const { height: contractModalWindowH } = useWindowDimensions();
  const contractEditorModalCardHeight = Math.round(contractModalWindowH * 0.88);
  const { language } = useLanguage();
  const { goBack, navigate, routeParams } = useNavigation();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();
  const { user } = useAuth();
  const { refreshUnreadCount, markAllAsRead } = useNotifications();

  const v = useVenueDashboard({
    user, language, routeParams, navigate, goBack, showError, showSuccess, showConfirm,
    refreshUnreadCount, markAllAsRead,
  });

  const shared = { language, styles, ...v, navigate, user, showConfirm };

${jsxEarly
  .split('\n')
  .map((l) => '  ' + l)
  .join('\n')}

  return (
${jsxMain
  .split('\n')
  .map((l) => (l.startsWith('      ') ? l : '    ' + l))
  .join('\n')
  .replace(
    /\{activeTab === 'infos' &&[\s\S]*?\{activeTab === 'bookings' &&[\s\S]*?\)\}\s*\n\s*\)\}/,
    `{v.activeTab === 'infos' && <VenueInfosTab {...shared} />}
        {v.activeTab === 'medias' && <VenueMediasTab {...shared} />}
        {v.activeTab === 'avis' && <VenueAvisTab language={language} styles={styles} ratings={v.ratings} />}
        {v.activeTab === 'bookings' && <VenueBookingsTab {...shared} />}`
  )
  .replace(
    /<VideoPlayer[\s\S]*?onClose=\{\(\) => setVideoModalVisible\(false\)\}\s*\/>/,
    `<VideoPlayer
        videoUrl={v.selectedVideo?.url}
        title={v.selectedVideo?.title}
        visible={v.videoModalVisible}
        onClose={() => v.setVideoModalVisible(false)}
      />

      <VenueChatModal {...shared} contractEditorModalCardHeight={contractEditorModalCardHeight} />

      <VenueContractModals
        {...shared}
        contractEditorModalCardHeight={contractEditorModalCardHeight}
      />

      <RejectReasonModal
        visible={v.rejectModalVisible}
        onClose={() => {
          v.setRejectModalVisible(false);
          v.setRejectModalEventVenueId(null);
        }}
        onConfirm={v.handleRejectVenueConfirm}
        title={v.rejectModalAction === 'cancel' ? (language === 'fr' ? 'Annuler le booking' : 'Cancel booking') : (language === 'fr' ? "Refuser l'invitation" : 'Reject invitation')}
        confirmLabel={v.rejectModalAction === 'cancel' ? (language === 'fr' ? 'Annuler' : 'Cancel') : (language === 'fr' ? 'Refuser' : 'Reject')}
        language={language}
        loading={v.processingInvitation === v.rejectModalEventVenueId}
      />`
  )
  .replace(/<Toast[\s\S]*?onHide=\{hideToast\}\s*\/>/, `<Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />`)
}
`;

fs.writeFileSync(srcPath, thin);
console.log('venue refactor v2 done');
