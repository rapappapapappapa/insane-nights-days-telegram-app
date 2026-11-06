const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../screens/dashboard/VenueDashboardPage.js');
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join('\n');

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

const styleBody = slice(1800).replace(/^const styles = /, 'export const styles = ');
fs.writeFileSync(
  path.join(__dirname, '../screens/dashboard/VenueDashboardPage.styles.js'),
  "import { StyleSheet, Platform } from 'react-native';\nimport Colors from '../../constants/colors';\n\n" +
    styleBody
);

const hookBody = slice(75, 909);
const hookFile = `import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
  user,
  language,
  routeParams,
  navigate,
  showError,
  showSuccess,
  showConfirm,
  refreshUnreadCount,
  markAllAsRead,
  contractEditorModalCardHeight,
}) {
${hookBody.split('\n').map((l) => '  ' + l).join('\n')}

  return {
    loading,
    venue,
    ratings,
    photos,
    videos,
    videoModalVisible,
    setVideoModalVisible,
    selectedVideo,
    setSelectedVideo,
    savingMedia,
    activeTab,
    setActiveTab,
    bookings,
    loadingBookings,
    processingInvitation,
    rejectModalVisible,
    setRejectModalVisible,
    rejectModalEventVenueId,
    setRejectModalEventVenueId,
    rejectModalAction,
    setRejectModalAction,
    chatModalVisible,
    setChatModalVisible,
    selectedChatEventVenueId,
    setSelectedChatEventVenueId,
    chatMessages,
    loadingChatMessages,
    sendingMessage,
    newMessageText,
    setNewMessageText,
    chatScrollViewRef,
    contractLoading,
    contractData,
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
    showDealTypeModal,
    setShowDealTypeModal,
    contractAcceptAck,
    setContractAcceptAck,
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
    contractEventEndOptions,
    contractEventWindowHint,
    pickMedia,
    handleDeleteMedia,
    deletingMediaId,
    openVenueChat,
    sendMessage,
    handleDeleteMessage,
    openContractPdfPreview,
    closeContractPdfPreview,
    confirmContractPdfPreview,
    handleAcceptVenueInvitation,
    handleRejectVenueInvitation,
    handleCancelVenueBooking,
    handleRejectVenueConfirm,
    fetchBookings,
    PAYMENT_TERMS_OPTIONS,
    buildVenueContractPayload,
    navigate,
    goBack: arguments0,
  };
}
`;
// fix goBack - hook receives goBack in params
const hookFixed = hookFile.replace('goBack: arguments0', '').replace(
  'markAllAsRead,\n  contractEditorModalCardHeight,\n})',
  'markAllAsRead,\n  goBack,\n  contractEditorModalCardHeight,\n})'
);
fs.writeFileSync(path.join(__dirname, '../hooks/useVenueDashboard.js'), hookFixed);

const sectionsDir = path.join(__dirname, '../components/venueDashboard/sections');
fs.mkdirSync(sectionsDir, { recursive: true });

const avisBody = slice(868, 909);
fs.writeFileSync(
  path.join(sectionsDir, 'VenueAvisTab.js'),
  `import React from 'react';
import { Text, View } from 'react-native';
import StarRating from '../../StarRating';

export default function VenueAvisTab({ language, styles, ratings }) {
${avisBody.replace('const renderRatings = () => {', '').replace(/^\s*if \(!ratings\)/, '  if (!ratings)').split('\n').slice(1).join('\n')}
`
);

// Fix VenueAvisTab - the replace might be broken. Simpler: extract render body only
const avisContent = slice(869, 908);
fs.writeFileSync(
  path.join(sectionsDir, 'VenueAvisTab.js'),
  `import React from 'react';
import { Text, View } from 'react-native';
import StarRating from '../../StarRating';

export default function VenueAvisTab({ language, styles, ratings }) {
${avisContent.split('\n').map((l) => '  ' + l).join('\n')}
}
`
);

const tabs = [
  { name: 'VenueInfosTab', start: 979, end: 999 },
  { name: 'VenueMediasTab', start: 1000, end: 1095 },
  { name: 'VenueBookingsTab', start: 1103, end: 1250 },
];

const tabImports = `import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/colors';
import StarRating from '../../StarRating';
import { normalizeMediaUrl } from '../../../api/config';
import { SCREEN_WIDTH } from '../../../utils/venueDashboardUtils';
`;

for (const t of tabs) {
  let body = slice(t.start, t.end);
  body = body.replace(/\s*\{activeTab === '[^']+' && \(\s*/g, '\n');
  body = body.replace(/\s*\)\}\s*$/g, '');
  fs.writeFileSync(
    path.join(sectionsDir, `${t.name}.js`),
    tabImports +
      `\nexport default function ${t.name}(props) {\n` +
      DESTRUCTURING +
      '\n  return (\n' +
      body
        .split('\n')
        .map((l) => '    ' + l)
        .join('\n') +
      '\n  );\n}\n'
  );
}

const DESTRUCTURING = `  const {
    language, styles, venue, ratings, photos, videos, navigate, user,
    savingMedia, pickMedia, handleDeleteMedia, deletingMediaId,
    setSelectedVideo, setVideoModalVisible, bookings, loadingBookings,
    processingInvitation, openVenueChat, handleAcceptVenueInvitation,
    handleRejectVenueInvitation, handleCancelVenueBooking, showConfirm,
  } = props;`;

// chat modal
const chatBody = slice(1259, 1565);
fs.writeFileSync(
  path.join(__dirname, '../components/venueDashboard/VenueChatModal.js'),
  `import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  buildVenueContractPayload,
  contractAcceptAckLabel,
  dealTypeLabel,
  cancellationPolicyLabel,
} from '../../constants/contractPayload';
import ContractDraftEditorFields from '../ContractDraftEditorFields';
import Colors from '../../constants/colors';
import { PAYMENT_TERMS_OPTIONS } from '../../utils/venueDashboardUtils';

export default function VenueChatModal(props) {
` +
    CHAT_DESTRUCTURING +
    '\n  return (\n' +
    chatBody
      .split('\n')
      .map((l) => '    ' + l)
      .join('\n') +
    '\n  );\n}\n'
);

const CHAT_DESTRUCTURING = `  const {
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
  } = props;`;

// contract modals 1567-1774
const contractBody = slice(1567, 1774);
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
` +
    contractBody
      .split('\n')
      .map((l) => '      ' + l)
      .join('\n') +
    `
    </>
  );
}
`
);

// thin main - fix DESTRUCTURING order issue in script - rewrite tabs loop after DESTRUCTURING defined
console.log('Run fix-venue-tabs.js next');
