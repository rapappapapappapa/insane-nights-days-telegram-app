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
 * Fallback (iOS sans cache, très petits PDF) : iframe data URL.
 */
function buildPdfPreviewHtmlEmbeddedBase64(base64) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #1a1a1f; }
    iframe { width: 100%; height: 100%; border: 0; display: block; }
  </style>
</head>
<body>
  <iframe src="data:application/pdf;base64,${base64}" title="contract-pdf" />
</body>
</html>`;
}

/** PDF.js (canvas) — le WebView Android ne rend souvent pas les PDF dans un iframe / data URL (écran gris). */
const PDFJS_LEGACY = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js';
const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js';

function buildPdfPreviewHtmlPdfJs(base64) {
  const b64literal = JSON.stringify(base64);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; min-height: 100%; background: #1a1a1f; }
    #root { display: flex; flex-direction: column; align-items: stretch; padding: 8px 8px 24px; }
    canvas { display: block; width: 100%; height: auto; margin: 0 auto 12px; background: #2a2a32; }
    #err { color: #ff8a80; padding: 16px; font: 14px/1.4 system-ui, sans-serif; display: none; white-space: pre-wrap; }
    #loading { color: rgba(255,255,255,0.55); text-align: center; padding: 24px; font: 14px system-ui, sans-serif; }
  </style>
  <script src="${PDFJS_LEGACY}"></script>
</head>
<body>
  <div id="err"></div>
  <div id="loading">…</div>
  <div id="root"></div>
  <script>
    (function () {
      var b64 = ${b64literal};
      var root = document.getElementById('root');
      var errEl = document.getElementById('err');
      var loadEl = document.getElementById('loading');
      function fail(msg) {
        loadEl.style.display = 'none';
        errEl.style.display = 'block';
        errEl.textContent = msg;
      }
      function showErr(e) {
        fail((e && e.message) ? String(e.message) : String(e));
      }
      try {
        if (typeof pdfjsLib === 'undefined') {
          fail('PDF.js indisponible (réseau ?).');
          return;
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = ${JSON.stringify(PDFJS_WORKER)};
        var bin = atob(b64);
        var len = bin.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
        pdfjsLib.getDocument({ data: bytes }).promise.then(function (pdf) {
          var n = pdf.numPages;
          return pdf.getPage(1).then(function (firstPage) {
            var pageW = firstPage.getViewport({ scale: 1 }).width;
            var scale = Math.min(Math.max((window.innerWidth - 24) / pageW, 0.85), 2.2);
            loadEl.style.display = 'none';
            function pageLoop(p) {
              if (p > n) return Promise.resolve();
              return pdf.getPage(p).then(function (page) {
                var vp = page.getViewport({ scale: scale });
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                canvas.width = vp.width;
                canvas.height = vp.height;
                root.appendChild(canvas);
                return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
                  return pageLoop(p + 1);
                });
              });
            }
            return pageLoop(1);
          });
        }).catch(showErr);
      } catch (e) {
        showErr(e);
      }
    })();
  </script>
</body>
</html>`;
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
  /** Lecture seule : pas de confirmation d’action (envoi / acceptation), seulement fermeture après lecture. */
  previewOnly = false,
  doneReadingLabel,
}) {
  /** null | { type: 'uri', uri } | { type: 'html', html, baseUrl } */
  const [webSource, setWebSource] = useState(null);
  const [filePreparing, setFilePreparing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!visible || !pdfBase64) {
        setWebSource(null);
        setFilePreparing(false);
        return;
      }
      const clean = normalizePdfBase64(pdfBase64);
      if (!clean) {
        if (!cancelled) {
          setWebSource(null);
          setFilePreparing(false);
        }
        return;
      }
      setFilePreparing(true);
      try {
        // Android : iframe data: PDF → écran gris sur Chrome WebView ; rendu canvas via PDF.js + CDN.
        if (Platform.OS === 'android') {
          if (!cancelled) {
            setWebSource({
              type: 'html',
              html: buildPdfPreviewHtmlPdfJs(clean),
              baseUrl: 'https://localhost',
            });
          }
          return;
        }

        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) {
          if (!cancelled) {
            setWebSource({
              type: 'html',
              html: buildPdfPreviewHtmlEmbeddedBase64(clean),
              baseUrl: 'https://localhost',
            });
          }
          return;
        }
        const basePath = cacheDir.endsWith('/') ? cacheDir : `${cacheDir}/`;
        const path = `${basePath}nox-contract-preview-${Date.now()}.pdf`;
        await FileSystem.writeAsStringAsync(path, clean, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (cancelled) return;
        const webUri = path.startsWith('file://') ? path : `file://${path}`;
        setWebSource({ type: 'uri', uri: webUri });
      } catch (e) {
        console.error('[ContractPdfPreviewModal]', e);
        if (!cancelled) setWebSource(null);
      } finally {
        if (!cancelled) setFilePreparing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, pdfBase64]);

  const showSpinner = loading || filePreparing;
  const canConfirm = !loading && !filePreparing && !errorText && !!webSource;

  // iOS : éviter pageSheet + autres Modal overFullScreen (ordre des couches / touches cassées).
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'}
      onRequestClose={onClose}
    >
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
        ) : webSource ? (
          <WebView
            key={webSource.type === 'uri' ? webSource.uri : 'html-pdf'}
            source={
              webSource.type === 'html'
                ? { html: webSource.html, baseUrl: webSource.baseUrl || 'https://localhost' }
                : { uri: webSource.uri }
            }
            style={styles.web}
            originWhitelist={['*']}
            allowFileAccess
            allowUniversalAccessFromFileURLs
            mixedContentMode="always"
            javaScriptEnabled
            domStorageEnabled
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
          {previewOnly ? (
            <TouchableOpacity style={styles.confirmBtn} onPress={onClose}>
              <Text style={styles.confirmBtnText}>
                {doneReadingLabel ||
                  (language === 'fr' ? 'Fermer après lecture' : 'Close after reading')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
              onPress={onConfirm}
              disabled={!canConfirm}
            >
              <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
            </TouchableOpacity>
          )}
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
