import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
// Expo SDK 54+ : l’API « default » ne fournit plus writeAsStringAsync (elle throw). Utiliser legacy.
import * as FileSystem from 'expo-file-system/legacy';

function normalizePdfBase64(raw) {
  if (raw == null || typeof raw !== 'string') return '';
  let s = raw.trim();
  const dataUrl = /^data:application\/pdf;base64,(.+)$/i.exec(s);
  if (dataUrl) s = dataUrl[1];
  return s.replace(/\s/g, '');
}

/**
 * Aperçu PDF in-app + confirmation (envoi / acceptation / contre-proposition).
 */
export default function ContractPdfPreviewModal({
  visible,
  onClose,
  onConfirm,
  title,
  confirmLabel,
  cancelLabel,
  pdfBase64,
  loading,
  errorText,
  language,
}) {
  const [fileUri, setFileUri] = useState(null);
  const [filePreparing, setFilePreparing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!visible || !pdfBase64) {
        setFileUri(null);
        setFilePreparing(false);
        return;
      }
      const clean = normalizePdfBase64(pdfBase64);
      if (!clean) {
        if (!cancelled) {
          setFileUri(null);
          setFilePreparing(false);
        }
        return;
      }
      setFilePreparing(true);
      try {
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) {
          if (!cancelled) {
            setFileUri(`data:application/pdf;base64,${clean}`);
          }
          return;
        }
        const basePath = cacheDir.endsWith('/') ? cacheDir : `${cacheDir}/`;
        const path = `${basePath}nox-contract-preview-${Date.now()}.pdf`;
        await FileSystem.writeAsStringAsync(path, clean, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (cancelled) return;
        const uri = path.startsWith('file://') ? path : `file://${path}`;
        setFileUri(uri);
      } catch (e) {
        console.error('[ContractPdfPreviewModal]', e);
        if (!cancelled) setFileUri(null);
      } finally {
        if (!cancelled) setFilePreparing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, pdfBase64]);

  const showSpinner = loading || filePreparing;
  const canConfirm = !loading && !filePreparing && !errorText && !!fileUri;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.headerBtnText}>{cancelLabel}</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.headerBtnPlaceholder} />
        </View>

        {showSpinner ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FF1744" />
            <Text style={styles.hint}>
              {loading
                ? language === 'fr'
                  ? 'Génération du PDF…'
                  : 'Generating PDF…'
                : language === 'fr'
                  ? 'Préparation de l’aperçu…'
                  : 'Preparing preview…'}
            </Text>
          </View>
        ) : errorText ? (
          <View style={styles.center}>
            <Text style={styles.error}>{errorText}</Text>
          </View>
        ) : fileUri ? (
          <WebView
            key={fileUri}
            source={{ uri: fileUri }}
            style={styles.web}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator color="#FF1744" />
              </View>
            )}
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.error}>{language === 'fr' ? 'PDF indisponible.' : 'PDF unavailable.'}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
            onPress={onConfirm}
            disabled={!canConfirm}
          >
            <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0b0e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  headerBtn: { minWidth: 72 },
  headerBtnPlaceholder: { minWidth: 72 },
  headerBtnText: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  title: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
  web: { flex: 1, backgroundColor: '#1a1a1f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hint: { color: 'rgba(255,255,255,0.55)', marginTop: 12, fontSize: 14 },
  error: { color: '#ff8a80', textAlign: 'center', fontSize: 14 },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#0b0b0e',
  },
  confirmBtn: {
    backgroundColor: '#FF1744',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.45 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
