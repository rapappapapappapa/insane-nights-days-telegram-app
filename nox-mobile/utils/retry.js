/**
 * Utilitaires pour réessayer les requêtes API en cas d'échec
 * Utile pour les erreurs réseau temporaires
 */

import logger from './logger';

/**
 * Réessaye une fonction plusieurs fois en cas d'échec
 * @param {Function} fn - La fonction à exécuter (doit retourner une Promise)
 * @param {Object} options - Options de retry
 * @param {number} options.maxRetries - Nombre maximum de tentatives (défaut: 3)
 * @param {number} options.delay - Délai initial entre les tentatives en ms (défaut: 1000)
 * @param {Function} options.shouldRetry - Fonction pour déterminer si on doit réessayer (défaut: réessayer sur toutes les erreurs)
 * @param {boolean} options.exponentialBackoff - Utiliser un backoff exponentiel (défaut: true)
 * @returns {Promise} - Le résultat de la fonction ou une erreur après toutes les tentatives
 */
export async function retryApiCall(
  fn,
  {
    maxRetries = 3,
    delay = 1000,
    shouldRetry = null,
    exponentialBackoff = true,
  } = {}
) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (attempt > 0) {
        logger.debug(`[Retry] Succès après ${attempt} tentative(s)`);
      }
      return result;
    } catch (error) {
      lastError = error;
      
      // Vérifier si on doit réessayer cette erreur
      if (shouldRetry && !shouldRetry(error)) {
        logger.debug('[Retry] Erreur non réessayable:', error.message);
        throw error;
      }
      
      // Ne pas réessayer les erreurs de token expiré ou d'authentification
      if (error?.isTokenExpired || error?.status === 401 || error?.status === 403) {
        logger.debug('[Retry] Erreur d\'authentification, pas de retry');
        throw error;
      }
      
      // Ne pas réessayer les erreurs 4xx (sauf 408 timeout)
      if (error?.status >= 400 && error?.status < 500 && error?.status !== 408) {
        logger.debug('[Retry] Erreur client (4xx), pas de retry');
        throw error;
      }
      
      // Si c'est la dernière tentative, lancer l'erreur
      if (attempt === maxRetries) {
        logger.warn(`[Retry] Échec après ${maxRetries + 1} tentative(s):`, error.message);
        throw error;
      }
      
      // Calculer le délai pour la prochaine tentative
      const currentDelay = exponentialBackoff
        ? delay * Math.pow(2, attempt)
        : delay;
      
      logger.debug(
        `[Retry] Tentative ${attempt + 1}/${maxRetries + 1} échouée, réessai dans ${currentDelay}ms...`,
        error.message
      );
      
      // Attendre avant de réessayer
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
  
  // Ne devrait jamais arriver ici, mais au cas où
  throw lastError;
}

/**
 * Détermine si une erreur est réessayable
 * @param {Error} error - L'erreur à vérifier
 * @returns {boolean} - true si l'erreur est réessayable
 */
export function isRetryableError(error) {
  // Ne pas réessayer les erreurs d'authentification
  if (error?.isTokenExpired || error?.status === 401 || error?.status === 403) {
    return false;
  }
  
  // Ne pas réessayer les erreurs client (4xx) sauf timeout
  if (error?.status >= 400 && error?.status < 500 && error?.status !== 408) {
    return false;
  }
  
  // Réessayer les erreurs réseau, timeout, et erreurs serveur (5xx)
  return (
    error?.message?.includes('Network request failed') ||
    error?.message?.includes('Network Error') ||
    error?.name === 'AbortError' ||
    error?.status === 408 ||
    error?.status >= 500 ||
    !error?.status // Erreur sans statut (probablement réseau)
  );
}
