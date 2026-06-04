const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, '../screens/dashboard/BookerDashboardPage.js');
let content = fs.readFileSync(mainPath, 'utf8');

// Remove styles block at end
const styleStart = content.indexOf('\nconst styles = StyleSheet.create({');
if (styleStart !== -1) {
  content = content.slice(0, styleStart) + '\n';
}

// Remove local cleanText + BOOKER_EVENTS_REFRESH_FLAG
content = content.replace(
  /const BOOKER_EVENTS_REFRESH_FLAG = '@nox_refresh_booker_events';\n\nfunction cleanText\(s\) \{[\s\S]*?\}\n\n/,
  ''
);

// Remove PAYMENT_TERMS_OPTIONS array (moved to utils)
content = content.replace(
  /\n  const PAYMENT_TERMS_OPTIONS = \[[\s\S]*?\];\n\n/,
  '\n'
);

// Add imports after Colors import
const extraImports = `import { styles } from './BookerDashboardPage.styles';
import { BOOKER_EVENTS_REFRESH_FLAG, PAYMENT_TERMS_OPTIONS } from '../../utils/bookerDashboardUtils';
import BookerProfilSection from '../../components/bookerDashboard/sections/BookerProfilSection';
import BookerEventsSection from '../../components/bookerDashboard/sections/BookerEventsSection';
import BookerDateTimePickers from '../../components/bookerDashboard/BookerDateTimePickers';
import BookerChatModal from '../../components/bookerDashboard/BookerChatModal';
import BookerContractModals from '../../components/bookerDashboard/BookerContractModals';
import BookerEditEventModal from '../../components/bookerDashboard/BookerEditEventModal';
`;

if (!content.includes('BookerProfilSection')) {
  content = content.replace(
    "import Colors from '../../constants/colors';",
    "import Colors from '../../constants/colors';\n" + extraImports
  );
}

// Remove StyleSheet from react-native import if only used for styles - check if StyleSheet used elsewhere
if (!content.includes('StyleSheet.')) {
  content = content.replace(/,\n  StyleSheet/, '');
  content = content.replace(/StyleSheet,\n  /, '');
}

// Replace profil section
const profilStart = content.indexOf('{activeSection === \'profil\' ? (\n          // ✅ AJOUT: Section "Profil"');
const profilEnd = content.indexOf(') : activeSection === \'events\' ? (', profilStart);
if (profilStart !== -1 && profilEnd !== -1) {
  const profilReplacement = `{activeSection === 'profil' ? (
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
        ) : activeSection === 'events' ? (`;
  content = content.slice(0, profilStart) + profilReplacement + content.slice(profilEnd + ') : activeSection === \'events\' ? ('.length);
}

// Replace events section - find after our replacement
const eventsMarker = ') : activeSection === \'events\' ? (\n          // Section "Mes événements"';
const eventsStart = content.indexOf(eventsMarker);
const eventsEnd = content.indexOf(') : null}\n      </ScrollView>', eventsStart);
if (eventsStart !== -1 && eventsEnd !== -1) {
  const eventsReplacement = `) : activeSection === 'events' ? (
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
      </ScrollView>`;
  content = content.slice(0, eventsStart) + eventsReplacement + content.slice(eventsEnd + ') : null}\n      </ScrollView>'.length);
}

// Replace date pickers through edit event modal with components
const modalsStart = content.indexOf('{/* Modal pour le sélecteur de date */}');
const toastMarker = '{/* Toast pour les notifications */}';
const modalsEnd = content.indexOf(toastMarker);
if (modalsStart !== -1 && modalsEnd !== -1) {
  const modalsReplacement = `<BookerDateTimePickers
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

      `;
  content = content.slice(0, modalsStart) + modalsReplacement + content.slice(modalsEnd);
}

fs.writeFileSync(mainPath, content);
console.log('Updated BookerDashboardPage.js, length:', content.split('\n').length);
