/** Message affiché quand fetch échoue (réseau, DNS, serveur injoignable). */
export function getNetworkUnreachableMessage(language = 'fr') {
  return language === 'fr'
    ? 'Impossible de joindre le serveur. Vérifie ta connexion Internet et réessaie.'
    : 'Cannot reach the server. Check your internet connection and try again.';
}

/**
 * Échec de transport : le serveur n'a pas répondu.
 * Ce n'est pas une réponse vide. `null` veut dire autre chose (corps illisible, champ absent).
 */
export class NetworkUnreachableError extends Error {
  constructor(message = 'Network request failed') {
    super(message);
    this.name = 'NetworkUnreachableError';
    this.isNetworkFailure = true;
  }
}

export function isNetworkFailure(error) {
  if (error == null || typeof error !== 'object') return false;
  if (error.isNetworkFailure === true || error.name === 'NetworkUnreachableError') return true;
  const msg = String(error.message || '');
  return (
    error.status === 408 ||
    msg.includes('Network request failed') ||
    msg.includes('Network Error') ||
    msg.includes('Timeout')
  );
}

export function resolveApiErrorMessage(error, language = 'fr') {
  if (isNetworkFailure(error)) {
    return getNetworkUnreachableMessage(language);
  }
  const msg = error?.payload?.message || error?.message;
  if (msg) return msg;
  return language === 'fr' ? 'Une erreur est survenue.' : 'An error occurred.';
}
