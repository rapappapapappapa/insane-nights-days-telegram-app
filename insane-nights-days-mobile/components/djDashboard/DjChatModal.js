import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { normalizeMediaUrl } from '../../api/config';
import {
  buildDjContractPayload,
  contractAcceptAckLabel,
  cancellationPolicyLabel,
} from '../../constants/contractPayload';
import Colors from '../../constants/colors';
import { PAYMENT_TERMS_OPTIONS, cleanText } from '../../utils/djDashboardUtils';

/** Modal chat + contrat inline (dashboard DJ). */
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
    isGroupChat,
    selectedChatEventDjId,
    contractLoading,
    contractData,
    contractDraft,
    contractAcceptAck,
    setContractAcceptAck,
    contractBooking,
    venueContractGate,
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
              setSelectedChatEventDjId(null);
              setSelectedChatEventId(null);
              setIsGroupChat(false);
              setChatMessages([]);
              setNewMessageText('');
              setContractEditorVisible(false);
              setShowPaymentTermsModal(false);
              setShowCancellationModal(false);
              setShowEventEndModal(false);
              // Rafraîchir le compteur après fermeture
              refreshUnreadCount();
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
                {/* Header du chat */}
                <View style={styles.chatHeaderContainer}>
                <View style={styles.chatHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      reopenChatAfterContractRef.current = false;
                      flushPendingContractEditor();
                      setChatModalVisible(false);
                      setSelectedChatEventDjId(null);
                      setSelectedChatEventId(null);
                      setIsGroupChat(false);
                      setChatMessages([]);
                      setNewMessageText('');
                      setContractEditorVisible(false);
                      setShowPaymentTermsModal(false);
                      setShowCancellationModal(false);
                      setShowEventEndModal(false);
                      // Rafraîchir le compteur après fermeture
                      refreshUnreadCount();
                    }}
                    style={styles.chatCloseButton}
                  >
                    <Text style={styles.chatCloseButtonText}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.chatHeaderTitle}>
                    {isGroupChat 
                      ? (language === 'fr' ? 'Chat de groupe' : 'Group chat')
                      : (language === 'fr' ? 'Chat' : 'Chat')
                    }
                  </Text>
                  <View style={{ width: 40 }} />
                </View>
                </View>
    
                {/* ✅ Contrat (uniquement chat privé) */}
                {!isGroupChat && selectedChatEventDjId ? (
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
                        🧾 {language === 'fr' ? 'Contrat de booking' : 'Booking contract'}
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
    
                    {djVenueGateBlocks ? (
                      <Text style={styles.contractHint}>
                        {language === 'fr'
                          ? 'Le contrat avec le lieu doit être accepté avant de finaliser ton contrat.'
                          : 'The venue contract must be accepted before you can finalize your contract.'}
                      </Text>
                    ) : null}
                    </View>
                  </TouchableOpacity>
    
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
                                {language === 'fr' ? 'Accepter' : 'Accept'}
                              </Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <Text style={styles.contractHint}>
                            {language === 'fr'
                              ? 'En attente de la réponse de l\'organisateur.'
                              : 'Waiting for organizer response.'}
                          </Text>
                        )
                      ) : contractData?.status === 'SIGNED' ? (
                        <Text style={styles.contractHint}>
                          {language === 'fr' ? '✅ Contrat signé.' : '✅ Contract signed.'}
                        </Text>
                      ) : contractData?.status === 'PENDING_PAYMENT' ? (
                        <Text style={styles.contractHint}>
                          {language === 'fr'
                            ? '💳 Contrat accepté par les deux parties — en attente du paiement Stripe de l’organisateur avant la signature.'
                            : '💳 Both parties accepted — waiting for organizer Stripe payment before signing.'}
                        </Text>
                      ) : contractData?.status === 'PENDING_SIGNATURE' ? (
                        <Text style={styles.contractHint}>
                          {language === 'fr'
                            ? '✍️ Signature électronique en cours : un email Yousign a été envoyé aux deux parties. Le contrat sera validé une fois signé.'
                            : '✍️ Electronic signature in progress: a Yousign email was sent to both parties. The contract will be finalized once signed.'}
                        </Text>
                      ) : (
                        <Text style={styles.contractHint}>
                          {language === 'fr'
                            ? 'En attente de l\'organisateur.'
                            : 'Waiting for organizer.'}
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
                                {new Date(msg.createdAt).toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
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
                      // Scroll vers le bas quand on focus l'input
                      setTimeout(() => {
                        if (chatScrollViewRef.current) {
                          chatScrollViewRef.current.scrollToEnd({ animated: true });
                        }
                      }, 100);
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
          </Modal>
  );
}
