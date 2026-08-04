import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
// Expo SDK 54+ : l’API « default » ne fournit plus writeAsStringAsync (elle throw). Utiliser legacy.
import * as FileSystem from 'expo-file-system/legacy';
import Colors from '../constants/colors';

/** Version alignée sur pdfjs-dist / assets/pdfjs — invalide le cache si on upgrade PDF.js */
const PDFJS_ANDROID_ASSET_VERSION = '3.11.174';

/** Base `file://.../nox-pdfjs-x/` une fois les bundles copiés dans le cache (Android). */
let androidPdfScriptsDirUrl = null;

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

/**
 * PDF.js (canvas) — scripts chargés en local depuis file:// (bundles embarqués, pas de CDN).
 * @param {string} base64 - PDF en base64
 * @param {string} scriptsDirUrl - URL du dossier avec pdf.min.js et pdf.worker.min.js (slash final)
 */
function buildPdfPreviewHtmlPdfJsLocal(base64, scriptsDirUrl) {
  const b64literal = JSON.stringify(base64);
  const baseLiteral = JSON.stringify(scriptsDirUrl);
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
</head>
<body>
  <div id="err"></div>
  <div id="loading">…</div>
  <div id="root"></div>
  <script>
    (function () {
      var scriptsBase = ${baseLiteral};
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
      function runPdf() {
        try {
          if (typeof pdfjsLib === 'undefined') {
            fail('PDF.js indisponible.');
            return;
          }
          pdfjsLib.GlobalWorkerOptions.workerSrc = scriptsBase + 'pdf.worker.min.js';
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
      }
      var s = document.createElement('script');
      s.src = scriptsBase + 'pdf.min.js';
      s.onload = runPdf;
      s.onerror = function () { fail('Impossible de charger PDF.js (fichiers locaux).'); };
      document.head.appendChild(s);
    })();
  </script>
</body>
</html>`;
}

/**
 * Copie une fois (par version) les bundles PDF.js depuis les assets Expo vers le cache,
 * pour que le WebView puisse les charger en file://.
 */
async function ensureAndroidPdfJsScriptsInCache() {
  if (androidPdfScriptsDirUrl) return androidPdfScriptsDirUrl;

  const cacheRoot = FileSystem.cacheDirectory;
  if (!cacheRoot) {
    throw new Error('cacheDirectory indisponible');
  }

  const basePath = cacheRoot.endsWith('/') ? cacheRoot : `${cacheRoot}/`;
  const targetDir = `${basePath}nox-pdfjs-${PDFJS_ANDROID_ASSET_VERSION}/`;
  await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });

  const mainDest = `${targetDir}pdf.min.js`;
  const workerDest = `${targetDir}pdf.worker.min.js`;
  const mainInfo = await FileSystem.getInfoAsync(mainDest);
  const workerInfo = await FileSystem.getInfoAsync(workerDest);

  if (!mainInfo.exists || !workerInfo.exists) {
    if (mainInfo.exists) await FileSystem.deleteAsync(mainDest, { idempotent: true });
    if (workerInfo.exists) await FileSystem.deleteAsync(workerDest, { idempotent: true });
    const mainAsset = Asset.fromModule(require('../assets/pdfjs/pdf.min.pdfjs'));
    const workerAsset = Asset.fromModule(require('../assets/pdfjs/pdf.worker.min.pdfjs'));
    await mainAsset.downloadAsync();
    await workerAsset.downloadAsync();
    if (!mainAsset.localUri || !workerAsset.localUri) {
      throw new Error('Asset PDF.js sans localUri');
    }
    await FileSystem.copyAsync({ from: mainAsset.localUri, to: mainDest });
    await FileSystem.copyAsync({ from: workerAsset.localUri, to: workerDest });
  }

  const fileUrlBase = targetDir.startsWith('file://') ? targetDir : `file://${targetDir}`;
  androidPdfScriptsDirUrl = fileUrlBase.endsWith('/') ? fileUrlBase : `${fileUrlBase}/`;
  return androidPdfScriptsDirUrl;
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
  const [shareBusy, setShareBusy] = useState(false);

  const sharePdfExternally = useCallback(async () => {
    if (!pdfBase64) return;
    const clean = normalizePdfBase64(pdfBase64);
    if (!clean) return;
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      Alert.alert(
        language === 'fr' ? 'Partage impossible' : 'Cannot share',
        language === 'fr' ? 'Espace cache indisponible.' : 'Cache unavailable.'
      );
      return;
    }
    setShareBusy(true);
    try {
      const basePath = cacheDir.endsWith('/') ? cacheDir : `${cacheDir}/`;
      const path = `${basePath}nox-contract-share-${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(path, clean, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const uri = path.startsWith('file://') ? path : `file://${path}`;
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          language === 'fr' ? 'Partage impossible' : 'Cannot share',
          language === 'fr'
            ? 'Le partage n’est pas disponible sur cet appareil.'
            : 'Sharing is not available on this device.'
        );
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: language === 'fr' ? 'Ouvrir le PDF' : 'Open PDF',
        UTI: 'com.adobe.pdf',
      });
    } catch (e) {
      console.warn('[ContractPdfPreviewModal] share', e);
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        language === 'fr' ? 'Impossible d’ouvrir ou de partager le PDF.' : 'Could not share the PDF.'
      );
    } finally {
      setShareBusy(false);
    }
  }, [pdfBase64, language]);

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
        // Android : iframe data: PDF → écran gris sur Chrome WebView ; PDF.js embarqué (file://) + canvas.
        if (Platform.OS === 'android') {
          const scriptsBase = await ensureAndroidPdfJsScriptsInCache();
          if (!cancelled) {
            setWebSource({
              type: 'html',
              html: buildPdfPreviewHtmlPdfJsLocal(clean, scriptsBase),
              baseUrl: scriptsBase,
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

  useEffect(() => {
    if (!visible) setShareBusy(false);
  }, [visible]);

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
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
          >
            <Text style={styles.headerBtnText}>{cancelLabel}</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.headerBtnPlaceholder} />
        </View>

        {showSpinner ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
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
                <ActivityIndicator color={Colors.primary} />
              </View>
            )}
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.error}>{language === 'fr' ? 'PDF indisponible.' : 'PDF unavailable.'}</Text>
          </View>
        )}

        <View style={styles.footer}>
          {Platform.OS === 'android' && pdfBase64 && !loading ? (
            <Text style={styles.pdfOfflineHint}>
              {language === 'fr'
                ? 'L’aperçu utilise PDF.js fourni avec l’app (pas besoin d’Internet). Si l’écran reste vide, utilisez le bouton ci-dessous pour ouvrir le fichier.'
                : 'Preview uses the app-bundled PDF.js (no internet required). If the screen stays blank, use the button below to open the file.'}
            </Text>
          ) : null}
          {pdfBase64 && !loading ? (
            <TouchableOpacity
              style={[styles.secondaryBtn, (shareBusy || showSpinner) && styles.confirmBtnDisabled]}
              onPress={sharePdfExternally}
              disabled={shareBusy || showSpinner}
              accessibilityRole="button"
              accessibilityLabel={
                language === 'fr'
                  ? 'Ouvrir ou partager le PDF avec une autre application'
                  : 'Open or share the PDF in another app'
              }
            >
              {shareBusy ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Text style={styles.secondaryBtnText}>
                  {language === 'fr'
                    ? 'Ouvrir / partager le PDF (autre appli)'
                    : 'Open / share PDF (other app)'}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
          {previewOnly ? (
            <TouchableOpacity
              style={[styles.confirmBtn, styles.footerPrimaryBtn]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={
                doneReadingLabel ||
                (language === 'fr' ? 'Fermer après lecture' : 'Close after reading')
              }
            >
              <Text style={styles.confirmBtnText}>
                {doneReadingLabel ||
                  (language === 'fr' ? 'Fermer après lecture' : 'Close after reading')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.confirmBtn, styles.footerPrimaryBtn, !canConfirm && styles.confirmBtnDisabled]}
              onPress={onConfirm}
              disabled={!canConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
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
  safe: { flex: 1, backgroundColor: Colors.background },
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
  title: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
  web: { flex: 1, backgroundColor: Colors.backgroundCard },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hint: { color: 'rgba(255,255,255,0.55)', marginTop: 12, fontSize: 14 },
  error: { color: '#ff8a80', textAlign: 'center', fontSize: 14 },
  pdfOfflineHint: {
    color: Colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    backgroundColor: Colors.background,
    gap: 10,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  secondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  footerPrimaryBtn: { marginTop: 0 },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.45 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
