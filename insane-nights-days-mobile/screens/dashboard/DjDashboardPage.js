import React, { useState } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeMediaUrl } from '../../api/config';
import Colors from '../../constants/colors';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../contexts/ConfirmContext';
import NotificationBadge from '../../components/NotificationBadge';
import { useNotifications } from '../../hooks/useNotifications';
import RejectReasonModal from '../../components/RejectReasonModal';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './DjDashboardPage.styles';
import { useDjProfile } from '../../hooks/useDjProfile';
import { useDjBookings } from '../../hooks/useDjBookings';
import { useDjMessaging } from '../../hooks/useDjMessaging';
import DjProfilSection from '../../components/djDashboard/sections/DjProfilSection';
import DjTarifsSection from '../../components/djDashboard/sections/DjTarifsSection';
import DjMaterielSection from '../../components/djDashboard/sections/DjMaterielSection';
import DjBookingsSection from '../../components/djDashboard/sections/DjBookingsSection';
import DjAvisSection from '../../components/djDashboard/sections/DjAvisSection';
import DjPaiementsSection from '../../components/djDashboard/sections/DjPaiementsSection';
import DjMediasSection from '../../components/djDashboard/sections/DjMediasSection';
import DjMediaModals from '../../components/djDashboard/DjMediaModals';
import DjChatModal from '../../components/djDashboard/DjChatModal';
import DjContractModals from '../../components/djDashboard/DjContractModals';

