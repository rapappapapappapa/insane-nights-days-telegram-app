const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../screens/dashboard/BookerDashboardPage.js');
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join('\n');

const hooksDir = path.join(__dirname, '../hooks');
fs.mkdirSync(hooksDir, { recursive: true });

// useBookerMessaging: chat + contrats (lignes 133-262, 754-1565 sans les deux useMemo finaux déjà inclus)
const messagingBody = [
  slice(133, 262),
  slice(754, 1086),
  slice(1087, 1249),
  slice(1552, 1565),
].join('\n\n');

fs.writeFileSync(
  path.join(hooksDir, 'useBookerMessaging.js'),
  `import { useState, useEffect, useRef, useMemo } from 'react';
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
${messagingBody.split('\n').map((l) => '  ' + l).join('\n')}

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
`
);

const profileBody = [slice(92, 109), slice(567, 678)].join('\n\n');
fs.writeFileSync(
  path.join(hooksDir, 'useBookerProfile.js'),
  `import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/config';

export function useBookerProfile({ user, language, showError, showSuccess }) {
${profileBody.split('\n').map((l) => '  ' + l).join('\n')}

  useEffect(() => {
    if (!user?.token) return;
    loadBookerProfile();
  }, [user?.token]);

  return {
    bookerProfile,
    loadingProfile,
    savingProfile,
    profileForm,
    setProfileForm,
    profileImage,
    uploadingProfileImage,
    pickProfileImage,
    saveBookerProfile,
    loadBookerProfile,
  };
}
`
);

const eventsBody = [
  slice(72, 74),
  slice(110, 126),
  slice(690, 733),
  slice(735, 752),
  slice(1285, 1426),
].join('\n\n');

fs.writeFileSync(
  path.join(hooksDir, 'useBookerEvents.js'),
  `import { useState, useEffect, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/config';

export function useBookerEvents({
  user,
  language,
  showError,
  showSuccess,
  showConfirm,
  routeParams,
  setActiveSection,
}) {
${eventsBody.split('\n').map((l) => '  ' + l).join('\n')}

  return {
    myEvents,
    loadingEvents,
    refreshingEvents,
    pulseEventId,
    deletingEventId,
    publishingEventId,
    markingPaymentEventDjId,
    editEventVisible,
    setEditEventVisible,
    editEventDraft,
    setEditEventDraft,
    editEventSaving,
    editEventUploading,
    fetchMyEvents,
    onRefreshEventsList,
    markBookingAsPaid,
    handlePublishToFeed,
    handleDeleteEvent,
    openEditEvent,
    pickEditEventImage,
    saveEditEvent,
  };
}
`
);

const routeBody = slice(128, 569);
fs.writeFileSync(
  path.join(hooksDir, 'useBookerDjVenueRoute.js'),
  `import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/config';
import { BOOKER_EVENTS_REFRESH_FLAG } from '../utils/bookerDashboardUtils';

export function useBookerDjVenueRoute({
  user,
  language,
  showError,
  showSuccess,
  routeParams,
  formData,
  setFormData,
  eventDateTime,
  setEventDateTime,
  addDj,
  removeDj,
  setVenue,
  fetchMyEvents,
  loadBookerProfile,
}) {
${routeBody.split('\n').map((l) => '  ' + l).join('\n')}

  useEffect(() => {
    if (!user?.token) return;
    (async () => {
      try {
        const flag = await AsyncStorage.getItem(BOOKER_EVENTS_REFRESH_FLAG);
        if (flag === '1') await AsyncStorage.removeItem(BOOKER_EVENTS_REFRESH_FLAG);
      } catch (_) {}
      fetchVenues();
      fetchMyEvents();
      loadBookerProfile();
    })();
  }, [user?.token]);

  return {
    djSlots,
    setDjSlots,
    currentStep,
    setCurrentStep,
    tempDate,
    setTempDate,
    tempTime,
    setTempTime,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    openDatePicker,
    openTimePicker,
    handleChange,
    handleCreateEvent,
    creating,
    venues,
    availableDjs,
    selectedVenue,
    selectedDjs,
    fetchVenues,
    fetchAvailableDjs,
  };
}
`
);

console.log('Hooks written to', hooksDir);
