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
import { PAYMENT_TERMS_OPTIONS } from '../../utils/djDashboardUtils';

/** Modals contrat hors chat (dashboard prestataire). */
export default function PrestataireContractModals({
  language,
  styles,
  contractEditorVisible,
  contractEditorModalCardHeight,
  setContractEditorVisible,
  contractDraft,
  setContractDraft,
  contractEventEndOptions,
  contractEventWindowHint,
  showPaymentTermsModal,
  setShowPaymentTermsModal,
  showCancellationModal,
  setShowCancellationModal,
  showEventEndModal,
  setShowEventEndModal,
  counterContract,
}) {
  return (
    <>
      <Modal visible={contractEditorVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={styles.contractModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
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
              showsVerticalScrollIndicator
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
                setShowPaymentTermsModal={setShowPaymentTermsModal}
                setShowDealTypeModal={() => {}}
                setShowCancellationModal={setShowCancellationModal}
                eventEndOptions={contractEventEndOptions}
                eventWindowHint={contractEventWindowHint}
                setShowEventEndModal={setShowEventEndModal}
              />
              <View style={styles.contractModalActions}>
                <TouchableOpacity
                  style={[styles.contractButton, styles.contractButtonSecondary]}
                  onPress={() => setContractEditorVisible(false)}
                >
                  <Text style={styles.contractButtonText}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.contractButton, styles.contractButtonPrimary]} onPress={counterContract}>
                  <Text style={styles.contractButtonTextDark}>
                    {language === 'fr' ? 'Envoyer la contre-proposition' : 'Send counter-offer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showPaymentTermsModal}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowPaymentTermsModal(false)}
      >
        <View style={styles.paymentTermsOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowPaymentTermsModal(false)}
          />
          <View style={styles.paymentTermsModalContent}>
            <Text style={styles.contractModalTitle}>
              {language === 'fr' ? 'Modalités de paiement' : 'Payment terms'}
            </Text>
            {PAYMENT_TERMS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.paymentTermsOption,
                  contractDraft.paymentTerms === opt.value && styles.paymentTermsOptionSelected,
                ]}
                onPress={() => {
                  setContractDraft((p) => ({ ...p, paymentTerms: opt.value }));
                  setShowPaymentTermsModal(false);
                }}
              >
                <Text
                  style={[
                    styles.paymentTermsOptionText,
                    contractDraft.paymentTerms === opt.value && styles.paymentTermsOptionTextSelected,
                  ]}
                >
                  {language === 'fr' ? opt.labelFr : opt.labelEn}
                </Text>
                {contractDraft.paymentTerms === opt.value ? (
                  <Text style={styles.paymentTermsCheck}>✓</Text>
                ) : null}
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
    </>
  );
}
