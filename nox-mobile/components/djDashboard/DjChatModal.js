import React, { useEffect, useRef, useState } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  BackHandler,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normalizeMediaUrl } from '../../api/config';
import {
  buildDjContractPayload,
  contractAcceptAckLabel,
  cancellationPolicyLabel,
} from '../../constants/contractPayload';
import Colors from '../../constants/colors';
import { PAYMENT_TERMS_OPTIONS, cleanText } from '../../utils/djDashboardUtils';

/** Modal chat + contrat replié (dashboard DJ). */
function contractStatusLabel(status, fr) {
  if (status === 'SIGNED') return fr ? 'Signé' : 'Signed';
  if (status === 'PENDING_SIGNATURE') return fr ? 'Signature en cours' : 'Signature pending';
  if (status === 'PENDING_PAYMENT') return fr ? 'En attente paiement' : 'Awaiting payment';
  if (status === 'SENT') return fr ? 'Envoyé' : 'Sent';
  return fr ? 'Brouillon' : 'Draft';
}

export default function DjChatModal(props) {
  const {
    language,
    styles,
    navigate,
    showConfirm,
    chatModalVisible,
    pendingOpenContractEditorRef,
    openContractEditorFallbackTimerRef,
    setContractEditorVisible,
    reopenChatAfterContractRef,
    flushPendingContractEditor,
    setChatModalVisible,
    setSelectedChatEventDjId,
    setSelectedChatEventId,
    setIsGroupChat,
    setChatMessages,
    setNewMessageText,
    setShowPaymentTermsModal,
    setShowCancellationModal,
    setShowEventEndModal,
    refreshUnreadCount,
    chatScrollViewRef,
    chatClosingRef,
    isGroupChat,
    selectedChatEventDjId,
    contractLoading,
    contractData,
    contractDraft,
    contractAcceptAck,
    setContractAcceptAck,
    contractBooking,
    djVenueGateBlocks,
    openContractEditorFromChat,
    openContractPdfPreview,
    loadingChatMessages,
    chatMessages,
    handleDeleteMessage,
    newMessageText,
    sendMessage,
    sendingMessage,
  } = props;

  const [contractOpen, setContractOpen] = useState(false);
  const [retained, setRetained] = useState(false);
  const fr = language === 'fr';
  const insets = useSafeAreaInsets();
  const topGap = Math.max(insets.top, 0);
  const chatVisibleRef = useRef(chatModalVisible);
  chatVisibleRef.current = chatModalVisible;
  const closeChatRef = useRef(() => {});
  const wasVisibleRef = useRef(false);
  const releaseRef = useRef(() => {});
  releaseRef.current = () => {
    if (chatVisibleRef.current || reopenChatAfterContractRef?.current) return;
    setRetained(false);
    setContractOpen(false);
    setSelectedChatEventDjId(null);
    setSelectedChatEventId(null);
    setIsGroupChat(false);
    setChatMessages([]);
    setNewMessageText('');
    setContractEditorVisible(false);
    setShowPaymentTermsModal(false);
    setShowCancellationModal(false);
    setShowEventEndModal(false);
    refreshUnreadCount?.();
  };

  if (chatModalVisible && !retained) {
    setRetained(true);
  }

  useEffect(() => {
    const wasVisible = wasVisibleRef.current;
    wasVisibleRef.current = chatModalVisible;
    if (chatModalVisible && chatClosingRef) chatClosingRef.current = false;
    if (!wasVisible || chatModalVisible || reopenChatAfterContractRef?.current) {
      return undefined;
    }
    const timer = setTimeout(() => releaseRef.current(), 400);
    return () => clearTimeout(timer);
  }, [chatModalVisible, chatClosingRef, reopenChatAfterContractRef]);

  useEffect(() => {
    setContractOpen(false);
  }, [selectedChatEventDjId, isGroupChat]);

  useEffect(() => {
    if (!chatModalVisible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeChatRef.current();
      return true;
    });
    return () => sub.remove();
  }, [chatModalVisible]);

  const scrollChatToEnd = (animated) => {
    if (chatClosingRef?.current || !chatVisibleRef.current) return;
    const node = chatScrollViewRef?.current;
    if (!node?.scrollToEnd) return;
    node.scrollToEnd({ animated });
  };

  const closeChat = () => {
    if (chatClosingRef) chatClosingRef.current = true;
    reopenChatAfterContractRef.current = false;
    flushPendingContractEditor?.();
    setChatModalVisible(false);
  };
  closeChatRef.current = closeChat;

  if (!chatModalVisible && !retained) return null;

  return (
          <View
            pointerEvents={chatModalVisible ? 'auto' : 'none'}
            style={[overlayStyle, !chatModalVisible && hiddenOverlayStyle]}
          >
            <View style={styles.chatModalContainer}>
              <KeyboardAvoidingView
                style={[styles.chatModalContent, { marginTop: topGap, paddingBottom: insets.bottom + 96 }]}
                behavior={undefined}
                keyboardVerticalOffset={0}
              >
                <View style={styles.chatHeaderContainer}>
                <View style={styles.chatHeader}>
                  <TouchableOpacity
                    onPress={closeChat}
                    style={styles.chatCloseButton}
                  >
                    <Text style={styles.chatCloseButtonText}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.chatHeaderTitle}>
                    {isGroupChat
                      ? (fr ? 'Chat de groupe' : 'Group chat')
                      : (fr ? 'Discussion' : 'Discussion')}
                  </Text>
                  <View style={{ width: 40 }} />
                </View>
                </View>
                <ScrollView
                  ref={chatScrollViewRef}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                >
    
                {!isGroupChat && selectedChatEventDjId ? (
                  <View style={styles.contractCard}>
                    <TouchableOpacity
                      activeOpacity={0.92}
                      onPress={() => setContractOpen((open) => !open)}
                      accessibilityRole="button"
                      accessibilityLabel={fr ? 'Contrat' : 'Contract'}
                    >
                      <View style={styles.contractTopRow}>
                        <Text style={styles.contractTitle}>
                          {fr ? 'Contrat' : 'Contract'}
                        </Text>
                        {contractLoading ? (
                          <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                          <Text style={styles.contractStatus}>
                            {contractStatusLabel(contractData?.status, fr)}
                            {contractOpen ? '  ▾' : '  ▸'}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    {contractOpen ? (
                      <View>
                        {contractBooking?.eventTitle ? (
                          <Text style={styles.contractMeta} numberOfLines={2}>
                            {contractBooking.eventTitle}
                          </Text>
                        ) : null}

                        <Text style={styles.contractLine}>
                          {fr ? 'Prix' : 'Price'}:{' '}
                          <Text style={styles.contractLineStrong}>
                            {contractData?.payload?.priceEur != null ? `${contractData.payload.priceEur} €` : (fr ? 'À définir' : 'To define')}
                          </Text>
                          {contractData?.payload?.depositPercent != null ? ` • ${fr ? 'Acompte' : 'Deposit'}: ${contractData.payload.depositPercent} %` : ''}
                        </Text>

                        {contractData?.payload?.paymentTerms ? (
                          <Text style={styles.contractSmall} numberOfLines={2}>
                            {PAYMENT_TERMS_OPTIONS.find(o => o.value === contractData.payload.paymentTerms)?.[fr ? 'labelFr' : 'labelEn'] || cleanText(contractData.payload.paymentTerms)}
                          </Text>
                        ) : null}
                        {contractData?.payload?.eventEnd ? (
                          <Text style={styles.contractSmall} numberOfLines={1}>
                            {fr ? 'Fin' : 'End'}: {cleanText(String(contractData.payload.eventEnd))}
                          </Text>
                        ) : null}
                        {contractData?.payload?.cancellation ? (
                          <Text style={styles.contractSmall} numberOfLines={4}>
                            {cleanText(cancellationPolicyLabel(contractData.payload.cancellation, language))}
                          </Text>
                        ) : null}

                        {djVenueGateBlocks ? (
                          <Text style={styles.contractHint}>
                            {fr
                              ? 'Le contrat avec le lieu doit être accepté avant de finaliser ton contrat.'
                              : 'The venue contract must be accepted before you can finalize your contract.'}
                          </Text>
                        ) : null}

                        {contractData?.status === 'SENT' && contractData?.sentBy === 'BOOKER' ? (
                          <TouchableOpacity
                            style={[styles.contractButton, styles.contractButtonSecondary, styles.contractPdfPreviewBtn]}
                            onPress={() =>
                              openContractPdfPreview({
                                previewPayload: buildDjContractPayload(contractDraft),
                                pendingAction: 'preview',
                              })
                            }
                            activeOpacity={0.85}
                          >
                            <Text style={styles.contractButtonText}>
                              {fr ? 'Voir le contrat (PDF)' : 'View contract (PDF)'}
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
                                    {fr ? 'Contre-proposer' : 'Counter'}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[
                                    styles.contractButton,
                                    styles.contractButtonPrimary,
                                    (djVenueGateBlocks || !contractAcceptAck) && { opacity: 0.45 },
                                  ]}
                                  onPress={() =>
                                    openContractPdfPreview({
                                      previewPayload: buildDjContractPayload(contractDraft),
                                      pendingAction: 'accept',
                                    })
                                  }
                                  disabled={djVenueGateBlocks || !contractAcceptAck}
                                >
                                  <Text style={styles.contractButtonTextDark}>
                                    {fr ? 'Accepter' : 'Accept'}
                                  </Text>
                                </TouchableOpacity>
                              </>
                            ) : (
                              <Text style={styles.contractHint}>
                                {fr
                                  ? 'En attente de la réponse de l\'organisateur.'
                                  : 'Waiting for organizer response.'}
                              </Text>
                            )
                          ) : contractData?.status === 'SIGNED' ? (
                            <Text style={styles.contractHint}>
                              {fr ? 'Contrat signé.' : 'Contract signed.'}
                            </Text>
                          ) : contractData?.status === 'PENDING_PAYMENT' ? (
                            <Text style={styles.contractHint}>
                              {fr
                                ? 'Contrat accepté. L’organisateur paie depuis son tableau de bord.'
                                : 'Contract accepted. The organizer pays from their dashboard.'}
                            </Text>
                          ) : contractData?.status === 'PENDING_SIGNATURE' ? (
                            <Text style={styles.contractHint}>
                              {fr
                                ? 'Signature en cours. Un email a été envoyé aux deux parties.'
                                : 'Signature in progress. An email was sent to both parties.'}
                            </Text>
                          ) : (
                            <Text style={styles.contractHint}>
                              {fr
                                ? 'En attente de l\'organisateur.'
                                : 'Waiting for organizer.'}
                            </Text>
                          )}
                        </View>
                      </View>
                    ) : null}
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
                          {language === 'fr' 
                            ? 'Aucun message pour le moment. Commencez la conversation !' 
                            : 'No messages yet. Start the conversation!'}
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
                          {!msg.isOwn && msg.senderInfo && (
                            <TouchableOpacity
                              style={styles.chatMessageSender}
                              activeOpacity={0.8}
                              onPress={() => {
                                if (msg.senderInfo.type === 'DJ') {
                                  navigate('djProfile', { djId: msg.senderId });
                                }
                              }}
                            >
                              {msg.senderInfo.image ? (
                                <Image
                                  source={{ uri: normalizeMediaUrl(msg.senderInfo.image) }}
                                  style={styles.chatMessageAvatar}
                                />
                              ) : (
                                <View style={[styles.chatMessageAvatar, styles.chatMessageAvatarPlaceholder]}>
                                  <Text style={styles.chatMessageAvatarText}>
                                    {msg.senderInfo.name ? msg.senderInfo.name.charAt(0).toUpperCase() : '?'}
                                  </Text>
                                </View>
                              )}
                              <Text style={styles.chatMessageSenderName}>
                                {msg.senderInfo.name || (msg.senderInfo.type === 'BOOKER' ? 'Organisateur' : 'DJ')}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onLongPress={() => {
                              if (!msg.isOwn || msg.deleted) return;
                              showConfirm(
                                language === 'fr' ? 'Supprimer le message' : 'Delete message',
                                language === 'fr'
                                  ? 'Voulez-vous supprimer ce message ? Il sera remplacé par "message supprimé".'
                                  : 'Do you want to delete this message? It will be replaced by "message deleted".',
                                [
                                  { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
                                  { text: language === 'fr' ? 'Supprimer' : 'Delete', style: 'destructive', onPress: () => handleDeleteMessage(msg.id) },
                                ]
                              );
                            }}
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
                                  ? language === 'fr'
                                    ? 'message supprimé'
                                    : 'message deleted'
                                  : msg.content}
                              </Text>
                              <Text
                                style={[
                                  styles.chatMessageTime,
                                  msg.isOwn ? styles.chatMessageTimeOwn : styles.chatMessageTimeOther,
                                ]}
                              >
                                {(() => {
                                  const date = new Date(msg.createdAt);
                                  if (Number.isNaN(date.getTime())) return '';
                                  try {
                                    return date.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    });
                                  } catch (_) {
                                    return '';
                                  }
                                })()}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                )}
    
                </ScrollView>
    
                {/* Input pour envoyer un message */}
                <View style={styles.chatInputContainer}>
                  <TextInput
                    style={styles.chatInput}
                    value={newMessageText}
                    onChangeText={setNewMessageText}
                    placeholder={language === 'fr' ? 'Tapez votre message...' : 'Type your message...'}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    multiline
                    maxLength={500}
                    onFocus={() => {
                      setTimeout(() => scrollChatToEnd(true), 100);
                    }}
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
          </View>
  );
}

const overlayStyle = [
  StyleSheet.absoluteFillObject,
  { zIndex: 40, elevation: 40 },
];

const hiddenOverlayStyle = {
  opacity: 0,
  zIndex: 0,
  elevation: 0,
};
