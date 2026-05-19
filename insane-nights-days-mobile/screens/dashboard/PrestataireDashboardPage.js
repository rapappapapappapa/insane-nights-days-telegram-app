import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Colors from '../../constants/colors';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import { useChatPoll } from '../../hooks/useChatPoll';
import {
  draftFromPayload,
  buildDjContractPayload,
  buildEventEndTimeOptions,
  formatEventWindowHint,
} from '../../constants/contractPayload';
import ContractDraftEditorFields from '../../components/ContractDraftEditorFields';
import CancellationPolicyPickerModal from '../../components/CancellationPolicyPickerModal';
import EventEndTimePickerModal from '../../components/EventEndTimePickerModal';

/**
 * Dashboard prestataire : réservations (EventPrestataire), chat privé et contrat (logique proche du lieu / DJ).
 */
const PAYMENT_TERMS_OPTIONS = [
  { value: 'jour_booking', labelFr: 'Jour booking', labelEn: 'Booking day' },
  { value: 'j-1_prestation', labelFr: 'J-1 prestation', labelEn: 'D-1 performance' },
  { value: 'j+1_prestation', labelFr: 'J+1 prestation', labelEn: 'D+1 performance' },
  { value: 'j+15', labelFr: 'J+15', labelEn: 'D+15' },
  { value: 'j+30', labelFr: 'J+30', labelEn: 'D+30' },
];

