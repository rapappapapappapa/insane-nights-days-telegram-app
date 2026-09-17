import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@nox_expo_push_token';

export async function saveLocalExpoPushToken(token) {
  if (token) await AsyncStorage.setItem(KEY, token);
}

export async function getLocalExpoPushToken() {
  return AsyncStorage.getItem(KEY);
}

export async function clearLocalExpoPushToken() {
  await AsyncStorage.removeItem(KEY);
}
