import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
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
import { useNotifications } from '../../hooks/useNotifications';
import RejectReasonModal from '../../components/RejectReasonModal';
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
import DjDashboardHomeSection from '../../components/djDashboard/DjDashboardHomeSection';
import DjMediaModals from '../../components/djDashboard/DjMediaModals';
import DjChatModal from '../../components/djDashboard/DjChatModal';
import DjContractModals from '../../components/djDashboard/DjContractModals';
import { NoxProDashboardHeader } from '../../components/nox';
import { isHomeScreenForProfile } from '../../utils/noxRoleNavigation';

const DJ_DASHBOARD_SECTIONS = new Set([
  'profil',
  'tarifs',
  'medias',
  'materiel',
  'bookings',
  'paiements',
  'avis',
]);

function resolveDjDashboardSection(routeParams) {
  if (
    routeParams?.openBookings ||
    routeParams?.openChatEventDjId ||
    routeParams?.openChatEventId
  ) {
    return 'bookings';
  }
  const section = routeParams?.openSection;
  if (section && DJ_DASHBOARD_SECTIONS.has(section)) return section;
  return 'home';
}

export default function DjDashboardPage() {
  const { height: contractModalWindowH } = useWindowDimensions();
  const contractEditorModalCardHeight = Math.round(contractModalWindowH * 0.88);
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const isHome = isHomeScreenForProfile(user?.activeProfileType, 'djDashboard');
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();
  const { unreadCount, refreshUnreadCount, markAllAsRead } = useNotifications();

  const shouldOpenBookings =
    !!routeParams?.openBookings || !!routeParams?.openChatEventDjId || !!routeParams?.openChatEventId;
  const [activeSection, setActiveSection] = useState(() => resolveDjDashboardSection(routeParams));

  useEffect(() => {
    setActiveSection(resolveDjDashboardSection(routeParams));
  }, [
    routeParams?.openSection,
    routeParams?.openBookings,
    routeParams?.openChatEventDjId,
    routeParams?.openChatEventId,
  ]);

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
    {
      id: 'profil',
      label: language === 'fr' ? 'Profil artiste' : 'Artist profile',
      hint: language === 'fr' ? 'Identité & bio' : 'Identity & bio',
      icon: 'person',
      accentColor: '#81B9FF',
      accentBg: 'rgba(129,185,255,0.15)',
    },
    {
      id: 'tarifs',
      label: language === 'fr' ? 'Tarifs' : 'Rates',
      hint: language === 'fr' ? 'Disponibilités' : 'Availability',
      icon: 'cash',
      accentColor: '#34D399',
      accentBg: 'rgba(52,211,153,0.12)',
    },
    {
      id: 'medias',
      label: language === 'fr' ? 'Médias' : 'Media',
      hint: language === 'fr' ? 'Photos & vidéos' : 'Photos & videos',
      icon: 'images',
      accentColor: '#F472B6',
      accentBg: 'rgba(244,114,182,0.12)',
    },
    {
      id: 'materiel',
      label: language === 'fr' ? 'Matériel' : 'Equipment',
      hint: language === 'fr' ? 'Rider technique' : 'Technical rider',
      icon: 'hardware-chip',
      accentColor: '#A78BFA',
      accentBg: 'rgba(167,139,250,0.12)',
    },
    {
      id: 'bookings',
      label: 'Bookings',
      hint: language === 'fr' ? 'Invitations & chat' : 'Invites & chat',
      icon: 'calendar',
      accentColor: Colors.primaryLight,
      accentBg: 'rgba(40,82,232,0.2)',
    },
    {
      id: 'paiements',
      label: language === 'fr' ? 'Paiements' : 'Payments',
      hint: language === 'fr' ? 'Stripe & facturation' : 'Stripe & billing',
      icon: 'card',
      accentColor: '#FBBF24',
      accentBg: 'rgba(251,191,36,0.12)',
    },
    {
      id: 'avis',
      label: language === 'fr' ? 'Avis' : 'Reviews',
      hint: language === 'fr' ? 'Notes reçues' : 'Ratings received',
      icon: 'star',
      accentColor: '#FCD34D',
      accentBg: 'rgba(252,211,77,0.12)',
    },
  ];

  const isHubView = activeSection === 'home';
  const activeMenuItem = menuItems.find((item) => item.id === activeSection);
  const headerTitle = isHubView
    ? language === 'fr'
      ? 'Dashboard DJ'
      : 'DJ Dashboard'
    : activeMenuItem?.label || (language === 'fr' ? 'Dashboard DJ' : 'DJ Dashboard');

  const handleHeaderBack = () => {
    if (isHubView) {
      goBack();
      return;
    }
    setActiveSection('home');
  };

  const openSection = (sectionId) => {
    setActiveSection(sectionId);
    if (sectionId === 'bookings') markAllAsRead();
  };

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
    if (activeSection === 'home') {
      return (
        <DjDashboardHomeSection
          language={language}
          styles={styles}
          tiles={menuItems}
          unreadCount={unreadCount}
          displayName={pseudo || artistName}
          onSelectSection={openSection}
        />
      );
    }

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

      <NoxProDashboardHeader
        title={headerTitle}
        showBack={!isHubView || !isHome}
        onBack={handleHeaderBack}
        unreadCount={unreadCount}
        onMessagesPress={() => {
          openSection('bookings');
          refreshUnreadCount();
        }}
        onMarkMessagesRead={markAllAsRead}
      />

      <View style={styles.mainContent}>
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
