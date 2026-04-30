/**
 * Page Scan QR - Scanner les billets (booker ou staff)
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const showTestToggle = shouldShowScanTestToggle();
  const [scanAnyDayTest, setScanAnyDayTest] = useState(false);

  useEffect(() => {
    if (!showTestToggle) return;
    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(SCAN_ANY_DAY_TEST_STORAGE);
        if (!cancelled) setScanAnyDayTest(v === '1');
      } catch (_) {}
    })();
    return () => {
      cancelled = true;
    };
  }, [showTestToggle]);

  const persistScanTestToggle = async (on) => {
    setScanAnyDayTest(on);
    try {
      if (on) await AsyncStorage.setItem(SCAN_ANY_DAY_TEST_STORAGE, '1');
      else await AsyncStorage.removeItem(SCAN_ANY_DAY_TEST_STORAGE);
    } catch (_) {}
  };

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
      const scanOpts =
        showTestToggle && scanAnyDayTest && SCAN_TEST_SECRET.length >= 8
          ? { scanTestSecret: SCAN_TEST_SECRET }
          : {};
      const res = await api.scanTicket(user.token, eventId, qrCode, scanOpts);
      if (res?.success && res.valid) {
        try {
          await AsyncStorage.setItem(BOOKER_EVENTS_REFRESH_FLAG, '1');
        } catch (_) {}
        const name = res.ticket?.holderDisplayName;
        const okMsg = name
          ? (fr ? `Entrée : ${name}` : `Entry: ${name}`)
          : (res.message || (fr ? 'Billet validé !' : 'Ticket validated!'));
        setLastResult({ valid: true, message: okMsg });
        showSuccess(okMsg);
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

      {showTestToggle ? (
        <View style={styles.testModeRow}>
          <View style={styles.testModeTextCol}>
            <Text style={styles.testModeTitle}>
              {fr ? 'Test : scan hors jour événement' : 'Test: scan any event day'}
            </Text>
            <Text style={styles.testModeHint}>
              {SCAN_TEST_SECRET.length >= 8
                ? fr
                  ? 'Active seulement si SCAN_TICKET_TEST_SECRET côté API correspond à la clé Expo.'
                  : 'Only works if server SCAN_TICKET_TEST_SECRET matches the Expo key.'
                : fr
                  ? 'Ajoute EXPO_PUBLIC_SCAN_TICKET_TEST_SECRET (≥ 8 car.) et la même valeur en SCAN_TICKET_TEST_SECRET sur le serveur.'
                  : 'Set EXPO_PUBLIC_SCAN_TICKET_TEST_SECRET (≥ 8 chars) and SCAN_TICKET_TEST_SECRET on the server.'}
            </Text>
          </View>
          <Switch
            value={scanAnyDayTest && SCAN_TEST_SECRET.length >= 8}
            onValueChange={(v) => {
              if (SCAN_TEST_SECRET.length < 8) return;
              persistScanTestToggle(v);
            }}
            trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(255,23,68,0.45)' }}
            thumbColor={scanAnyDayTest && SCAN_TEST_SECRET.length >= 8 ? Colors.primary : '#888'}
            disabled={SCAN_TEST_SECRET.length < 8}
            accessibilityRole="switch"
            accessibilityLabel={fr ? 'Autoriser le scan test hors jour' : 'Allow test scan any day'}
          />
        </View>
      ) : null}

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
  testModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,193,7,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.35)',
  },
  testModeTextCol: { flex: 1 },
  testModeTitle: { color: '#ffc107', fontSize: 13, fontWeight: '700' },
  testModeHint: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 4, lineHeight: 15 },
  permissionText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  permissionBtn: { backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  permissionBtnText: { color: Colors.background, fontSize: 16, fontWeight: '700' },
  backBtn: { marginTop: 20 },
  backBtnText: { color: Colors.primary, fontSize: 16 },
});
