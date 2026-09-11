import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@nox_tutorial_seen_v1';

export async function hasSeenTutorial() {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markTutorialSeen() {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    /* ignore */
  }
}

export async function shouldShowTutorial() {
  return !(await hasSeenTutorial());
}
