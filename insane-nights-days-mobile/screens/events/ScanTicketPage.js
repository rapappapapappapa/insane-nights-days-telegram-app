/**
 * Page Scan QR - Scanner les billets (booker ou staff)
 */

import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';

export default function ScanTicketPage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const [permission, requestPermission] = useCameraPermissions();

  const eventId = routeParams?.eventId;
  const eventTitle = routeParams?.eventTitle || '';

  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const fr = language === 'fr';

  const handleBarCodeScanned = async ({ data }) => {
    if (!data || processing || !user?.token || !eventId) return;
    setProcessing(true);
    setScanning(false);
    try {
      let qrCode = data;
      if (typeof data === 'string' && data.startsWith('{')) {
        try {
          const parsed = JSON.parse(data);
          qrCode = parsed.qrCode || parsed.data || data;
        } catch {}
      }
      const res = await api.scanTicket(user.token, eventId, qrCode);
      if (res?.success && res.valid) {
        setLastResult({ valid: true, message: res.message || (fr ? 'Billet validé !' : 'Ticket validated!') });
        showSuccess(res.message || (fr ? 'Billet validé !' : 'Ticket validated!'));
      } else {
        setLastResult({ valid: false, message: res?.message || (fr ? 'Billet invalide' : 'Invalid ticket') });
        showError(res?.message || (fr ? 'Billet invalide' : 'Invalid ticket'));
      }
    } catch (e) {
      setLastResult({ valid: false, message: e?.message || (fr ? 'Erreur' : 'Error') });
      showError(e?.message || (fr ? 'Erreur' : 'Error'));
    } finally {
      setProcessing(false);
      setTimeout(() => {
        setLastResult(null);
        setScanning(true);
      }, 2000);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <Text style={styles.permissionText}>{fr ? 'Autorise l\'accès à la caméra pour scanner les billets.' : 'Allow camera access to scan tickets.'}</Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel={fr ? 'Autoriser la caméra' : 'Allow camera'}
        >
          <Text style={styles.permissionBtnText}>{fr ? 'Autoriser' : 'Grant permission'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={fr ? 'Retour' : 'Back'}
        >
          <Text style={styles.backBtnText}>← {fr ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={fr ? 'Retour' : 'Back'}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{eventTitle || (fr ? 'Scanner billet' : 'Scan ticket')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.cameraWrapper}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanning && !processing ? handleBarCodeScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        {processing && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.overlayText}>{fr ? 'Vérification...' : 'Verifying...'}</Text>
          </View>
        )}
        {lastResult && !processing && (
          <View style={[styles.resultBadge, lastResult.valid ? styles.resultValid : styles.resultInvalid]}>
            <Ionicons name={lastResult.valid ? 'checkmark-circle' : 'close-circle'} size={48} color="#fff" />
            <Text style={styles.resultText}>{lastResult.message}</Text>
          </View>
        )}
        <View style={styles.scanFrame} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.hint}>{fr ? 'Place le QR code du billet dans le cadre' : 'Place the ticket QR code in the frame'}</Text>
      </View>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.background },
  headerBtn: { width: 40, alignItems: 'center' },
  title: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  cameraWrapper: { flex: 1, position: 'relative', overflow: 'hidden' },
  camera: { flex: 1, width: '100%' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', gap: 12 },
  overlayText: { color: '#fff', fontSize: 16 },
  resultBadge: { position: 'absolute', top: '50%', left: '50%', marginLeft: -80, marginTop: -50, width: 160, alignItems: 'center', padding: 16, borderRadius: 16 },
  resultValid: { backgroundColor: 'rgba(16,185,129,0.9)' },
  resultInvalid: { backgroundColor: 'rgba(239,68,68,0.9)' },
  resultText: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  scanFrame: { position: 'absolute', top: '25%', left: '15%', right: '15%', height: 200, borderWidth: 2, borderColor: 'rgba(255,23,68,0.6)', borderRadius: 12 },
  footer: { padding: 20, backgroundColor: Colors.background },
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center' },
  permissionText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  permissionBtn: { backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  permissionBtnText: { color: Colors.background, fontSize: 16, fontWeight: '700' },
  backBtn: { marginTop: 20 },
  backBtnText: { color: Colors.primary, fontSize: 16 },
});