export default function PrestataireDashboardPage() {
  const { language } = useLanguage();
  const { goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { height: windowH } = useWindowDimensions();
  const contractEditorModalCardHeight = Math.round(windowH * 0.88);

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedEpId, setSelectedEpId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const chatScrollRef = useRef(null);

  const [contractLoading, setContractLoading] = useState(false);
  const [contractData, setContractData] = useState(null);
  const [contractBooking, setContractBooking] = useState(null);
  const [contractDraft, setContractDraft] = useState(() => draftFromPayload({}, 'dj'));
  const [contractEditorVisible, setContractEditorVisible] = useState(false);

  const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showEventEndModal, setShowEventEndModal] = useState(false);

  const contractEventEndOptions = useMemo(
    () => buildEventEndTimeOptions(contractBooking?.eventTime, contractBooking?.durationHours, 30),
    [contractBooking?.eventTime, contractBooking?.durationHours]
  );
  const contractEventWindowHint = useMemo(
    () => formatEventWindowHint(contractBooking?.eventTime, contractBooking?.durationHours, language),
    [contractBooking?.eventTime, contractBooking?.durationHours, language]
  );

  const shouldOpenBookings = !!routeParams?.openBookings || !!routeParams?.openChatEventPrestataireId;

  const fetchBookings = useCallback(async () => {
    if (!user?.token) return;
    setLoadingBookings(true);
    try {
      const res = await api.getPrestataireBookings(user.token);
      if (res?.success) setBookings(res.bookings || []);
      else setBookings([]);
    } catch (e) {
      console.error('[PrestataireDashboard] fetchBookings', e);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, [user?.token]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const loadChatMessages = async (eventPrestataireId, options = {}) => {
    const silent = options.silent === true;
    if (!user?.token || !eventPrestataireId) return;
    if (!silent) setLoadingChat(true);
    try {
      const res = await api.getPrestataireMessages(user.token, eventPrestataireId);
      if (res?.success && Array.isArray(res.messages)) {
        setChatMessages(res.messages);
        if (!silent) {
          setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 80);
        }
      }
    } catch (e) {
      console.error('[PrestataireDashboard] loadChatMessages', e);
    } finally {
      if (!silent) setLoadingChat(false);
    }
  };

  const pollRef = useRef(() => {});
  pollRef.current = () => {
    if (!chatModalVisible || !selectedEpId || !user?.token) return;
    loadChatMessages(selectedEpId, { silent: true });
  };
  useChatPoll({ active: chatModalVisible && !!user?.token && !!selectedEpId, pollRef });

  const loadPrestataireContract = async (eventPrestataireId) => {
    if (!user?.token || !eventPrestataireId) return;
    setContractLoading(true);
    try {
      const res = await api.getPrestataireContract(user.token, eventPrestataireId);
      if (res?.success) {
        setContractData(res.contract || null);
        setContractBooking(res.booking || null);
        const p = res.contract?.payload || {};
        setContractDraft(draftFromPayload(p, 'dj'));
      }
    } catch (e) {
      console.error('[PrestataireDashboard] loadPrestataireContract', e);
    } finally {
      setContractLoading(false);
    }
  };

  const openChat = async (eventPrestataireId) => {
    setSelectedEpId(eventPrestataireId);
    setChatModalVisible(true);
    setChatMessages([]);
    await loadChatMessages(eventPrestataireId);
    await api.markAllMessagesAsRead(user.token).catch(() => {});
    await loadPrestataireContract(eventPrestataireId);
  };

  useEffect(() => {
    if (!user?.token) return;
    const id = routeParams?.openChatEventPrestataireId;
    if (id) openChat(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, routeParams?.openChatEventPrestataireId]);

  const sendMessage = async () => {
    if (!user?.token || !newMessageText.trim() || sendingMessage || !selectedEpId) return;
    const t = newMessageText.trim();
    setNewMessageText('');
    setSendingMessage(true);
    try {
      const res = await api.sendPrestataireMessage(user.token, selectedEpId, t);
      if (res?.success) await loadChatMessages(selectedEpId);
    } catch (e) {
      console.error('[PrestataireDashboard] sendMessage', e);
    } finally {
      setSendingMessage(false);
    }
  };

  const acceptContract = async () => {
    if (!user?.token || !selectedEpId) return;
    try {
      const res = await api.acceptPrestataireContract(user.token, selectedEpId);
      if (res?.success) await loadPrestataireContract(selectedEpId);
    } catch (e) {
      console.error('[PrestataireDashboard] acceptContract', e);
    }
  };

  const counterContract = async () => {
    if (!user?.token || !selectedEpId) return;
    try {
      const payload = buildDjContractPayload(contractDraft);
      const res = await api.counterPrestataireContract(user.token, selectedEpId, payload);
      if (res?.success) {
        setContractEditorVisible(false);
        await loadPrestataireContract(selectedEpId);
      }
    } catch (e) {
      console.error('[PrestataireDashboard] counterContract', e);
    }
  };

  const epSentBy = contractData?.sentBy;
  const canCounter =
    contractData?.status === 'SENT' && epSentBy === 'BOOKER';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {language === 'fr' ? 'Mes prestations' : 'My bookings'}
        </Text>
        {shouldOpenBookings ? null : null}
        {loadingBookings ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
        ) : bookings.length === 0 ? (
          <Text style={styles.hint}>
            {language === 'fr' ? 'Aucune invitation pour le moment.' : 'No invitations yet.'}
          </Text>
        ) : (
          bookings.map((b) => (
            <View key={b.eventPrestataireId} style={styles.card}>
              <Text style={styles.cardTitle}>{b.eventTitle}</Text>
              <Text style={styles.cardMeta}>
                {new Date(b.eventDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')} · {b.eventTime}
              </Text>
              <Text style={styles.cardMeta}>{b.invitationStatus}</Text>
              <TouchableOpacity style={styles.chatBtn} onPress={() => openChat(b.eventPrestataireId)}>
                <Text style={styles.chatBtnText}>💬 {language === 'fr' ? 'Chat & contrat' : 'Chat & contract'}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

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
                  style={[
                    styles.msgRow,
                    m.isOwn ? styles.msgOwn : styles.msgOther,
                  ]}
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
                    {language === 'fr' ? 'Statut' : 'Status'}: {contractData?.status || '—'}
                  </Text>
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

      <Modal visible={contractEditorVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={styles.contractModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.contractModalCard, { height: contractEditorModalCardHeight, maxWidth: 520, alignSelf: 'center' }]}>
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
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowPaymentTermsModal(false)} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  content: { padding: 24 },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },
  hint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 15,
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cardTitle: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  cardMeta: { color: 'rgba(255,255,255,0.7)', marginTop: 4, fontSize: 14 },
  chatBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  chatBtnText: { color: '#fff', fontWeight: '700' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  msgRow: { marginBottom: 8, padding: 10, borderRadius: 10, maxWidth: '92%' },
  msgOwn: { alignSelf: 'flex-end', backgroundColor: 'rgba(255,23,68,0.25)' },
  msgOther: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)' },
  msgText: { color: Colors.text },
  contractBox: { marginTop: 20, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  contractTitle: { color: Colors.text, fontWeight: '800', marginBottom: 8 },
  inputRow: { flexDirection: 'row', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: Colors.text,
  },
  sendBtn: { justifyContent: 'center', paddingHorizontal: 14, backgroundColor: Colors.primary, borderRadius: 10 },
  sendBtnText: { color: '#fff', fontWeight: '700' },
  contractModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  contractModalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.25)',
    backgroundColor: Colors.background,
  },
  contractModalTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  contractModalLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  contractModalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    backgroundColor: 'rgba(255,255,255,0.04)',
    fontSize: 13,
  },
  contractModalDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contractModalInputText: {
    color: Colors.text,
    fontSize: 13,
    flex: 1,
  },
  contractModalChevron: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginLeft: 8,
  },
  contractButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  contractButtonSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  contractButtonText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  contractButtonTextDark: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '900',
  },
  contractModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  paymentTermsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 18,
  },
  paymentTermsModalContent: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  paymentTermsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  paymentTermsOptionSelected: {
    borderColor: 'rgba(255,23,68,0.5)',
    backgroundColor: 'rgba(255,23,68,0.1)',
  },
  paymentTermsOptionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  paymentTermsOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '800',
  },
  paymentTermsCheck: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  paymentTermsClose: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
