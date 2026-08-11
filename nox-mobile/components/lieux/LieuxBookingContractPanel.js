import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import {
  buildVenueContractPayload,
  contractAcceptAckLabel,
  dealTypeLabel,
  cancellationPolicyLabel,
} from '../../constants/contractPayload';
import { PAYMENT_TERMS_OPTIONS, cleanText } from '../../utils/venueDashboardUtils';
import VenueContractModals from '../venueDashboard/VenueContractModals';
import { styles as contractStyles } from '../../screens/dashboard/VenueDashboardPage.styles';

export default function LieuxBookingContractPanel({
  language,
  contractEditorModalCardHeight,
  contract,
}) {
  const {
    contractLoading,
    contractData,
    contractBooking,
    contractDraft,
    setContractDraft,
    contractAcceptAck,
    setContractAcceptAck,
    contractEditorVisible,
    closeContractEditorSession,
    openContractEditorFromChat,
    openContractPdfPreview,
    closeContractPdfPreview,
    confirmContractPdfPreview,
    contractPdfPreview,
    contractEventEndOptions,
    contractEventWindowHint,
    showPaymentTermsModal,
    setShowPaymentTermsModal,
    showDealTypeModal,
    setShowDealTypeModal,
    showCancellationModal,
    setShowCancellationModal,
    showEventEndModal,
    setShowEventEndModal,
    setShowPaymentTermsModalForContract,
    setShowDealTypeModalForContract,
    setShowCancellationModalForContract,
    setShowEventEndModalForContract,
  } = contract;

  const fr = language === 'fr';
  const styles = contractStyles;

  if (contractLoading && !contractData) {
    return (
      <View style={[styles.contractCard, { marginHorizontal: 0, marginBottom: 12 }]}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (!contractData) return null;

  return (
    <>
      <View style={[styles.contractCard, { marginHorizontal: 0, marginBottom: 12 }]}>
        <TouchableOpacity
          activeOpacity={0.92}
          disabled={contractLoading}
          onPress={() => {
            if (contractData.status === 'SENT' && contractData.sentBy === 'BOOKER') {
              openContractEditorFromChat();
            }
          }}
        >
          <View style={styles.contractTopRow}>
            <Text style={styles.contractTitle}>
              🧾 {fr ? 'Contrat lieu' : 'Venue contract'}
            </Text>
            {contractLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.contractStatus}>
                {contractData?.status === 'SIGNED'
                  ? fr ? 'Signé' : 'Signed'
                  : contractData?.status === 'PENDING_SIGNATURE'
                    ? fr ? 'Signature en cours' : 'Signature pending'
                    : contractData?.status === 'PENDING_PAYMENT'
                      ? fr ? 'En attente paiement' : 'Awaiting payment'
                      : contractData?.status === 'SENT'
                        ? fr ? 'Envoyé' : 'Sent'
                        : fr ? 'Brouillon' : 'Draft'}
              </Text>
            )}
          </View>
          {contractBooking?.eventTitle ? (
            <Text style={styles.contractMeta} numberOfLines={2}>
              🎵 {contractBooking.eventTitle}
            </Text>
          ) : null}
          <Text style={styles.contractLine}>
            💰 {fr ? 'Prix' : 'Price'}:{' '}
            <Text style={styles.contractLineStrong}>
              {contractData?.payload?.priceEur != null
                ? `${contractData.payload.priceEur} €`
                : fr ? 'À définir' : 'To define'}
            </Text>
            {contractData?.payload?.depositPercent != null
              ? ` • ${fr ? 'Acompte' : 'Deposit'}: ${contractData.payload.depositPercent} %`
              : ''}
          </Text>
          {contractData?.payload?.paymentTerms ? (
            <Text style={styles.contractSmall} numberOfLines={2}>
              💳{' '}
              {PAYMENT_TERMS_OPTIONS.find((o) => o.value === contractData.payload.paymentTerms)?.[
                fr ? 'labelFr' : 'labelEn'
              ] || cleanText(contractData.payload.paymentTerms)}
            </Text>
          ) : null}
          {contractData?.payload?.dealType ? (
            <Text style={styles.contractSmall} numberOfLines={2}>
              📋 {dealTypeLabel(contractData.payload.dealType, language)}
            </Text>
          ) : null}
          {contractData?.payload?.cancellation ? (
            <Text style={styles.contractSmall} numberOfLines={4}>
              🧯 {cleanText(cancellationPolicyLabel(contractData.payload.cancellation, language))}
            </Text>
          ) : null}
        </TouchableOpacity>

        {contractData?.status === 'SENT' && contractData?.sentBy === 'BOOKER' ? (
          <>
            <TouchableOpacity
              style={[styles.contractButton, styles.contractButtonSecondary, styles.contractPdfPreviewBtn]}
              onPress={() =>
                openContractPdfPreview({
                  previewPayload: buildVenueContractPayload(contractDraft),
                  pendingAction: 'preview',
                })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.contractButtonText}>
                {fr ? 'Voir le contrat (PDF)' : 'View contract (PDF)'}
              </Text>
            </TouchableOpacity>
            <View style={styles.contractAckRow}>
              <TouchableOpacity
                style={[styles.contractAckCheckbox, contractAcceptAck && styles.contractAckCheckboxChecked]}
                onPress={() => setContractAcceptAck(!contractAcceptAck)}
                activeOpacity={0.7}
              >
                {contractAcceptAck ? <Text style={styles.contractAckCheckmark}>✓</Text> : null}
              </TouchableOpacity>
              <Text style={styles.contractAckText}>{contractAcceptAckLabel(language)}</Text>
            </View>
            <View style={styles.contractActionsRow}>
              <TouchableOpacity
                style={[styles.contractButton, styles.contractButtonSecondary]}
                onPress={openContractEditorFromChat}
              >
                <Text style={styles.contractButtonText}>{fr ? 'Contre-proposer' : 'Counter'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.contractButton,
                  styles.contractButtonPrimary,
                  !contractAcceptAck && { opacity: 0.45 },
                ]}
                onPress={() =>
                  openContractPdfPreview({
                    previewPayload: buildVenueContractPayload(contractDraft),
                    pendingAction: 'accept',
                  })
                }
                disabled={!contractAcceptAck}
              >
                <Text style={styles.contractButtonTextDark}>{fr ? 'Accepter' : 'Accept'}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : contractData?.status === 'SENT' ? (
          <Text style={styles.contractHint}>
            {fr ? 'En attente de la réponse de l\'organisateur.' : 'Waiting for organizer response.'}
          </Text>
        ) : contractData?.status === 'SIGNED' ? (
          <Text style={styles.contractHint}>{fr ? '✅ Contrat signé.' : '✅ Contract signed.'}</Text>
        ) : contractData?.status === 'PENDING_PAYMENT' ? (
          <Text style={styles.contractHint}>
            {fr
              ? '💳 Contrat accepté — en attente du paiement Stripe de l’organisateur.'
              : '💳 Contract accepted — waiting for organizer Stripe payment.'}
          </Text>
        ) : contractData?.status === 'PENDING_SIGNATURE' ? (
          <Text style={styles.contractHint}>
            {fr
              ? '✍️ Signature électronique en cours (email Yousign).'
              : '✍️ E-signature in progress (Yousign email).'}
          </Text>
        ) : null}
      </View>

      <VenueContractModals
        language={language}
        styles={styles}
        contractEditorVisible={contractEditorVisible}
        contractEditorModalCardHeight={contractEditorModalCardHeight}
        closeContractEditorSession={closeContractEditorSession}
        contractDraft={contractDraft}
        setContractDraft={setContractDraft}
        PAYMENT_TERMS_OPTIONS={PAYMENT_TERMS_OPTIONS}
        setShowPaymentTermsModalForContract={setShowPaymentTermsModalForContract}
        setShowDealTypeModalForContract={setShowDealTypeModalForContract}
        setShowCancellationModalForContract={setShowCancellationModalForContract}
        contractEventEndOptions={contractEventEndOptions}
        contractEventWindowHint={contractEventWindowHint}
        setShowEventEndModalForContract={setShowEventEndModalForContract}
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
    </>
  );
}
