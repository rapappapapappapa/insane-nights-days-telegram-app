import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/colors';

/**
 * Lecteur « intégré » via embed web (Spotify / SoundCloud) — même binaire Expo.
 *
 * @param {boolean} visible
 * @param {() => void} onClose
 * @param {string|null} embedUri URL complète embed / widget (sinon modal vide ne s’affiche pas)
 * @param {string} language 'fr' | 'en'
 * @param {string} title Titre léger sous le bandeau (ex. Spotify)
 */
export default function BuiltInStreamPlayerModal({
  visible,
  onClose,
  embedUri,
  language,
  title,
}) {
  const insets = useSafeAreaInsets();

  if (!visible || !embedUri) {
    return null;
  }

  const sheetHeight = Math.min(Math.round(Dimensions.get('window').height * 0.54), 560);

  const labelClose = language === 'fr' ? 'Fermer' : 'Close';
  const header = title || (language === 'fr' ? 'Écouter' : 'Listen');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.sheet, { height: sheetHeight }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {header}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
              <Text style={styles.closeBtnText}>{labelClose}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            {language === 'fr'
              ? 'Lecture via le lecteur officiel dans l’app. Connexion Spotify / SoundCloud peut être nécessaire.'
              : 'Playback uses the official embed. You may need to log in to Spotify / SoundCloud.'}
          </Text>
          <View style={styles.webShell}>
            <WebView
              source={{ uri: embedUri }}
              style={styles.web}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={Platform.OS === 'android'}
              javaScriptEnabled
              domStorageEnabled
              nestedScrollEnabled
              setSupportMultipleWindows={false}
              originWhitelist={['https://', 'http://']}
              {...(Platform.OS === 'android' ? { mixedContentMode: 'always' } : {})}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.backgroundCard || '#1a1a1f',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.25)',
    paddingHorizontal: 12,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeBtnText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
    marginBottom: 10,
  },
  webShell: {
    flex: 1,
    minHeight: 220,
    borderRadius: 12,
    overflow: 'hidden',
  },
  web: {
    flex: 1,
    marginTop: 0,
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
