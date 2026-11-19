import { registerRootComponent } from 'expo';

import installGlobalErrorHandlers from './utils/installGlobalErrorHandlers';
import App from './App';

// Ne doit jamais empêcher le démarrage de l'app, même si le runtime n'expose pas ErrorUtils.
try {
  installGlobalErrorHandlers();
} catch (e) {
  console.warn('[NOX] installGlobalErrorHandlers a échoué (ignoré):', e?.message || e);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