export default function DjDashboardPage() {
  const { height: contractModalWindowH } = useWindowDimensions();
  const contractEditorModalCardHeight = Math.round(contractModalWindowH * 0.88);
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();
  const { unreadCount, refreshUnreadCount, markAllAsRead } = useNotifications();

  const shouldOpenBookings =
    !!routeParams?.openBookings || !!routeParams?.openChatEventDjId || !!routeParams?.openChatEventId;
  const [activeSection, setActiveSection] = useState(shouldOpenBookings ? 'bookings' : 'profil');
  
  const profile = useDjProfile({
    user,
    language,
    showError,
    showSuccess,
    showConfirm,
    activeSection,
  });
  const bookingsHook = useDjBookings({
    user,
    language,
    showError,
    showSuccess,
    activeSection,
  });
  const messaging = useDjMessaging({
    user,
    language,
    showError,
    showSuccess,
    markAllAsRead,
    routeParams,
    shouldOpenBookings,
    setActiveSection,
  });

  const {
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
    bio,
    setBio,
    birthDate,
    genre,
    setGenre,
    city,
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
    handleSave,
    availableDays,
    toggleDay,
    availableStatus,
    setAvailableStatus,
    equipment,
    setEquipment,
    bannerImage,
    profileImage,
    uploadingBannerImage,
    uploadingProfileImage,
    pickDjProfileImage,
    photos,
    setPhotos,
    videos,
    setVideos,
    pickImage,
    pickVideo,
    deleteMedia,
    selectedVideo,
    setSelectedVideo,
    videoPlayerVisible,
    setVideoPlayerVisible,
    editingTitle,
    setEditingTitle,
    editTitleValue,
    setEditTitleValue,
    updateMediaTitle,
    streamPreviewPlayer,
    setStreamPreviewPlayer,
    openDjStreamPreview,
  } = profile;

  const {
    bookings,
    loadingBookings,
    processingInvitation,
    rejectModalVisible,
    setRejectModalVisible,
    rejectModalInvitationId,
    setRejectModalInvitationId,
    rejectModalAction,
    handleAcceptInvitation,
    handleRejectInvitation,
    handleCancelBooking,
    handleRejectConfirm,
  } = bookingsHook;

  const {
    chatModalVisible,
    setChatModalVisible,
    selectedChatEventDjId,
    setSelectedChatEventDjId,
    selectedChatEventId,
    setSelectedChatEventId,
    isGroupChat,
    setIsGroupChat,
    setChatMessages,
    setNewMessageText,
    setShowPaymentTermsModal,
    setShowCancellationModal,
    setShowEventEndModal,
    chatScrollViewRef,
    contractLoading,
    contractData,
    contractDraft,
    setContractDraft,
    contractAcceptAck,
    setContractAcceptAck,
    contractEditorVisible,
    setContractEditorVisible,
    showPaymentTermsModal,
    showCancellationModal,
    showEventEndModal,
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
    chatMessages,
    loadingChatMessages,
    newMessageText,
    sendingMessage,
    contractBooking,
    venueContractGate,
  } = messaging;

  const menuItems = [
    { id: 'profil', label: language === 'fr' ? 'Profil artiste' : 'Artist Profile', icon: '👤' },
    { id: 'tarifs', label: language === 'fr' ? 'Tarifs & disponibilités' : 'Rates & Availabilities', icon: '💰' },
    { id: 'medias', label: language === 'fr' ? 'Médias' : 'Media', icon: '📸' },
    { id: 'materiel', label: language === 'fr' ? 'Matériel & rider' : 'Equipment & Rider', icon: '🎛️' },
    { id: 'bookings', label: 'Bookings', icon: '📅' },
    { id: 'paiements', label: language === 'fr' ? 'Paiements' : 'Payments', icon: '💳' },
    { id: 'avis', label: language === 'fr' ? 'Avis & notes' : 'Reviews & Notes', icon: '⭐' },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {language === 'fr' ? 'Chargement...' : 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  const dashboardProps = {
    language,
    styles,
    navigate,
    showConfirm,
    Colors,
    djProfile,
    bannerImage,
    profileImage,
    uploadingBannerImage,
    uploadingProfileImage,
    pickDjProfileImage,
    artistName,
    pseudo,
    setPseudo,
    realName,
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
    bio,
    setBio,
    birthDate,
    genre,
    setGenre,
    city,
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
    openDjStreamPreview,
    handleSave,
    saving,
    availableDays,
    toggleDay,
    availableStatus,
    setAvailableStatus,
    equipment,
    setEquipment,
    bookings,
    loadingBookings,
    processingInvitation,
    openChat,
    openGroupChat,
    handleAcceptInvitation,
    handleRejectInvitation,
    handleCancelBooking,
    ratingsData,
    loadingRatings,
    fetchRatings,
    photos,
    setPhotos,
    videos,
    setVideos,
    pickImage,
    pickVideo,
    deleteMedia,
    setSelectedVideo,
    setVideoPlayerVisible,
    setEditingTitle,
    setEditTitleValue,
    normalizeMediaUrl,
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'profil':
        return <DjProfilSection {...dashboardProps} />;
      case 'tarifs':
        return <DjTarifsSection {...dashboardProps} />;
      case 'materiel':
        return <DjMaterielSection {...dashboardProps} />;
      case 'bookings':
        return <DjBookingsSection {...dashboardProps} />;
      case 'avis':
        return <DjAvisSection {...dashboardProps} />;
      case 'paiements':
        return <DjPaiementsSection {...dashboardProps} />;
      case 'medias':
        return <DjMediasSection {...dashboardProps} />;
      default:
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.sectionTitle}>
              {menuItems.find((item) => item.id === activeSection)?.label || 'Section'}
            </Text>
            <Text style={styles.comingSoon}>
              {language === 'fr' ? 'Bientôt disponible...' : 'Coming soon...'}
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.mainContent}>
        <View style={styles.topBar}>
          <View style={{ width: 40 }} />
          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.messagesButton}
              onPress={() => {
                setActiveSection('bookings');
                refreshUnreadCount();
              }}
            >
              <Ionicons name="chatbubbles" size={24} color="#fff" />
              <NotificationBadge count={unreadCount} onPress={markAllAsRead} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sectionTabs}
          contentContainerStyle={styles.sectionTabsContent}
        >
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.sectionTab,
                activeSection === item.id && styles.sectionTabActive,
              ]}
              onPress={() => {
                setActiveSection(item.id);
                if (item.id === 'bookings') markAllAsRead();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.sectionTabIconWrap}>
                <Text style={styles.sectionTabIcon}>{item.icon}</Text>
                {item.id === 'bookings' && unreadCount > 0 && (
                  <NotificationBadge count={unreadCount} />
                )}
              </View>
              <Text
                style={[
                  styles.sectionTabText,
                  activeSection === item.id && styles.sectionTabTextActive,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {renderContent()}
      </View>

      <DjMediaModals
        language={language}
        styles={styles}
        selectedVideo={selectedVideo}
        videoPlayerVisible={videoPlayerVisible}
        setVideoPlayerVisible={setVideoPlayerVisible}
        setSelectedVideo={setSelectedVideo}
        streamPreviewPlayer={streamPreviewPlayer}
        setStreamPreviewPlayer={setStreamPreviewPlayer}
        editingTitle={editingTitle}
        setEditingTitle={setEditingTitle}
        editTitleValue={editTitleValue}
        setEditTitleValue={setEditTitleValue}
        updateMediaTitle={updateMediaTitle}
      />

      <DjChatModal
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
        setSelectedChatEventId={setSelectedChatEventId}
        setIsGroupChat={setIsGroupChat}
        setChatMessages={setChatMessages}
        setNewMessageText={setNewMessageText}
        setShowPaymentTermsModal={setShowPaymentTermsModal}
        setShowCancellationModal={setShowCancellationModal}
        setShowEventEndModal={setShowEventEndModal}
        refreshUnreadCount={refreshUnreadCount}
        chatScrollViewRef={chatScrollViewRef}
        isGroupChat={isGroupChat}
        selectedChatEventDjId={selectedChatEventDjId}
        contractLoading={contractLoading}
        contractData={contractData}
        contractDraft={contractDraft}
        contractAcceptAck={contractAcceptAck}
        setContractAcceptAck={setContractAcceptAck}
        contractBooking={contractBooking}
        venueContractGate={venueContractGate}
        djVenueGateBlocks={djVenueGateBlocks}
        openContractEditorFromChat={openContractEditorFromChat}
        openContractPdfPreview={openContractPdfPreview}
        loadingChatMessages={loadingChatMessages}
        chatMessages={chatMessages}
        handleDeleteMessage={handleDeleteMessage}
        newMessageText={newMessageText}
        sendMessage={sendMessage}
        sendingMessage={sendingMessage}
      />

      <DjContractModals
        language={language}
        styles={styles}
        contractEditorVisible={contractEditorVisible}
        contractEditorModalCardHeight={contractEditorModalCardHeight}
        closeContractEditorSession={closeContractEditorSession}
        contractDraft={contractDraft}
        setContractDraft={setContractDraft}
        setShowPaymentTermsModalForContract={setShowPaymentTermsModalForContract}
        setShowCancellationModalForContract={setShowCancellationModalForContract}
        contractEventEndOptions={contractEventEndOptions}
        contractEventWindowHint={contractEventWindowHint}
        setShowEventEndModalForContract={setShowEventEndModalForContract}
        openContractPdfPreview={openContractPdfPreview}
        showPaymentTermsModal={showPaymentTermsModal}
        setShowPaymentTermsModal={setShowPaymentTermsModal}
        showCancellationModal={showCancellationModal}
        setShowCancellationModal={setShowCancellationModal}
        showEventEndModal={showEventEndModal}
        setShowEventEndModal={setShowEventEndModal}
        contractPdfPreview={contractPdfPreview}
        closeContractPdfPreview={closeContractPdfPreview}
        confirmContractPdfPreview={confirmContractPdfPreview}
      />

      <RejectReasonModal
        visible={rejectModalVisible}
        onClose={() => {
          setRejectModalVisible(false);
          setRejectModalInvitationId(null);
        }}
        onConfirm={handleRejectConfirm}
        title={
          rejectModalAction === 'cancel'
            ? language === 'fr'
              ? 'Annuler le booking'
              : 'Cancel booking'
            : language === 'fr'
              ? "Refuser l'invitation"
              : 'Reject invitation'
        }
        confirmLabel={
          rejectModalAction === 'cancel'
                              ? language === 'fr'
              ? 'Annuler'
              : 'Cancel'
            : language === 'fr'
              ? 'Refuser'
              : 'Reject'
        }
        language={language}
        loading={processingInvitation === rejectModalInvitationId}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </View>
  );
}
