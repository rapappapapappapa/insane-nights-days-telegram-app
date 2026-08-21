/** Message affiché quand fetch échoue (réseau, DNS, serveur injoignable). */
export function getNetworkUnreachableMessage(language = 'fr') {
  return language === 'fr'
    ? 'Impossible de joindre le serveur. Vérifie ta connexion Internet et réessaie.'
    : 'Cannot reach the server. Check your internet connection and try again.';
}
