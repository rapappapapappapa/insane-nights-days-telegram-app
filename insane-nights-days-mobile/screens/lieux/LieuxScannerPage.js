/**
 * Scanner billets NOX — sélection d'événement + caméra QR (profil Lieu).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLieuxData } from '../../hooks/useLieuxData';
import { api } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { NoxText, NoxCard, NoxLieuxBottomNav } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { formatEventDateLabel } from '../../utils/noxDiscoverUtils';

const BOOKER_EVENTS_REFRESH_FLAG = '@nox_refresh_booker_events';

function pickScannableEvents(bookings = []) {
  return bookings
    .filter((b) => {
      const st = String(b.invitationStatus || '').toUpperCase();
      return (st === 'ACCEPTED' || st === 'CONFIRMED') && b.eventId;
    })
    .map((b) => ({
      eventId: b.eventId,
      eventTitle: b.eventTitle,
      eventDate: b.eventDate,
    }));
}

export default function LieuxScannerPage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { goBack, navigate, routeParams } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const [permission, requestPermission] = useCameraPermissions();

  const fr = language === 'fr';
  const { loading, bookings } = useLieuxData(user?.token, language);

  const scannableEvents = useMemo(() => pickScannableEvents(bookings), [bookings]);

  const initialEventId = routeParams?.eventId || scannableEvents[0]?.eventId || null;
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [torchOn, setTorchOn] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const resultScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!selectedEventId && scannableEvents.length > 0) {
      setSelectedEventId(scannableEvents[0].eventId);
    }
  }, [scannableEvents, selectedEventId]);

  useEffect(() => {
    if (routeParams?.eventId) setSelectedEventId(routeParams.eventId);
  }, [routeParams?.eventId]);

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

  const selectedEvent = scannableEvents.find((e) => e.eventId === selectedEventId);

  const handleBarCodeScanned = async ({ data }) => {
    if (!data || processing || !user?.token || !selectedEventId) return;
    setProcessing(true);
    setScanning(false);
    try {
      let qrCode = data;
      if (typeof data === 'string' && data.startsWith('{')) {
        try {
          const parsed = JSON.parse(data);
          qrCode = parsed.qrCode || parsed.data || data;
        } catch {
          /* keep raw */
        }
      }
      const res = await api.scanTicket(user.token, selectedEventId, qrCode);
      if (res?.success && res.valid) {
        try {
          await AsyncStorage.setItem(BOOKER_EVENTS_REFRESH_FLAG, '1');
        } catch {
          /* ignore */
        }
        const name = res.ticket?.holderDisplayName;
        const okMsg = name
          ? fr
            ? `Entrée : ${name}`
            : `Entry: ${name}`
          : res.message || (fr ? 'Billet validé !' : 'Ticket validated!');
        setLastResult({ valid: true, message: okMsg });
        showSuccess(okMsg);
      } else {
        const errMsg = res?.message || (fr ? 'Billet invalide' : 'Invalid ticket');
        setLastResult({ valid: false, message: errMsg });
        showError(errMsg);
      }
    } catch (e) {
      const errMsg = e?.message || (fr ? 'Erreur' : 'Error');
      setLastResult({ valid: false, message: errMsg });
      showError(errMsg);
    } finally {
      setProcessing(false);
      setTimeout(() => {
        setLastResult(null);
        setScanning(true);
      }, 2000);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

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
        <NoxText variant="description" style={styles.permissionText}>
          {fr
            ? 'Autorise l’accès à la caméra pour scanner les billets.'
            : 'Allow camera access to scan tickets.'}
        </NoxText>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <NoxText variant="button" style={styles.permissionBtnText}>
            {fr ? 'Autoriser' : 'Grant permission'}
          </NoxText>
        </TouchableOpacity>
        <TouchableOpacity onPress={goBack} style={styles.backLink}>
          <NoxText variant="secondary" style={{ color: Colors.primary }}>
            ← {fr ? 'Retour' : 'Back'}
          </NoxText>
        </TouchableOpacity>
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
          <NoxText variant="titleSecondary">{fr ? 'Scanner billets' : 'Scan tickets'}</NoxText>
          <NoxText variant="secondary" numberOfLines={1}>
            {selectedEvent?.eventTitle || (fr ? 'Sélectionne un événement' : 'Select an event')}
          </NoxText>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setTorchOn((v) => !v)}
          hitSlop={10}
        >
          <Ionicons
            name={torchOn ? 'flash' : 'flash-outline'}
            size={22}
            color={torchOn ? Colors.primary : Colors.text}
          />
        </TouchableOpacity>
      </View>

      {scannableEvents.length === 0 ? (
        <View style={styles.emptyWrap}>
          <NoxCard style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color={Colors.primary} />
            <NoxText variant="titleSecondary" style={{ textAlign: 'center' }}>
              {fr ? 'Aucun événement scannable' : 'No scannable events'}
            </NoxText>
            <NoxText variant="secondary" style={{ textAlign: 'center' }}>
              {fr
                ? 'Les événements confirmés avec billetterie apparaîtront ici.'
                : 'Confirmed ticketed events will appear here.'}
            </NoxText>
          </NoxCard>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventPicker}
          >
            {scannableEvents.map((ev) => {
              const active = ev.eventId === selectedEventId;
              return (
                <TouchableOpacity
                  key={ev.eventId}
                  activeOpacity={0.85}
                  onPress={() => setSelectedEventId(ev.eventId)}
                >
                  <NoxCard style={[styles.eventChip, active && styles.eventChipActive]} padded={false}>
                    <NoxText variant="form" numberOfLines={1} style={active && { color: Colors.primary }}>
                      {ev.eventTitle}
                    </NoxText>
                    <NoxText variant="secondary" style={styles.chipDate}>
                      {formatEventDateLabel(ev.eventDate, language, { shortMonth: true })}
                    </NoxText>
                  </NoxCard>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.cameraWrapper}>
            <CameraView
              style={styles.camera}
              facing="back"
              enableTorch={torchOn}
              onBarcodeScanned={scanning && !processing && selectedEventId ? handleBarCodeScanned : undefined}
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
        </>
      )}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
      <NoxLieuxBottomNav active={null} navigate={navigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  permissionText: { textAlign: 'center', paddingHorizontal: Spacing.xxl, marginBottom: Spacing.lg },
  permissionBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.button,
  },
  permissionBtnText: { color: '#000' },
  backLink: { marginTop: Spacing.lg },
  emptyWrap: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  emptyCard: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xxl },
  eventPicker: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  eventChip: {
    width: 180,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  eventChipActive: {
    borderColor: Colors.primary,
    backgroundColor: primaryAlpha(0.08),
  },
  chipDate: { fontSize: 11, marginTop: 4 },
  cameraWrapper: { flex: 1, position: 'relative', overflow: 'hidden', marginHorizontal: Spacing.xl, borderRadius: Radius.card },
  camera: { flex: 1, width: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  overlayText: { color: '#fff' },
  resultBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  resultBadge: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.card,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  resultValid: { backgroundColor: 'rgba(16,185,129,0.95)' },
  resultInvalid: { backgroundColor: 'rgba(239,68,68,0.95)' },
  resultText: { color: '#fff', marginTop: Spacing.md, textAlign: 'center' },
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
});
