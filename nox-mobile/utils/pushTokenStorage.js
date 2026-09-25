/**
 * Stockage local du token Expo Push (moins sensible qu’un JWT, mais chiffré hors web).
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@nox_expo_push_token';
const isWeb = Platform.OS === 'web';

async function read() {
  if (isWeb) return AsyncStorage.getItem(KEY);
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return AsyncStorage.getItem(KEY);
  }
}

async function write(value) {
  if (isWeb) {
    if (value) await AsyncStorage.setItem(KEY, value);
    else await AsyncStorage.removeItem(KEY);
    return;
  }
  try {
    if (value) await SecureStore.setItemAsync(KEY, value);
    else await SecureStore.deleteItemAsync(KEY);
    try {
      await AsyncStorage.removeItem(KEY);
    } catch (_) {}
  } catch {
    if (value) await AsyncStorage.setItem(KEY, value);
    else await AsyncStorage.removeItem(KEY);
  }
}

export async function saveLocalExpoPushToken(token) {
  if (token) await write(token);
}

export async function getLocalExpoPushToken() {
  return read();
}

export async function clearLocalExpoPushToken() {
  await write(null);
}
