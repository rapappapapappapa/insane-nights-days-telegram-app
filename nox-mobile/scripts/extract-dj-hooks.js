const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../screens/dashboard/DjDashboardPage.js');
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join('\n');

const hooksDir = path.join(__dirname, '../hooks');
fs.mkdirSync(hooksDir, { recursive: true });

const indent = (body) => body.split('\n').map((l) => '  ' + l).join('\n');

// --- useDjProfile ---
const profileBody = [
  slice(70, 77),
  slice(87, 144),
  slice(304, 322),
  slice(700, 1397),
].join('\n\n');

fs.writeFileSync(
  path.join(hooksDir, 'useDjProfile.js'),
  `import { useState, useEffect } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { api, normalizeMediaUrl } from '../api/config';
import { resolveStreamingEmbed } from '../utils/streamingEmbedUrl';

/**
 * Profil DJ, médias, avis (dashboard DJ).
 */
export function useDjProfile({ user, language, showError, showSuccess, showConfirm, activeSection }) {
${indent(profileBody)}

  useEffect(() => {
    if (user?.token) {
      fetchDjProfile();
    }
  }, [user?.token]);

  useEffect(() => {
    if (activeSection === 'avis' && user?.token && user?.id && !loadingRatings) {
      fetchRatings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, user?.token, user?.id]);

  return {
    loading,
    saving,
    djProfile,
    ratingsData,
    loadingRatings,
    fetchRatings,
    artistName,
    pseudo,
    setPseudo,
    realName,
    city,
    phone,
    birthDate,
    bio,
    setBio,
    genre,
    setGenre,
    mainCity,
    setMainCity,
    languages,
    setLanguages,
    soundcloudUrl,
    setSoundcloudUrl,
    spotifyUrl,
    setSpotifyUrl,
    youtubeUrl,
    setYoutubeUrl,
    instagramUrl,
    setInstagramUrl,
    tiktokUrl,
    setTiktokUrl,
    equipment,
    setEquipment,
    legalName,
    setLegalName,
    address,
    setAddress,
    postalCode,
    setPostalCode,
    country,
    setCountry,
    siret,
    setSiret,
    vatNumber,
    setVatNumber,
    availableDays,
    toggleDay,
    availableStatus,
    setAvailableStatus,
    photos,
    setPhotos,
    videos,
    setVideos,
    bannerImage,
    profileImage,
    selectedVideo,
    setSelectedVideo,
    videoPlayerVisible,
    setVideoPlayerVisible,
    editingTitle,
    setEditingTitle,
    editTitleValue,
    setEditTitleValue,
    streamPreviewPlayer,
    setStreamPreviewPlayer,
    uploadingProfileImage,
    uploadingBannerImage,
    fetchDjProfile,
    handleSave,
    openDjStreamPreview,
    saveMedia,
    updateMediaTitle,
    deleteMedia,
    pickImage,
    pickVideo,
    pickDjProfileImage,
  };
}
`
);

// --- useDjBookings ---
const bookingsBody = [slice(145, 152), slice(609, 691)].join('\n\n');

fs.writeFileSync(
  path.join(hooksDir, 'useDjBookings.js'),
  `import { useState, useEffect } from 'react';
import { api } from '../api/config';

/**
 * Invitations / bookings DJ (dashboard DJ).
 */
export function useDjBookings({ user, language, showError, showSuccess, activeSection }) {
${indent(bookingsBody)}

  useEffect(() => {
    if (activeSection === 'bookings' && user?.token && !loadingBookings) {
      fetchBookings();
    }
  }, [activeSection, user?.token]);

  return {
    bookings,
    loadingBookings,
    processingInvitation,
    rejectModalVisible,
    setRejectModalVisible,
    rejectModalInvitationId,
    setRejectModalInvitationId,
    rejectModalAction,
    fetchBookings,
    handleAcceptInvitation,
    handleRejectInvitation,
    handleCancelBooking,
    handleRejectConfirm,
  };
}
`
);

// --- useDjMessaging ---
const messagingBody = [
  slice(153, 266),
  slice(285, 288),
  slice(323, 608),
  slice(1408, 1420),
].join('\n\n');

fs.writeFileSync(
  path.join(hooksDir, 'useDjMessaging.js'),
  `import { useState, useEffect, useRef, useMemo } from 'react';
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
${indent(messagingBody)}

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
`
);

console.log('DJ hooks written to', hooksDir);
