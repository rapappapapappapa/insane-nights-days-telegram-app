/**
 * Page Scan QR - Scanner les billets (booker ou staff)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { NoxText, NoxButton, NoxScreenHeader } from '../../components/nox';

const BOOKER_EVENTS_REFRESH_FLAG = '@nox_refresh_booker_events';
const SCAN_ANY_DAY_TEST_STORAGE = '@nox_scan_test_any_day';

/** Secret partagé avec SCAN_TICKET_TEST_SECRET (serveur). Embarqué seulement si SHOW_SCAN_TEST_UI. */
const SCAN_TEST_SECRET = (process.env.EXPO_PUBLIC_SCAN_TICKET_TEST_SECRET || '').trim();

/**
 * Bandeau « test scan hors jour » : masqué par défaut (prod / stores).
 * Opt-in staging : EXPO_PUBLIC_SHOW_SCAN_TEST_UI=true
 * Legacy : EXPO_PUBLIC_HIDE_SCAN_TEST_UI=false n’affiche plus rien ; utiliser SHOW.
 */
function shouldShowScanTestToggle() {
  const show = process.env.EXPO_PUBLIC_SHOW_SCAN_TEST_UI;
  if (show === '1' || show === 'true') return true;
  return false;
}

export default function ScanTicketPage() {
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
  const [torchOn, setTorchOn] = useState(false);
  const showTestToggle = shouldShowScanTestToggle();
  const [scanAnyDayTest, setScanAnyDayTest] = useState(false);
  const resultScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!showTestToggle) {
        setScanAnyDayTest(false);
        try {
          await AsyncStorage.removeItem(SCAN_ANY_DAY_TEST_STORAGE);
        } catch (_) {}
        return;
      }
      try {
        const v = await AsyncStorage.getItem(SCAN_ANY_DAY_TEST_STORAGE);
        if (!cancelled) setScanAnyDayTest(v === '1');
      } catch (_) {}
    })();
    return () => {
      cancelled = true;
    };
  }, [showTestToggle]);

  useEffect(() => {
    if (lastResult && !processing) {
      resultScale.setValue(0.85);
      Animated.spring(resultScale, {
        toValue: 1,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [lastResult, processing, resultScale]);

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
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <NoxText variant="description" style={styles.permissionText}>
          {fr
            ? "Autorise l'accès à la caméra pour scanner les billets."
            : 'Allow camera access to scan tickets.'}
        </NoxText>
        <NoxButton
          label={fr ? 'Autoriser' : 'Grant permission'}
          onPress={requestPermission}
          style={styles.permissionBtn}
          fullWidth={false}
        />
        <NoxButton
          label={fr ? 'Retour' : 'Back'}
          variant="ghost"
          onPress={goBack}
          style={styles.backLink}
          fullWidth={false}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <NoxScreenHeader
        title={fr ? 'Scanner billet' : 'Scan ticket'}
        subtitle={eventTitle || undefined}
        onBack={goBack}
        rightSlot={
          <TouchableOpacity
            onPress={() => setTorchOn((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={fr ? 'Lampe torche' : 'Flashlight'}
          >
            <Ionicons
              name={torchOn ? 'flash' : 'flash-outline'}
              size={22}
              color={torchOn ? Colors.primary : Colors.text}
            />
          </TouchableOpacity>
        }
      />

      {showTestToggle ? (
        <View style={styles.testModeRow}>
          <View style={styles.testModeTextCol}>
            <NoxText variant="form" style={styles.testModeTitle}>
              {fr ? 'Test : scan hors jour événement' : 'Test: scan any event day'}
            </NoxText>
            <NoxText variant="secondary" style={styles.testModeHint}>
              {SCAN_TEST_SECRET.length >= 8
                ? fr
                  ? 'Active seulement si SCAN_TICKET_TEST_SECRET côté API correspond à la clé Expo.'
                  : 'Only works if server SCAN_TICKET_TEST_SECRET matches the Expo key.'
                : fr
                  ? 'Ajoute EXPO_PUBLIC_SCAN_TICKET_TEST_SECRET (≥ 8 car.) et la même valeur en SCAN_TICKET_TEST_SECRET sur le serveur.'
                  : 'Set EXPO_PUBLIC_SCAN_TICKET_TEST_SECRET (≥ 8 chars) and SCAN_TICKET_TEST_SECRET on the server.'}
            </NoxText>
          </View>
          <Switch
            value={scanAnyDayTest && SCAN_TEST_SECRET.length >= 8}
            onValueChange={(v) => {
              if (SCAN_TEST_SECRET.length < 8) return;
              persistScanTestToggle(v);
            }}
            trackColor={{ false: 'rgba(255,255,255,0.2)', true: primaryAlpha(0.45) }}
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
          enableTorch={torchOn}
          onBarcodeScanned={scanning && !processing ? handleBarCodeScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        {processing ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <NoxText variant="form" style={styles.overlayText}>
              {fr ? 'Vérification…' : 'Verifying…'}
            </NoxText>
          </View>
        ) : null}
        {lastResult && !processing ? (
          <View style={styles.resultBackdrop} pointerEvents="none">
            <Animated.View
              style={[
                styles.resultBadge,
                lastResult.valid ? styles.resultValid : styles.resultInvalid,
                { transform: [{ scale: resultScale }] },
              ]}
            >
              <Ionicons
                name={lastResult.valid ? 'checkmark-circle' : 'close-circle'}
                size={56}
                color="#fff"
              />
              <NoxText variant="button" style={styles.resultText}>
                {lastResult.message}
              </NoxText>
            </Animated.View>
          </View>
        ) : null}
        <View style={styles.scanFrame} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

      <View style={styles.footer}>
        <NoxText variant="secondary" style={styles.hint}>
          {fr ? 'Place le QR code du billet dans le cadre' : 'Place the ticket QR code in the frame'}
        </NoxText>
      </View>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  permissionText: {
    textAlign: 'center',
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  permissionBtn: { paddingHorizontal: Spacing.xxl },
  backLink: { marginTop: Spacing.lg },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.card,
  },
  camera: { flex: 1, width: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  overlayText: { color: '#fff' },
  resultBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  resultBadge: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  resultValid: { backgroundColor: 'rgba(16,185,129,0.95)' },
  resultInvalid: { backgroundColor: 'rgba(239,68,68,0.95)' },
  resultText: {
    color: '#fff',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  scanFrame: {
    position: 'absolute',
    top: '25%',
    left: '15%',
    right: '15%',
    height: 200,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: primaryAlpha(0.95),
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 4 },
  footer: { padding: Spacing.xl },
  hint: { textAlign: 'center' },
  testModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: 'rgba(255,193,7,0.12)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.35)',
  },
  testModeTextCol: { flex: 1 },
  testModeTitle: { color: '#ffc107', fontSize: 13, fontWeight: '700' },
  testModeHint: { fontSize: 11, marginTop: Spacing.xs, lineHeight: 15 },
});
