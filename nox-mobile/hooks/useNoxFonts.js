import { useFonts } from 'expo-font';

/** Charge Satoshi (Fontshare — licence libre). */
export function useNoxFonts() {
  const [loaded, error] = useFonts({
    'Satoshi-Regular': require('../assets/fonts/Satoshi-Regular.ttf'),
    'Satoshi-Medium': require('../assets/fonts/Satoshi-Medium.ttf'),
    'Satoshi-Bold': require('../assets/fonts/Satoshi-Bold.ttf'),
    'Satoshi-Black': require('../assets/fonts/Satoshi-Black.ttf'),
    'Satoshi-Variable': require('../assets/fonts/Satoshi-Variable.ttf'),
  });

  return { fontsLoaded: loaded, fontsError: error };
}

export default useNoxFonts;
