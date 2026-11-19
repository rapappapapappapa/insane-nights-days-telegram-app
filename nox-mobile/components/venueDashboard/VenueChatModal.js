import React from 'react';
import { Text, View, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import Colors from '../../constants/colors';
import { buildVenueContractPayload, contractAcceptAckLabel, dealTypeLabel, cancellationPolicyLabel } from '../../constants/contractPayload';
import ContractDraftEditorFields from '../ContractDraftEditorFields';
import { PAYMENT_TERMS_OPTIONS, cleanText } from '../../utils/venueDashboardUtils';
export default function VenueChatModal(props) {
  const {
    language, styles, chatModalVisible, pendingOpenContractEditorRef,
    openContractEditorFallbackTimerRef, setContractEditorVisible, reopenChatAfterContractRef,
    flushPendingContractEditor, setChatModalVisible, selectedChatEventVenueId, setSelectedChatEventVenueId,
    setChatMessages, setNewMessageText, setShowPaymentTermsModal, setShowDealTypeModal,
    setShowCancellationModal, setShowEventEndModal, refreshUnreadCount, chatScrollViewRef,
    contractLoading, contractData, contractBooking, contractDraft, setContractDraft, contractAcceptAck,
    setContractAcceptAck, contractEventEndOptions, contractEventWindowHint,
    setShowPaymentTermsModalForContract, setShowDealTypeModalForContract,
    setShowCancellationModalForContract, setShowEventEndModalForContract,
    openContractEditorFromChat, openContractPdfPreview, loadingChatMessages, chatMessages,
    handleDeleteMessage, newMessageText, sendMessage, sendingMessage, showConfirm,
  } = props;
  return (
    <Modal
            visible={chatModalVisible}
            transparent={true}
            animationType="slide"
            presentationStyle="overFullScreen"
            onDismiss={() => {
              if (!pendingOpenContractEditorRef.current) return;
              pendingOpenContractEditorRef.current = false;
              if (openContractEditorFallbackTimerRef.current) {
                clearTimeout(openContractEditorFallbackTimerRef.current);
                openContractEditorFallbackTimerRef.current = null;
              }
              setContractEditorVisible(true);
            }}
            onRequestClose={() => {
              reopenChatAfterContractRef.current = false;
              flushPendingContractEditor();
              setChatModalVisible(false);
              setSelectedChatEventVenueId(null);
              setChatMessages([]);
              setNewMessageText('');
              setContractEditorVisible(false);
              setShowPaymentTermsModal(false);
              setShowDealTypeModal(false);
              setShowCancellationModal(false);
              setShowEventEndModal(false);
              refreshUnreadCount?.();
            }}
          >
            <View style={styles.chatModalContainer}>
              <KeyboardAvoidingView
                style={styles.chatModalContent}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
              >
                <ScrollView
                  ref={chatScrollViewRef}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={true}
                  onContentSizeChange={() => {
                    if (chatScrollViewRef.current) {
                      chatScrollViewRef.current.scrollToEnd({ animated: true });
                    }
                  }}
                >
                  <View style={styles.chatHeaderContainer}>
                    <View style={styles.chatHeader}>
                      <TouchableOpacity
                        onPress={() => {
                          reopenChatAfterContractRef.current = false;
                          flushPendingContractEditor();
                          setChatModalVisible(false);
                          setSelectedChatEventVenueId(null);
                          setChatMessages([]);
                          setNewMessageText('');
                          setContractEditorVisible(false);
                          setShowPaymentTermsModal(false);
                          setShowDealTypeModal(false);
                          setShowCancellationModal(false);
                          setShowEventEndModal(false);
                          refreshUnreadCount?.();
                        }}
                        style={styles.chatCloseButton}
                      >
                        <Text style={styles.chatCloseButtonText}>✕</Text>
                      </TouchableOpacity>
                      <Text style={styles.chatHeaderTitle}>
                        {language === 'fr' ? 'Chat avec l\'organisateur' : 'Chat with organizer'}
                      </Text>
                      <View style={{ width: 40 }} />
                    </View>
                  </View>
    
                  {/* Contrat Organisateur ↔ Lieu */}
                  {selectedChatEventVenueId ? (
                    <View style={styles.contractCard}>
                    <TouchableOpacity
                      activeOpacity={0.92}
                      disabled={contractLoading || !contractData}
                      onPress={() => {
                        if (contractLoading || !contractData) return;
                        if (contractData.status === 'SENT' && contractData.sentBy === 'BOOKER') {
                          openContractEditorFromChat();
                        }
                      }}
                    >
                      <View>
                      <View style={styles.contractTopRow}>
                        <Text style={styles.contractTitle}>
                          🧾 {language === 'fr' ? 'Contrat lieu' : 'Venue contract'}
                        </Text>
                        {contractLoading ? (
                          <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                          <Text style={styles.contractStatus}>
                          {contractData?.status === 'SIGNED'
                            ? (language === 'fr' ? 'Signé' : 'Signed')
                            : contractData?.status === 'PENDING_SIGNATURE'
                              ? (language === 'fr' ? 'Signature en cours' : 'Signature pending')
                              : contractData?.status === 'PENDING_PAYMENT'
                                ? (language === 'fr' ? 'En attente paiement' : 'Awaiting payment')
                                : contractData?.status === 'SENT'
                                  ? (language === 'fr' ? 'Envoyé' : 'Sent')
                                  : (language === 'fr' ? 'Brouillon' : 'Draft')}
                          </Text>
                        )}
                      </View>
                      {contractBooking?.eventTitle ? (
                        <Text style={styles.contractMeta} numberOfLines={2}>
                          🎵 {contractBooking.eventTitle}
                        </Text>
                      ) : null}
                      <Text style={styles.contractLine}>
                        💰 {language === 'fr' ? 'Prix' : 'Price'}:{' '}
                        <Text style={styles.contractLineStrong}>
                          {contractData?.payload?.priceEur != null ? `${contractData.payload.priceEur} €` : (language === 'fr' ? 'À définir' : 'To define')}
                        </Text>
                        {contractData?.payload?.depositPercent != null ? ` • ${language === 'fr' ? 'Acompte' : 'Deposit'}: ${contractData.payload.depositPercent} %` : ''}
                      </Text>
                      {contractData?.payload?.paymentTerms ? (
                        <Text style={styles.contractSmall} numberOfLines={2}>
                          💳 {PAYMENT_TERMS_OPTIONS.find(o => o.value === contractData.payload.paymentTerms)?.[language === 'fr' ? 'labelFr' : 'labelEn'] || cleanText(contractData.payload.paymentTerms)}
                        </Text>
                      ) : null}
                      {contractData?.payload?.dealType ? (
                        <Text style={styles.contractSmall} numberOfLines={2}>
                          📋 {dealTypeLabel(contractData.payload.dealType, language)}
                        </Text>
                      ) : null}
                      {contractData?.payload?.eventEnd ? (
                        <Text style={styles.contractSmall} numberOfLines={1}>
                          🕐 {language === 'fr' ? 'Fin' : 'End'}: {cleanText(String(contractData.payload.eventEnd))}
                        </Text>
                      ) : null}
                      {contractData?.payload?.cancellation ? (
                        <Text style={styles.contractSmall} numberOfLines={4}>
                          🧯 {cleanText(cancellationPolicyLabel(contractData.payload.cancellation, language))}
                        </Text>
                      ) : null}
                      </View>
                    </TouchableOpacity>
                      {contractData?.status === 'SENT' && contractData?.sentBy === 'BOOKER' ? (
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
                            {language === 'fr' ? 'Voir le contrat (PDF)' : 'View contract (PDF)'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {contractData?.status === 'SENT' && contractData?.sentBy === 'BOOKER' ? (
                        <View style={styles.contractAckRow}>
                          <TouchableOpacity
                            style={[
                              styles.contractAckCheckbox,
                              contractAcceptAck && styles.contractAckCheckboxChecked,
                            ]}
                            onPress={() => setContractAcceptAck(!contractAcceptAck)}
                            activeOpacity={0.7}
                          >
                            {contractAcceptAck ? (
                              <Text style={styles.contractAckCheckmark}>✓</Text>
                            ) : null}
                          </TouchableOpacity>
                          <Text style={styles.contractAckText}>{contractAcceptAckLabel(language)}</Text>
                        </View>
                      ) : null}
                      <View style={styles.contractActionsRow}>
                        {contractData?.status === 'SENT' ? (
                          contractData?.sentBy === 'BOOKER' ? (
                            <>
                              <TouchableOpacity
                                style={[styles.contractButton, styles.contractButtonSecondary]}
                                onPress={openContractEditorFromChat}
                              >
                                <Text style={styles.contractButtonText}>
                                  {language === 'fr' ? 'Contre-proposer' : 'Counter'}
                                </Text>
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
                                <Text style={styles.contractButtonTextDark}>
                                  {language === 'fr' ? 'Accepter' : 'Accept'}
                                </Text>
                              </TouchableOpacity>
                            </>
                          ) : (
                            <Text style={styles.contractHint}>
                              {language === 'fr' ? 'En attente de la réponse de l\'organisateur.' : 'Waiting for organizer response.'}
                            </Text>
                          )
                        ) : contractData?.status === 'SIGNED' ? (
                          <Text style={styles.contractHint}>
                            {language === 'fr' ? '✅ Contrat signé.' : '✅ Contract signed.'}
                          </Text>
                        ) : contractData?.status === 'PENDING_PAYMENT' ? (
                          <Text style={styles.contractHint}>
                            {language === 'fr'
                              ? '💳 Contrat accepté — en attente du paiement Stripe de l’organisateur avant la signature.'
                              : '💳 Contract accepted — waiting for organizer Stripe payment before signing.'}
                          </Text>
                        ) : contractData?.status === 'PENDING_SIGNATURE' ? (
                          <Text style={styles.contractHint}>
                            {language === 'fr'
                              ? '✍️ Signature électronique en cours : un email Yousign a été envoyé aux deux parties. Le contrat sera validé une fois signé.'
                              : '✍️ Electronic signature in progress: a Yousign email was sent to both parties. The contract will be finalized once signed.'}
                          </Text>
                        ) : (
                          <Text style={styles.contractHint}>
                            {language === 'fr' ? 'En attente de l\'organisateur.' : 'Waiting for organizer.'}
                          </Text>
                        )}
                      </View>
                    </View>
                  ) : null}
    
                  {/* Messages */}
                  {loadingChatMessages ? (
                    <View style={styles.chatLoadingContainer}>
                      <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                  ) : (
                    <View style={styles.chatMessagesContainer}>
                      {chatMessages.length === 0 ? (
                        <View style={styles.chatEmptyState}>
                          <Text style={styles.chatEmptyStateText}>
                            {language === 'fr' ? 'Aucun message. Commencez la conversation !' : 'No messages yet. Start the conversation!'}
                          </Text>
                        </View>
                      ) : (
                        chatMessages.map((msg) => (
                          <View
                            key={msg.id}
                            style={[
                              styles.chatMessage,
                              msg.isOwn ? styles.chatMessageOwn : styles.chatMessageOther,
                            ]}
                          >
                            <View
                              style={[
                                styles.chatMessageBubble,
                                msg.isOwn ? styles.chatMessageBubbleOwn : styles.chatMessageBubbleOther,
                                msg.deleted && styles.chatMessageBubbleDeleted,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.chatMessageText,
                                  msg.isOwn ? styles.chatMessageTextOwn : styles.chatMessageTextOther,
                                  msg.deleted && styles.chatMessageTextDeleted,
                                ]}
                              >
                                {msg.deleted
                                  ? (language === 'fr' ? 'message supprimé' : 'message deleted')
                                  : msg.content}
                              </Text>
                              <Text
                                style={[
                                  styles.chatMessageTime,
                                  msg.isOwn ? styles.chatMessageTimeOwn : styles.chatMessageTimeOther,
                                ]}
                              >
                                {new Date(msg.createdAt).toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Text>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </ScrollView>
    
                <View style={styles.chatInputContainer}>
                  <TextInput
                    style={styles.chatInput}
                    value={newMessageText}
                    onChangeText={setNewMessageText}
                    placeholder={language === 'fr' ? 'Tapez votre message...' : 'Type your message...'}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[styles.chatSendButton, sendingMessage && styles.chatSendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={!newMessageText.trim() || sendingMessage}
                  >
                    {sendingMessage ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.chatSendButtonText}>➤</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>
  );
}
