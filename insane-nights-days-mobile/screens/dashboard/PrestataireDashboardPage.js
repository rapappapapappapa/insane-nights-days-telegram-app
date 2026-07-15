import React from 'react';
import { Text, View, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { usePrestataireProfile } from '../../hooks/usePrestataireProfile';
import { usePrestataireBookings } from '../../hooks/usePrestataireBookings';
import { usePrestataireMessaging } from '../../hooks/usePrestataireMessaging';
import { styles } from './PrestataireDashboardPage.styles';
import PrestataireProfilSection from '../../components/prestataireDashboard/PrestataireProfilSection';
import PrestataireBookingsSection from '../../components/prestataireDashboard/PrestataireBookingsSection';
import PrestataireChatModal from '../../components/prestataireDashboard/PrestataireChatModal';
import PrestataireContractModals from '../../components/prestataireDashboard/PrestataireContractModals';
import { isHomeScreenForProfile } from '../../utils/noxRoleNavigation';

/**
 * Dashboard prestataire : réservations (EventPrestataire), chat privé et contrat.
 */
export default function PrestataireDashboardPage() {
  const { language } = useLanguage();
  const { goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const isHome = isHomeScreenForProfile(user?.activeProfileType, 'prestataireDashboard');
  const { height: windowH } = useWindowDimensions();
  const contractEditorModalCardHeight = Math.round(windowH * 0.88);
  const { toast, showError, showSuccess, hideToast } = useToast();

  const profile = usePrestataireProfile({ user, language, showError, showSuccess });
  const bookingsHook = usePrestataireBookings({ user });
  const messaging = usePrestataireMessaging({ user, language, routeParams });

  const {
    profBusinessName,
    setProfBusinessName,
    profPhonePro,
    setProfPhonePro,
    profCity,
    setProfCity,
    profCountry,
    setProfCountry,
    profBio,
    setProfBio,
    profGenres,
    setProfGenres,
    profDays,
    setProfDays,
    profAvailableStatus,
    setProfAvailableStatus,
    profCustomGenre,
    setProfCustomGenre,
    profLoading,
    profSaving,
    addProfCustomGenre,
    savePrestataireProfile,
  } = profile;

  const { bookings, loadingBookings } = bookingsHook;

  const {
    chatModalVisible,
    setChatModalVisible,
    chatScrollRef,
    loadingChat,
    chatMessages,
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
    contractEventEndOptions,
    contractEventWindowHint,
    openChat,
    sendMessage,
    acceptContract,
    counterContract,
    canCounter,
    newMessageText,
    setNewMessageText,
    sendingMessage,
  } = messaging;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        {!isHome ? (
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Text style={styles.backText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <PrestataireProfilSection
          language={language}
          styles={styles}
          profLoading={profLoading}
          profBusinessName={profBusinessName}
          setProfBusinessName={setProfBusinessName}
          profPhonePro={profPhonePro}
          setProfPhonePro={setProfPhonePro}
          profCity={profCity}
          setProfCity={setProfCity}
          profCountry={profCountry}
          setProfCountry={setProfCountry}
          profBio={profBio}
          setProfBio={setProfBio}
          profGenres={profGenres}
          setProfGenres={setProfGenres}
          profDays={profDays}
          setProfDays={setProfDays}
          profAvailableStatus={profAvailableStatus}
          setProfAvailableStatus={setProfAvailableStatus}
          profCustomGenre={profCustomGenre}
          setProfCustomGenre={setProfCustomGenre}
          addProfCustomGenre={addProfCustomGenre}
          profSaving={profSaving}
          savePrestataireProfile={savePrestataireProfile}
        />
        <PrestataireBookingsSection
          language={language}
          styles={styles}
          loadingBookings={loadingBookings}
          bookings={bookings}
          openChat={openChat}
        />
      </ScrollView>

      <PrestataireChatModal
        language={language}
        styles={styles}
        chatModalVisible={chatModalVisible}
        setChatModalVisible={setChatModalVisible}
        chatScrollRef={chatScrollRef}
        loadingChat={loadingChat}
        chatMessages={chatMessages}
        contractLoading={contractLoading}
        contractData={contractData}
        canCounter={canCounter}
        setContractEditorVisible={setContractEditorVisible}
        acceptContract={acceptContract}
        newMessageText={newMessageText}
        setNewMessageText={setNewMessageText}
        sendMessage={sendMessage}
        sendingMessage={sendingMessage}
      />

      <PrestataireContractModals
        language={language}
        styles={styles}
        contractEditorVisible={contractEditorVisible}
        contractEditorModalCardHeight={contractEditorModalCardHeight}
        setContractEditorVisible={setContractEditorVisible}
        contractDraft={contractDraft}
        setContractDraft={setContractDraft}
        contractEventEndOptions={contractEventEndOptions}
        contractEventWindowHint={contractEventWindowHint}
        showPaymentTermsModal={showPaymentTermsModal}
        setShowPaymentTermsModal={setShowPaymentTermsModal}
        showCancellationModal={showCancellationModal}
        setShowCancellationModal={setShowCancellationModal}
        showEventEndModal={showEventEndModal}
        setShowEventEndModal={setShowEventEndModal}
        counterContract={counterContract}
      />

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </View>
  );
}
