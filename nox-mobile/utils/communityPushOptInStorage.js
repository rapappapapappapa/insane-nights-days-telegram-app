import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@nox_community_push_optin_v1';

export async function getPushOptInStatus() {
  try {
    return (await AsyncStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export async function setPushOptInStatus(status) {
  try {
    await AsyncStorage.setItem(KEY, status);
  } catch {
    /* ignore */
  }
}

export async function shouldShowPushOptIn(activeProfileType) {
  if (activeProfileType !== 'COMMUNITY') return false;
  const status = await getPushOptInStatus();
  return !status;
}
