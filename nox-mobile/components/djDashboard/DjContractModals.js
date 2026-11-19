import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import ContractDraftEditorFields from '../ContractDraftEditorFields';
import CancellationPolicyPickerModal from '../CancellationPolicyPickerModal';
import EventEndTimePickerModal from '../EventEndTimePickerModal';
import ContractPdfPreviewModal from '../ContractPdfPreviewModal';
import { buildDjContractPayload } from '../../constants/contractPayload';
import { PAYMENT_TERMS_OPTIONS } from '../../utils/djDashboardUtils';

/** Modals contrat hors chat (dashboard DJ). */
export default function DjContractModals(props) {
  const {
    language,
    styles,
    contractEditorVisible,
    contractEditorModalCardHeight,
    closeContractEditorSession,
    contractDraft,
    setContractDraft,
    setShowPaymentTermsModalForContract,
    setShowCancellationModalForContract,
    contractEventEndOptions,
    contractEventWindowHint,
    setShowEventEndModalForContract,
    openContractPdfPreview,
    showPaymentTermsModal,
    setShowPaymentTermsModal,
    showCancellationModal,
    setShowCancellationModal,
    showEventEndModal,
    setShowEventEndModal,
    contractPdfPreview,
    closeContractPdfPreview,
    confirmContractPdfPreview,
  } = props;

  return (
    <>
            <Modal
              visible={contractEditorVisible}
              transparent={true}
              animationType="fade"
              presentationStyle="overFullScreen"
              onRequestClose={closeContractEditorSession}
            >
              {Platform.OS === 'ios' ? (
                <View style={styles.contractModalOverlay}>
                  <View
                    style={[
                      styles.contractModalCard,
                      { height: contractEditorModalCardHeight, maxWidth: 520, alignSelf: 'center' },
                    ]}
                    collapsable={false}
                  >
                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingBottom: 24 }}
                      keyboardShouldPersistTaps="always"
                      keyboardDismissMode="on-drag"
                      showsVerticalScrollIndicator
                      nestedScrollEnabled
                      removeClippedSubviews={false}
                    >
                      <Text style={styles.contractModalTitle}>
                        {language === 'fr' ? 'Contre-proposition' : 'Counter-proposal'}
                      </Text>
      
                      <ContractDraftEditorFields
                        mode="dj"
                        draft={contractDraft}
                        setDraft={setContractDraft}
                        language={language}
                        styles={styles}
                        PAYMENT_TERMS_OPTIONS={PAYMENT_TERMS_OPTIONS}
                      setShowPaymentTermsModal={setShowPaymentTermsModalForContract}
                      setShowDealTypeModal={() => {}}
                      setShowCancellationModal={setShowCancellationModalForContract}
                      eventEndOptions={contractEventEndOptions}
                      eventWindowHint={contractEventWindowHint}
                      setShowEventEndModal={setShowEventEndModalForContract}
                    />
      
                      <View style={styles.contractModalActions}>
                        <TouchableOpacity
                          style={[styles.contractButton, styles.contractButtonSecondary]}
                          onPress={closeContractEditorSession}
                        >
                          <Text style={styles.contractButtonText}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.contractButton, styles.contractButtonPrimary]}
                          onPress={() =>
                            openContractPdfPreview({
                              previewPayload: buildDjContractPayload(contractDraft),
                              pendingAction: 'counter',
                            })
                          }
                        >
                          <Text style={styles.contractButtonTextDark}>{language === 'fr' ? 'Envoyer' : 'Send'}</Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  </View>
                </View>
              ) : (
                <KeyboardAvoidingView enabled style={styles.contractModalOverlay} behavior="height">
                  <View
                    style={[
                      styles.contractModalCard,
                      { height: contractEditorModalCardHeight, maxWidth: 520, alignSelf: 'center' },
                    ]}
                  >
                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingBottom: 24 }}
                      keyboardShouldPersistTaps="always"
                      keyboardDismissMode="on-drag"
                      showsVerticalScrollIndicator={false}
                    >
                      <Text style={styles.contractModalTitle}>
                        {language === 'fr' ? 'Contre-proposition' : 'Counter-proposal'}
                      </Text>
      
                      <ContractDraftEditorFields
                        mode="dj"
                        draft={contractDraft}
                        setDraft={setContractDraft}
                        language={language}
                        styles={styles}
                        PAYMENT_TERMS_OPTIONS={PAYMENT_TERMS_OPTIONS}
                      setShowPaymentTermsModal={setShowPaymentTermsModalForContract}
                      setShowDealTypeModal={() => {}}
                      setShowCancellationModal={setShowCancellationModalForContract}
                      eventEndOptions={contractEventEndOptions}
                      eventWindowHint={contractEventWindowHint}
                      setShowEventEndModal={setShowEventEndModalForContract}
                    />
      
                      <View style={styles.contractModalActions}>
                        <TouchableOpacity
                          style={[styles.contractButton, styles.contractButtonSecondary]}
                          onPress={closeContractEditorSession}
                        >
                          <Text style={styles.contractButtonText}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.contractButton, styles.contractButtonPrimary]}
                          onPress={() =>
                            openContractPdfPreview({
                              previewPayload: buildDjContractPayload(contractDraft),
                              pendingAction: 'counter',
                            })
                          }
                        >
                          <Text style={styles.contractButtonTextDark}>{language === 'fr' ? 'Envoyer' : 'Send'}</Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  </View>
                </KeyboardAvoidingView>
              )}
            </Modal>
      
            <Modal
              visible={showPaymentTermsModal}
              transparent
              animationType="slide"
              presentationStyle="overFullScreen"
              onRequestClose={() => setShowPaymentTermsModal(false)}
            >
              <View style={styles.paymentTermsOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowPaymentTermsModal(false)} />
                <View style={styles.paymentTermsModalContent}>
                  <Text style={styles.contractModalTitle}>
                    {language === 'fr' ? 'Modalités de paiement' : 'Payment terms'}
                  </Text>
                  {PAYMENT_TERMS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.paymentTermsOption, contractDraft.paymentTerms === opt.value && styles.paymentTermsOptionSelected]}
                      onPress={() => {
                        setContractDraft((p) => ({ ...p, paymentTerms: opt.value }));
                        setShowPaymentTermsModal(false);
                      }}
                    >
                      <Text style={[styles.paymentTermsOptionText, contractDraft.paymentTerms === opt.value && styles.paymentTermsOptionTextSelected]}>
                        {language === 'fr' ? opt.labelFr : opt.labelEn}
                      </Text>
                      {contractDraft.paymentTerms === opt.value ? <Text style={styles.paymentTermsCheck}>✓</Text> : null}
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.paymentTermsClose} onPress={() => setShowPaymentTermsModal(false)}>
                    <Text style={styles.contractButtonText}>{language === 'fr' ? 'Fermer' : 'Close'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
      
            <CancellationPolicyPickerModal
              visible={showCancellationModal}
              onClose={() => setShowCancellationModal(false)}
              value={contractDraft.cancellation}
              onSelect={(v) => setContractDraft((p) => ({ ...p, cancellation: v }))}
              language={language}
              styles={styles}
            />
      
            <EventEndTimePickerModal
              visible={showEventEndModal}
              onClose={() => setShowEventEndModal(false)}
              value={contractDraft.eventEnd}
              onSelect={(v) => setContractDraft((p) => ({ ...p, eventEnd: v }))}
              language={language}
              styles={styles}
              options={contractEventEndOptions}
            />
      
            <ContractPdfPreviewModal
              visible={contractPdfPreview.visible}
              onClose={closeContractPdfPreview}
              onConfirm={confirmContractPdfPreview}
              previewOnly={contractPdfPreview.pendingAction === 'preview'}
              doneReadingLabel={
                language === 'fr' ? 'Fermer après lecture' : 'Close after reading'
              }
              title={language === 'fr' ? 'Aperçu du contrat (PDF)' : 'Contract preview (PDF)'}
              cancelLabel={language === 'fr' ? 'Annuler' : 'Cancel'}
              confirmLabel={
                contractPdfPreview.pendingAction === 'accept'
                  ? language === 'fr'
                    ? "J'ai lu et j'accepte"
                    : 'I have read and accept'
                  : language === 'fr'
                    ? 'Confirmer la contre-proposition'
                    : 'Confirm counter-proposal'
              }
              pdfBase64={contractPdfPreview.pdfBase64}
              loading={contractPdfPreview.loading}
              errorText={contractPdfPreview.error}
              language={language}
            />
    </>
  );
}
