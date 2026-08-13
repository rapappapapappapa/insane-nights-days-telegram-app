import React, { useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLieuxData } from '../../hooks/useLieuxData';
import { useVenueBookingChat } from '../../hooks/useVenueBookingChat';
import { useVenueBookingContract } from '../../hooks/useVenueBookingContract';
import LieuxBookingContractPanel from '../../components/lieux/LieuxBookingContractPanel';
import { useToast } from '../../hooks/useToast';
import { NoxText } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { formatEventDateLabel } from '../../utils/noxDiscoverUtils';
import { findBookingByEventVenueId } from '../../utils/lieuxEventUtils';

const CHAT_BG = '#0a0a0c';

function MessageBubble({ message, fr }) {
  const own = message.isOwn;
  const content = message.deleted
    ? fr
      ? 'Message supprimé'
      : 'Deleted message'
    : message.content;

  return (
    <View style={[styles.bubbleRow, own && styles.bubbleRowOwn]}>
      {!own ? (
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={16} color={Colors.textTertiary} />
        </View>
      ) : null}
      <View style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther]}>
        <NoxText variant="form" style={own ? styles.bubbleTextOwn : styles.bubbleTextOther}>
          {content}
        </NoxText>
        {!message.deleted && message.createdAt ? (
          <NoxText variant="secondary" style={[styles.bubbleTime, own && styles.bubbleTimeOwn]}>
            {new Date(message.createdAt).toLocaleTimeString(fr ? 'fr-FR' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </NoxText>
        ) : null}
      </View>
    </View>
  );
}

export default function LieuxBookingChatPage() {
  const { goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { showError, showSuccess } = useToast();
  const fr = language === 'fr';

  const contractEditorModalCardHeight = useMemo(() => {
    const h = Dimensions.get('window').height;
    return Math.round(h * 0.88);
  }, []);

  const eventVenueId = routeParams?.eventVenueId;
  const { bookings } = useLieuxData(user?.token, language);
  const booking = findBookingByEventVenueId(bookings, eventVenueId);

  const handleChatError = useCallback(
    (msg) => showError(msg || (fr ? 'Erreur chat.' : 'Chat error.')),
    [showError, fr],
  );

  const {
    loading,
    sending,
    messages,
    draft,
    setDraft,
    sendMessage,
    scrollRef,
  } = useVenueBookingChat({
    token: user?.token,
    eventVenueId,
    onError: handleChatError,
  });

  const venueContract = useVenueBookingContract({
    eventVenueId,
    token: user?.token,
    language,
    showError,
    showSuccess,
  });

  const title =
    booking?.eventTitle ||
    routeParams?.eventTitle ||
    (fr ? 'Conversation' : 'Conversation');
  const subtitle = booking
    ? `${formatEventDateLabel(booking.eventDate, language, { shortMonth: true, withYear: true })}${booking.eventLocation ? ` • ${booking.eventLocation}` : ''}`
    : routeParams?.eventDate || routeParams?.eventLocation
      ? [
          routeParams?.eventDate
            ? formatEventDateLabel(routeParams.eventDate, language, {
                shortMonth: true,
                withYear: true,
              })
            : null,
          routeParams?.eventLocation,
        ]
          .filter(Boolean)
          .join(' • ')
      : '';

  if (!eventVenueId) {
    return (
      <View style={[styles.container, styles.centered]}>
        <NoxText variant="secondary">{fr ? 'Conversation introuvable.' : 'Conversation not found.'}</NoxText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <NoxText variant="titleSecondary" style={styles.headerTitle}>
            {title}
          </NoxText>
          {subtitle ? (
            <NoxText variant="secondary" style={styles.headerSub}>
              {subtitle}
            </NoxText>
          ) : null}
        </View>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {loading ? (
          <View style={styles.centeredFlex}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={[styles.flex, styles.messagesScroll]}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              if (messages.length > 0) {
                scrollRef.current?.scrollToEnd?.({ animated: false });
              }
            }}
          >
            <LieuxBookingContractPanel
              language={language}
              contractEditorModalCardHeight={contractEditorModalCardHeight}
              contract={venueContract}
            />
            {messages.length === 0 ? (
              <NoxText variant="secondary" style={styles.emptyChat}>
                {fr
                  ? 'Démarre la conversation avec l’organisateur.'
                  : 'Start the conversation with the organizer.'}
              </NoxText>
            ) : (
              messages.map((msg) => <MessageBubble key={msg.id} message={msg} fr={fr} />)
            )}
          </ScrollView>
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <TextInput
            style={styles.input}
            placeholder={fr ? 'Écrire un message…' : 'Write a message…'}
            placeholderTextColor={Colors.textTertiary}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!draft.trim() || sending}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Ionicons name="send" size={20} color="#000" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CHAT_BG },
  flex: { flex: 1 },
  messagesScroll: { backgroundColor: CHAT_BG },
  centered: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  centeredFlex: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    backgroundColor: CHAT_BG,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, textAlign: 'center' },
  headerSub: { marginTop: 2, textAlign: 'center', fontSize: 12 },
  messagesContent: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyChat: { textAlign: 'center', marginTop: Spacing.xxl },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, maxWidth: '88%' },
  bubbleRowOwn: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 999,
    maxWidth: '100%',
  },
  bubbleOwn: { backgroundColor: Colors.primary, borderBottomRightRadius: Spacing.sm },
  bubbleOther: {
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderBottomLeftRadius: Spacing.sm,
  },
  bubbleTextOwn: { color: Colors.text },
  bubbleTextOther: { color: Colors.text },
  bubbleTime: { fontSize: 10, marginTop: 4, opacity: 0.65 },
  bubbleTimeOwn: { color: 'rgba(254,254,253,0.75)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    backgroundColor: '#111114',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontSize: 15,
    backgroundColor: '#1a1a1f',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
});
