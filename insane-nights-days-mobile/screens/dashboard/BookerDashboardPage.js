import React, { useState, useEffect } from 'react';
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

  return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
          </TouchableOpacity>
          <Text
            style={styles.title}
            numberOfLines={2}
            adjustsFontSizeToFit={Platform.OS === 'ios'}
            minimumFontScale={0.85}
          >
            {language === 'fr' ? 'Dashboard Organisateur' : 'Organizer Dashboard'}
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.messagesButton}
              onPress={() => {
                setActiveSection('events');
                refreshUnreadCount();
              }}
            >
              <Ionicons name="chatbubbles" size={24} color="#fff" />
              <NotificationBadge count={unreadCount} onPress={markAllAsRead} />
            </TouchableOpacity>
            <View style={{ width: 44 }} />
          </View>
        </View>

      {/* Boutons de navigation */}
      <View style={styles.tabButtons}>
        <TouchableOpacity
          style={[styles.tabButton, activeSection === 'profil' && styles.tabButtonActive]}
          onPress={() => setActiveSection('profil')}
        >
          <Text style={[styles.tabButtonText, activeSection === 'profil' && styles.tabButtonTextActive]}>
            {language === 'fr' ? 'Profil' : 'Profile'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeSection === 'events' && styles.tabButtonActive]}
          onPress={() => {
            setActiveSection('events');
            fetchMyEvents();
            // Marquer les messages comme lus quand on ouvre la section événements
            markAllAsRead();
          }}
        >
          <View style={styles.tabButtonContent}>
            <Text style={[styles.tabButtonText, activeSection === 'events' && styles.tabButtonTextActive]}>
              {language === 'fr' ? 'Mes événements' : 'My Events'}
            </Text>
            <NotificationBadge count={unreadCount} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ✅ AJOUT: Boutons Profil (voir public + dashboard événement) */}
      {activeSection === 'profil' && (
        <View style={styles.profilActionsRow}>
          {bookerProfile?.id && (
            <TouchableOpacity
              style={styles.viewPublicProfileButton}
              onPress={() => navigate('bookerProfile', { bookerId: bookerProfile.id })}
            >
              <Ionicons name="eye-outline" size={20} color={Colors.primary} />
              <Text style={styles.viewPublicProfileButtonText}>
                {language === 'fr' ? 'Voir mon profil public' : 'View my public profile'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.eventDashboardButton}
            onPress={() => navigate('bookerEventDashboard', {})}
          >
            <Ionicons name="calendar" size={24} color={Colors.background} />
            <Text style={styles.eventDashboardButtonText}>
              {language === 'fr' ? 'Dashboard Événement' : 'Event Dashboard'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 180 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          activeSection === 'events' ? (
            <RefreshControl
              refreshing={refreshingEvents}
              onRefresh={onRefreshEventsList}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          ) : undefined
        }
      >
        {activeSection === 'profil' ? (
          <BookerProfilSection
            language={language}
            styles={styles}
            loadingProfile={loadingProfile}
            bookerProfile={bookerProfile}
            profileImage={profileImage}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            uploadingProfileImage={uploadingProfileImage}
            pickProfileImage={pickProfileImage}
            savingProfile={savingProfile}
            saveBookerProfile={saveBookerProfile}
          />
        ) : activeSection === 'events' ? (
          <BookerEventsSection
            language={language}
            styles={styles}
            navigate={navigate}
            myEvents={myEvents}
            loadingEvents={loadingEvents}
            pulseEventId={pulseEventId}
            openVenueChat={openVenueChat}
            openPrestataireChat={openPrestataireChat}
            openGroupChat={openGroupChat}
            openChat={openChat}
            markBookingAsPaid={markBookingAsPaid}
            markingPaymentEventDjId={markingPaymentEventDjId}
            openEditEvent={openEditEvent}
            handlePublishToFeed={handlePublishToFeed}
            publishingEventId={publishingEventId}
            handleDeleteEvent={handleDeleteEvent}
            deletingEventId={deletingEventId}
          />
        ) : null}
      </ScrollView>

      <BookerDateTimePickers
        language={language}
        styles={styles}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        showTimePicker={showTimePicker}
        setShowTimePicker={setShowTimePicker}
        tempDate={tempDate}
        setTempDate={setTempDate}
        tempTime={tempTime}
        setTempTime={setTempTime}
        setEventDateTime={setEventDateTime}
        handleChange={handleChange}
      />

      <BookerChatModal
        language={language}
        styles={styles}
        navigate={navigate}
        showConfirm={showConfirm}
        chatModalVisible={chatModalVisible}
        pendingOpenContractEditorRef={pendingOpenContractEditorRef}
        openContractEditorFallbackTimerRef={openContractEditorFallbackTimerRef}
        setContractEditorVisible={setContractEditorVisible}
        reopenChatAfterContractRef={reopenChatAfterContractRef}
        flushPendingContractEditor={flushPendingContractEditor}
        setChatModalVisible={setChatModalVisible}
        setSelectedChatEventDjId={setSelectedChatEventDjId}
        setSelectedChatEventVenueId={setSelectedChatEventVenueId}
        setSelectedChatEventId={setSelectedChatEventId}
        setIsGroupChat={setIsGroupChat}
        setIsVenueChat={setIsVenueChat}
        setIsPrestataireChat={setIsPrestataireChat}
        setSelectedChatEventPrestataireId={setSelectedChatEventPrestataireId}
        setChatMessages={setChatMessages}
        setNewMessageText={setNewMessageText}
        setShowPaymentTermsModal={setShowPaymentTermsModal}
        setShowDealTypeModal={setShowDealTypeModal}
        setShowCancellationModal={setShowCancellationModal}
        setShowEventEndModal={setShowEventEndModal}
        refreshUnreadCount={refreshUnreadCount}
        chatScrollViewRef={chatScrollViewRef}
        isGroupChat={isGroupChat}
        isVenueChat={isVenueChat}
        isPrestataireChat={isPrestataireChat}
        contractLoading={contractLoading}
        contractData={contractData}
        contractDraft={contractDraft}
        setContractDraft={setContractDraft}
        contractAcceptAck={contractAcceptAck}
        setContractAcceptAck={setContractAcceptAck}
        contractDraftReadAck={contractDraftReadAck}
        setContractDraftReadAck={setContractDraftReadAck}
        contractEventEndOptions={contractEventEndOptions}
        contractEventWindowHint={contractEventWindowHint}
        setShowPaymentTermsModalForContract={setShowPaymentTermsModalForContract}
        setShowDealTypeModalForContract={setShowDealTypeModalForContract}
        setShowCancellationModalForContract={setShowCancellationModalForContract}
        setShowEventEndModalForContract={setShowEventEndModalForContract}
        openContractEditorFromChat={openContractEditorFromChat}
        openContractPdfPreview={openContractPdfPreview}
        djVenueGateBlocks={djVenueGateBlocks}
        loadingChatMessages={loadingChatMessages}
        chatMessages={chatMessages}
        handleDeleteMessage={handleDeleteMessage}
        newMessageText={newMessageText}
        sendMessage={sendMessage}
        sendingMessage={sendingMessage}
      />

      <BookerContractModals
        language={language}
        styles={styles}
        contractEditorVisible={contractEditorVisible}
        contractEditorModalCardHeight={contractEditorModalCardHeight}
        closeContractEditorSession={closeContractEditorSession}
        isVenueChat={isVenueChat}
        contractDraft={contractDraft}
        setContractDraft={setContractDraft}
        PAYMENT_TERMS_OPTIONS={PAYMENT_TERMS_OPTIONS}
        setShowPaymentTermsModalForContract={setShowPaymentTermsModalForContract}
        setShowDealTypeModalForContract={setShowDealTypeModalForContract}
        setShowCancellationModalForContract={setShowCancellationModalForContract}
        contractEventEndOptions={contractEventEndOptions}
        contractEventWindowHint={contractEventWindowHint}
        setShowEventEndModalForContract={setShowEventEndModalForContract}
        contractData={contractData}
        saveContractDraft={saveContractDraft}
        openContractPdfPreview={openContractPdfPreview}
        showPaymentTermsModal={showPaymentTermsModal}
        setShowPaymentTermsModal={setShowPaymentTermsModal}
        showDealTypeModal={showDealTypeModal}
        setShowDealTypeModal={setShowDealTypeModal}
        showCancellationModal={showCancellationModal}
        setShowCancellationModal={setShowCancellationModal}
        showEventEndModal={showEventEndModal}
        setShowEventEndModal={setShowEventEndModal}
        contractPdfPreview={contractPdfPreview}
        closeContractPdfPreview={closeContractPdfPreview}
        confirmContractPdfPreview={confirmContractPdfPreview}
      />

      <BookerEditEventModal
        language={language}
        styles={styles}
        editEventVisible={editEventVisible}
        setEditEventVisible={setEditEventVisible}
        editEventDraft={editEventDraft}
        setEditEventDraft={setEditEventDraft}
        editEventSaving={editEventSaving}
        editEventUploading={editEventUploading}
        pickEditEventImage={pickEditEventImage}
        saveEditEvent={saveEditEvent}
      />

      {/* Toast pour les notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
      </KeyboardAvoidingView>
  );
}

