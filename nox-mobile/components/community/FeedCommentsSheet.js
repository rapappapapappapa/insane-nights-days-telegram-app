import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/theme';
import { NoxText } from '../nox';

/** Feuille basse des commentaires d’une publication (fil liste et mode scroll). */
export default function FeedCommentsSheet({
  visible,
  onClose,
  fr,
  comments,
  canComment,
  input,
  onChangeInput,
  onSend,
  formatDate,
}) {
  const insets = useSafeAreaInsets();
  const loading = visible && !comments;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.handle} />
            <View style={styles.titleRow}>
              <NoxText style={styles.title}>
                {fr ? 'Commentaires' : 'Comments'}
                {comments?.length ? ` (${comments.length})` : ''}
              </NoxText>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
              {loading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
              ) : comments.length === 0 ? (
                <NoxText style={styles.empty}>
                  {fr ? 'Aucun commentaire. Lance la discussion !' : 'No comments yet.'}
                </NoxText>
              ) : (
                comments.map((c) => (
                  <View key={c.id} style={styles.comment}>
                    <View style={styles.commentAvatar}>
                      <NoxText style={styles.commentLetter}>
                        {c.user?.username?.charAt(0)?.toUpperCase() || '?'}
                      </NoxText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <NoxText style={styles.commentAuthor}>
                        {c.user?.username}
                        <NoxText style={styles.commentDate}>  {formatDate(c.createdAt)}</NoxText>
                      </NoxText>
                      <NoxText style={styles.commentText}>{c.content}</NoxText>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {canComment ? (
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder={fr ? 'Commenter…' : 'Comment…'}
                  placeholderTextColor={Colors.textMuted}
                  value={input || ''}
                  onChangeText={onChangeInput}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.send, !input?.trim() && styles.sendDisabled]}
                  onPress={onSend}
                  disabled={!input?.trim()}
                >
                  <Ionicons name="send" size={16} color={Colors.text} />
                </TouchableOpacity>
              </View>
            ) : (
              <NoxText style={styles.empty}>
                {fr ? 'Connecte-toi pour commenter.' : 'Log in to comment.'}
              </NoxText>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    maxHeight: 560,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: primaryAlpha(0.5),
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: Spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderSubtle,
    marginTop: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  title: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.text },
  list: { flexGrow: 0 },
  listContent: { gap: Spacing.md, paddingBottom: Spacing.md },
  empty: { textAlign: 'center', color: Colors.textTertiary, paddingVertical: Spacing.lg },
  comment: { flexDirection: 'row', gap: Spacing.sm },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentLetter: { fontFamily: FontFamily.bold, fontSize: 13, color: Colors.text },
  commentAuthor: { fontFamily: FontFamily.bold, fontSize: 13, color: Colors.text },
  commentDate: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textTertiary },
  commentText: { fontSize: 14, lineHeight: 19, color: Colors.textSecondary, marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingTop: Spacing.sm },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundInput,
    color: Colors.text,
    fontFamily: FontFamily.regular,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
});
