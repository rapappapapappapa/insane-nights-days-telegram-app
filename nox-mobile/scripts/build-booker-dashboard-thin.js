const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../screens/dashboard/BookerDashboardPage.js');
const dest = src;
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const jsx = lines.slice(1566).join('\n');

const header = `import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEventForm } from '../../contexts/EventFormContext';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../contexts/ConfirmContext';
import NotificationBadge from '../../components/NotificationBadge';
import { useNotifications } from '../../hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { styles } from './BookerDashboardPage.styles';
import { BOOKER_EVENTS_REFRESH_FLAG, PAYMENT_TERMS_OPTIONS } from '../../utils/bookerDashboardUtils';
import { useBookerProfile } from '../../hooks/useBookerProfile';
import { useBookerEvents } from '../../hooks/useBookerEvents';
import { useBookerMessaging } from '../../hooks/useBookerMessaging';
import { useBookerDjVenueRoute } from '../../hooks/useBookerDjVenueRoute';
import BookerProfilSection from '../../components/bookerDashboard/sections/BookerProfilSection';
import BookerEventsSection from '../../components/bookerDashboard/sections/BookerEventsSection';
import BookerDateTimePickers from '../../components/bookerDashboard/BookerDateTimePickers';
import BookerChatModal from '../../components/bookerDashboard/BookerChatModal';
import BookerContractModals from '../../components/bookerDashboard/BookerContractModals';
import BookerEditEventModal from '../../components/bookerDashboard/BookerEditEventModal';

export default function BookerDashboardPage() {
  const { height: contractModalWindowH } = useWindowDimensions();
  const contractEditorModalCardHeight = Math.round(contractModalWindowH * 0.88);
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();
  const { unreadCount, refreshUnreadCount, markAllAsRead } = useNotifications();
  const { formData, setFormData, eventDateTime, setEventDateTime, resetForm, addDj, removeDj, setVenue } =
    useEventForm();

  const shouldOpenBookings =
    !!routeParams?.openBookings ||
    !!routeParams?.openChatEventDjId ||
    !!routeParams?.openChatEventId ||
    !!routeParams?.openChatEventVenueId ||
    !!routeParams?.highlightEventId;
  const shouldOpenProfil = routeParams?.openSection === 'profil';

  const [activeSection, setActiveSection] = useState(
    shouldOpenProfil ? 'profil' : shouldOpenBookings ? 'events' : 'profil'
  );

  const profile = useBookerProfile({ user, language, showError, showSuccess });
  const events = useBookerEvents({
    user,
    language,
    showError,
    showSuccess,
    showConfirm,
    routeParams,
    setActiveSection,
  });
  const messaging = useBookerMessaging({
    user,
    language,
    showError,
    showSuccess,
    markAllAsRead,
    routeParams,
    shouldOpenBookings,
    setActiveSection,
  });
  const routeLegacy = useBookerDjVenueRoute({
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
    resetForm,
    setActiveSection,
    fetchMyEvents: events.fetchMyEvents,
  });

  const {
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
  } = profile;

  const {
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
  } = events;

  const {
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
    setChatMessages,
    setNewMessageText,
    setShowPaymentTermsModal,
    setShowDealTypeModal,
    setShowCancellationModal,
    setShowEventEndModal,
    chatScrollViewRef,
    contractLoading,
    contractData,
    contractDraft,
    setContractDraft,
    contractAcceptAck,
    setContractAcceptAck,
    contractDraftReadAck,
    setContractDraftReadAck,
    contractEditorVisible,
    setContractEditorVisible,
    showPaymentTermsModal,
    showCancellationModal,
    showEventEndModal,
    showDealTypeModal,
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
    chatMessages,
    loadingChatMessages,
    newMessageText,
    sendingMessage,
  } = messaging;

  const {
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    tempDate,
    setTempDate,
    tempTime,
    setTempTime,
    handleChange,
    fetchVenues,
  } = routeLegacy;

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

`;

fs.writeFileSync(dest, header + jsx);
console.log('Wrote thin BookerDashboardPage.js, lines:', (header + jsx).split('\n').length);
