// ⚠️ ErrorUtils est un GLOBAL fourni par le runtime RN/Hermes, PAS un export de 'react-native'.
// L'importer depuis 'react-native' renvoie `undefined` → crash au boot (index.js) sur iOS.
// On le lit donc via globalThis, avec garde-fou.

/** Dernière erreur fatale JS (pour affichage debug à l’écran si besoin). */
let lastGlobalError = null;

export function getLastGlobalError() {
  return lastGlobalError;
}

function logBox(title, error, extra = '') {
  const message = error?.message || String(error);
  const stack = error?.stack || '(pas de stack)';
  console.error('═══════════════════════════════════════');
  console.error(`[NOX] ${title}${extra ? ` — ${extra}` : ''}`);
  console.error('[NOX] Message:', message);
  console.error('[NOX] Stack:', stack);
  console.error('═══════════════════════════════════════');
}

/** À appeler une seule fois au démarrage (index.js). */
export function installGlobalErrorHandlers() {
  if (global.__NOX_ERROR_HANDLERS__) return;
  global.__NOX_ERROR_HANDLERS__ = true;

  const ErrorUtils = globalThis.ErrorUtils || global.ErrorUtils;
  // Runtime sans ErrorUtils (ou pas encore prêt) : ne rien faire pour éviter tout crash au démarrage.
  if (!ErrorUtils || typeof ErrorUtils.setGlobalHandler !== 'function') {
    return;
  }

  const defaultHandler = ErrorUtils.getGlobalHandler?.();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    lastGlobalError = {
      message: error?.message || String(error),
      stack: error?.stack,
      isFatal: !!isFatal,
      at: new Date().toISOString(),
    };
    logBox(isFatal ? 'ERREUR FATALE' : 'Erreur JS', error, isFatal ? 'fatal' : 'non-fatal');
    defaultHandler?.(error, isFatal);
  });

  // Promesses rejetées non gérées (Hermes / RN récents)
  const rejectionHandler = (event) => {
    const reason = event?.reason ?? event;
    const err = reason instanceof Error ? reason : new Error(String(reason));
    lastGlobalError = {
      message: err.message,
      stack: err.stack,
      isFatal: false,
      at: new Date().toISOString(),
      type: 'unhandledRejection',
    };
    logBox('PROMESSE REJETÉE (unhandled)', err);
  };

  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('unhandledrejection', rejectionHandler);
  }
}

export default installGlobalErrorHandlers;
