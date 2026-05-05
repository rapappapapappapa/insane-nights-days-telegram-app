import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api } from '../api/config';
import logger from '../utils/logger';
import { saveLocalExpoPushToken } from '../utils/pushTokenStorage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#ff1744',
  });
}

export async function getExpoPushTokenForRegistration() {
  if (!Device.isDevice) {
    logger.warn('[push] Pas un appareil physique — pas de token Expo.');
    return null;
  }

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    logger.warn('[push] Permission notifications refusée.');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const opts = projectId ? { projectId } : undefined;
  const push = await Notifications.getExpoPushTokenAsync(opts);
  return push?.data || null;
}

/**
 * Enregistre le token Expo auprès du backend quand l’utilisateur est connecté.
 */
export function useExpoPushRegistration(user) {
  const lastPairRef = useRef({ userId: null, token: null });

  useEffect(() => {
    if (!user?.token || !user?.isAuthenticated || !user?.id) {
      lastPairRef.current = { userId: null, token: null };
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const expoToken = await getExpoPushTokenForRegistration();
        if (cancelled || !expoToken) return;
        const last = lastPairRef.current;
        if (last.userId === user.id && last.token === expoToken) return;
        const res = await api.registerExpoPushToken(user.token, expoToken, Platform.OS);
        if (res?.success) {
          lastPairRef.current = { userId: user.id, token: expoToken };
          await saveLocalExpoPushToken(expoToken);
        }
      } catch (e) {
        logger.warn('[push] Enregistrement token:', e?.message ?? e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.token, user?.isAuthenticated]);
}
