/** Message affiché quand fetch échoue (réseau, DNS, serveur injoignable). */
export function getNetworkUnreachableMessage(language = 'fr') {
  return language === 'fr'
    ? 'Impossible de joindre le serveur. Vérifie ta connexion Internet et réessaie.'
    : 'Cannot reach the server. Check your internet connection and try again.';
}

/** Réponse `null` de apiRequest ou erreur fetch / timeout. */
export function isNetworkFailure(errorOrNull) {
  if (errorOrNull == null) return true;
  const msg = String(errorOrNull?.message || '');
  return (
    errorOrNull?.status === 408 ||
    msg.includes('Network request failed') ||
    msg.includes('Network Error') ||
    msg.includes('Timeout')
  );
}

export function resolveApiErrorMessage(errorOrNull, language = 'fr') {
  if (isNetworkFailure(errorOrNull)) {
    return getNetworkUnreachableMessage(language);
  }
  const msg = errorOrNull?.message;
  if (msg) return msg;
  return language === 'fr' ? 'Une erreur est survenue.' : 'An error occurred.';
}
