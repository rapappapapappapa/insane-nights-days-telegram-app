import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Colors from '../../constants/colors';

/** Modal chat + contrat inline (dashboard prestataire). */
export default function PrestataireChatModal({
  language,
  styles,
  chatModalVisible,
  setChatModalVisible,
  chatScrollRef,
  loadingChat,
  chatMessages,
  contractLoading,
  contractData,
  canCounter,
  setContractEditorVisible,
  acceptContract,
  newMessageText,
  setNewMessageText,
  sendMessage,
  sendingMessage,
}) {
  return (
    <Modal visible={chatModalVisible} animationType="slide" onRequestClose={() => setChatModalVisible(false)}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setChatModalVisible(false)}>
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {language === 'fr' ? 'Conversation' : 'Conversation'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          ref={chatScrollRef}
          style={{ flex: 1, padding: 12 }}
          onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
        >
          {loadingChat ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            chatMessages.map((m) => (
              <View
                key={m.id}
                style={[styles.msgRow, m.isOwn ? styles.msgOwn : styles.msgOther]}
              >
                <Text style={styles.msgText}>{m.content}</Text>
              </View>
            ))
          )}

          <View style={styles.contractBox}>
            <Text style={styles.contractTitle}>🧾 {language === 'fr' ? 'Contrat' : 'Contract'}</Text>
            {contractLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Text style={styles.cardMeta}>
                  {language === 'fr' ? 'Statut' : 'Status'}:{' '}
                  {contractData?.status === 'SIGNED'
                    ? (language === 'fr' ? 'Signé' : 'Signed')
                    : contractData?.status === 'PENDING_SIGNATURE'
                      ? (language === 'fr' ? 'Signature en cours' : 'Signature pending')
                      : contractData?.status === 'SENT'
                        ? (language === 'fr' ? 'Envoyé' : 'Sent')
                        : contractData?.status === 'DRAFT'
                          ? (language === 'fr' ? 'Brouillon' : 'Draft')
                          : contractData?.status || '—'}
                </Text>
                {contractData?.status === 'PENDING_SIGNATURE' ? (
                  <Text style={styles.cardMeta}>
                    {language === 'fr'
                      ? '✍️ Signature électronique envoyée par email (Yousign).'
                      : '✍️ Electronic signature sent by email (Yousign).'}
                  </Text>
                ) : null}
                {canCounter && (
                  <>
                    <TouchableOpacity
                      style={styles.chatBtn}
                      onPress={() => setContractEditorVisible(true)}
                    >
                      <Text style={styles.chatBtnText}>
                        {language === 'fr' ? 'Contre-proposer' : 'Counter-offer'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.chatBtn, { marginTop: 8 }]} onPress={acceptContract}>
                      <Text style={styles.chatBtnText}>
                        {language === 'fr' ? 'Accepter' : 'Accept'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Message…' : 'Message…'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={newMessageText}
            onChangeText={setNewMessageText}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={sendingMessage}>
            <Text style={styles.sendBtnText}>{language === 'fr' ? 'Envoyer' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
