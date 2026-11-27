import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/config';
import { normalizeMediaUrl } from '../../api/normalizeMediaUrl';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/theme';
import { NoxText, NoxSearchBar } from '../nox';

/** Feuille basse : chercher un compte NOX par pseudo pour lui transférer un billet. */
export default function TicketTransferSheet({ visible, onClose, onPick, token, fr, busy }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !token) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await api.searchCommunities(token, q);
        if (!cancelled) setResults(res?.success && Array.isArray(res.results) ? res.results : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, token]);

  const hint =
    query.trim().length < 2
      ? fr ? 'Tape au moins 2 lettres du pseudo.' : 'Type at least 2 letters.'
      : fr ? 'Aucun compte trouvé.' : 'No account found.';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.handle} />
            <View style={styles.titleRow}>
              <NoxText style={styles.title}>{fr ? 'Transférer le billet' : 'Transfer ticket'}</NoxText>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <NoxText style={styles.subtitle}>
              {fr
                ? 'Le billet et son QR code passent sur le compte de ton ami. Ton QR actuel ne fonctionnera plus.'
                : 'The ticket moves to your friend’s account. Your current QR code will stop working.'}
            </NoxText>
            <NoxSearchBar
              value={query}
              onChangeText={setQuery}
              placeholder={fr ? 'Pseudo NOX' : 'NOX username'}
            />
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {searching || busy ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
              ) : results.length === 0 ? (
                <NoxText style={styles.empty}>{hint}</NoxText>
              ) : (
                results.map((r) => {
                  const avatar = normalizeMediaUrl(r.profileImage);
                  return (
                    <TouchableOpacity key={r.id} style={styles.row} activeOpacity={0.8} onPress={() => onPick(r)}>
                      <View style={styles.avatar}>
                        {avatar ? (
                          <Image source={{ uri: avatar }} style={StyleSheet.absoluteFillObject} />
                        ) : (
                          <NoxText style={styles.avatarLetter}>{(r.pseudo || '?').charAt(0).toUpperCase()}</NoxText>
                        )}
                      </View>
                      <NoxText style={styles.pseudo} numberOfLines={1}>
                        {r.pseudo}
                      </NoxText>
                      <Ionicons name="paper-plane-outline" size={18} color={Colors.primaryLight} />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
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
    gap: Spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderSubtle,
    marginTop: Spacing.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: FontFamily.bold, fontSize: 17, color: Colors.text },
  subtitle: { fontSize: 13, lineHeight: 18, color: Colors.textSecondary },
  list: { minHeight: 160 },
  empty: { textAlign: 'center', color: Colors.textTertiary, marginVertical: Spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderSubtle,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: primaryAlpha(0.5),
  },
  avatarLetter: { fontFamily: FontFamily.bold, color: Colors.text },
  pseudo: { flex: 1, fontFamily: FontFamily.medium, fontSize: 15, color: Colors.text },
});
