/**
 * Hook personnalisé pour gérer les appels API avec gestion automatique des tokens expirés
 * Intercepte les erreurs de token expiré et déclenche automatiquement le logout
 */

import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';
import logger from '../utils/logger';

export function useApiWithAuth() {
  const { user, handleTokenExpired } = useAuth();

  /**
   * Exécute un appel API avec gestion automatique des erreurs de token expiré
   * @param {Function} apiCall - Fonction API à exécuter
   * @returns {Promise} - Résultat de l'appel API
   */
  const executeWithAuth = useCallback(async (apiCall) => {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!user?.isAuthenticated || !user?.token) {
        throw new Error('Utilisateur non authentifié');
      }

      // Exécuter l'appel API avec le token
      const result = await apiCall(user.token);
      return result;
    } catch (error) {
      // Vérifier si l'erreur est due à un token expiré
      if (error?.isTokenExpired || error?.status === 401) {
        logger.warn('[useApiWithAuth] Token expiré détecté, déconnexion automatique...');
        // Déclencher le logout automatique
        await handleTokenExpired();
        // Relancer l'erreur pour que le composant puisse la gérer
        throw new Error('Votre session a expiré. Veuillez vous reconnecter.');
      }
      // Relancer les autres erreurs telles quelles
      throw error;
    }
  }, [user?.isAuthenticated, user?.token, handleTokenExpired]);

  return {
    executeWithAuth,
    isAuthenticated: user?.isAuthenticated,
    token: user?.token,
  };
}
