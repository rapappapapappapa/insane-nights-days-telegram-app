import React from 'react';
import {
  StyleSheet,
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
  buildVenueContractPayload,
  buildDjContractPayload,
  contractAcceptAckLabel,
  contractReadBeforeSendLabel,
  dealTypeLabel,
} from '../../constants/contractPayload';
import ContractDraftEditorFields from '../ContractDraftEditorFields';
import Colors from '../../constants/colors';
import { PAYMENT_TERMS_OPTIONS, cleanText } from '../../utils/bookerDashboardUtils';

/** Modal chat + contrat inline (dashboard organisateur). */
export default function BookerChatModal(props) {
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
    setSelectedChatEventVenueId,
    setSelectedChatEventId,
    setIsGroupChat,
    setIsVenueChat,
    setIsPrestataireChat,
    setSelectedChatEventPrestataireId,
    setChatMessages,
    setNewMessageText,
    setShowPaymentTermsModal,
    setShowDealTypeModal,
    setShowCancellationModal,
    setShowEventEndModal,
    refreshUnreadCount,
    chatScrollViewRef,
    isGroupChat,
    isVenueChat,
    isPrestataireChat,
    contractLoading,
    contractData,
    contractDraft,
    setContractDraft,
    contractAcceptAck,
    setContractAcceptAck,
    contractDraftReadAck,
    setContractDraftReadAck,
    contractEventEndOptions,
    contractEventWindowHint,
    setShowPaymentTermsModalForContract,
    setShowDealTypeModalForContract,
    setShowCancellationModalForContract,
    setShowEventEndModalForContract,
    openContractEditorFromChat,
    openContractPdfPreview,
    djVenueGateBlocks,
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
              setSelectedChatEventVenueId(null);
              setSelectedChatEventId(null);
              setIsGroupChat(false);
              setIsVenueChat(false);
              setIsPrestataireChat(false);
              setSelectedChatEventPrestataireId(null);
              setChatMessages([]);
              setNewMessageText('');
              setContractEditorVisible(false);
              setShowPaymentTermsModal(false);
              setShowDealTypeModal(false);
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
                      setSelectedChatEventVenueId(null);
                      setSelectedChatEventId(null);
                      setIsGroupChat(false);
                      setIsVenueChat(false);
                      setChatMessages([]);
                      setNewMessageText('');
                      setContractEditorVisible(false);
                      setShowPaymentTermsModal(false);
                      setShowDealTypeModal(false);
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
    
                {/* ✅ Contrat (chat privé DJ, lieu ou prestataire) */}
                {!isGroupChat && (selectedChatEventDjId || selectedChatEventVenueId || selectedChatEventPrestataireId) ? (
                  <View style={styles.contractCard}>
                  {/* iOS : pas de Pressable parent sur les boutons — évite les touches « fantômes » (animation sans action) */}
                  <TouchableOpacity
                    activeOpacity={0.92}
                    disabled={contractLoading || !contractData}
                    onPress={() => {
                      if (contractLoading || !contractData) return;
                      if (contractData.status === 'DRAFT') openContractEditorFromChat();
                      else if (
                        contractData.status === 'SENT' &&
                        (isVenueChat ? contractData.sentBy === 'VENUE' : isPrestataireChat ? contractData.sentBy === 'PRESTATAIRE' : contractData.sentBy === 'DJ')
                      ) {
                        openContractEditorFromChat();
                      }
                    }}
                  >
                    <View>
                    <View style={styles.contractTopRow}>
                      <Text style={styles.contractTitle}>
                        🧾 {isVenueChat
                          ? (language === 'fr' ? 'Contrat lieu' : 'Venue contract')
                          : isPrestataireChat
                            ? (language === 'fr' ? 'Contrat prestataire' : 'Provider contract')
                            : (language === 'fr' ? 'Contrat de booking' : 'Booking contract')}
                      </Text>
                      {contractLoading ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <Text style={styles.contractStatus}>
                          {contractData?.status === 'SIGNED'
                            ? (language === 'fr' ? 'Signé' : 'Signed')
                            : contractData?.status === 'PENDING_SIGNATURE'
                              ? (language === 'fr' ? 'Signature en cours' : 'Signature pending')
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
                    {isVenueChat && contractData?.payload?.dealType ? (
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
    
                    {djVenueGateBlocks ? (
                      <Text style={styles.contractHint}>
                        {language === 'fr'
                          ? 'Le contrat avec le lieu doit être accepté avant de finaliser le contrat DJ.'
                          : 'The venue contract must be accepted before the DJ contract can be finalized.'}
                      </Text>
                    ) : null}
                    </View>
                  </TouchableOpacity>
    
                    {contractData?.status === 'DRAFT' ? (
                      <TouchableOpacity
                        style={[styles.contractButton, styles.contractButtonSecondary, styles.contractPdfPreviewBtn]}
                        onPress={() =>
                          openContractPdfPreview({
                            previewPayload: isVenueChat
                              ? buildVenueContractPayload(contractDraft)
                              : buildDjContractPayload(contractDraft),
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
    
                    {contractData?.status === 'DRAFT' ? (
                      <View style={styles.contractAckRow}>
                        <TouchableOpacity
                          style={[
                            styles.contractAckCheckbox,
                            contractDraftReadAck && styles.contractAckCheckboxChecked,
                          ]}
                          onPress={() => setContractDraftReadAck(!contractDraftReadAck)}
                          activeOpacity={0.7}
                        >
                          {contractDraftReadAck ? (
                            <Text style={styles.contractAckCheckmark}>✓</Text>
                          ) : null}
                        </TouchableOpacity>
                        <Text style={styles.contractAckText}>{contractReadBeforeSendLabel(language)}</Text>
                      </View>
                    ) : null}
    
                    {contractData?.status === 'SENT' &&
                    (isVenueChat ? contractData?.sentBy === 'VENUE' : isPrestataireChat ? contractData?.sentBy === 'PRESTATAIRE' : contractData?.sentBy === 'DJ') ? (
                      <TouchableOpacity
                        style={[styles.contractButton, styles.contractButtonSecondary, styles.contractPdfPreviewBtn]}
                        onPress={() =>
                          openContractPdfPreview({
                            previewPayload: isVenueChat
                              ? buildVenueContractPayload(contractDraft)
                              : buildDjContractPayload(contractDraft),
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
    
                    {contractData?.status === 'SENT' &&
                    (isVenueChat ? contractData?.sentBy === 'VENUE' : isPrestataireChat ? contractData?.sentBy === 'PRESTATAIRE' : contractData?.sentBy === 'DJ') ? (
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
                      {contractData?.status === 'DRAFT' ? (
                        <>
                          <TouchableOpacity
                            style={[styles.contractButton, styles.contractButtonSecondary]}
                            onPress={openContractEditorFromChat}
                          >
                            <Text style={styles.contractButtonText}>
                              {language === 'fr' ? 'Modifier' : 'Edit'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.contractButton,
                              styles.contractButtonPrimary,
                              !contractDraftReadAck && { opacity: 0.45 },
                            ]}
                            onPress={() =>
                              openContractPdfPreview({
                                previewPayload: isVenueChat
                                  ? buildVenueContractPayload(contractDraft)
                                  : buildDjContractPayload(contractDraft),
                                pendingAction: 'send',
                              })
                            }
                            disabled={!contractDraftReadAck}
                          >
                            <Text style={styles.contractButtonTextDark}>
                              {isVenueChat
                                ? (language === 'fr' ? 'Envoyer au lieu' : 'Send to venue')
                                : (language === 'fr' ? 'Envoyer au DJ' : 'Send to DJ')}
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : contractData?.status === 'SENT' ? (
                        (isVenueChat ? contractData?.sentBy === 'VENUE' : isPrestataireChat ? contractData?.sentBy === 'PRESTATAIRE' : contractData?.sentBy === 'DJ') ? (
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
                                  previewPayload: isVenueChat
                                    ? buildVenueContractPayload(contractDraft)
                                    : buildDjContractPayload(contractDraft),
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
                            {isVenueChat
                              ? (language === 'fr' ? "En attente de l’acceptation du lieu." : 'Waiting for venue acceptance.')
                              : (language === 'fr' ? "En attente de l’acceptation du DJ." : 'Waiting for DJ acceptance.')}
                          </Text>
                        )
                      ) : contractData?.status === 'PENDING_SIGNATURE' ? (
                        <Text style={styles.contractHint}>
                          {language === 'fr'
                            ? '✍️ Signature électronique en cours : un email Yousign a été envoyé aux deux parties. Le contrat sera validé une fois signé.'
                            : '✍️ Electronic signature in progress: a Yousign email was sent to both parties. The contract will be finalized once signed.'}
                        </Text>
                      ) : (
                        <Text style={styles.contractHint}>
                          {language === 'fr' ? '✅ Contrat signé.' : '✅ Contract signed.'}
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
