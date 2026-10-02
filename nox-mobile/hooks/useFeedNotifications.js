import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';

/**
 * ✅ AJOUT: Hook pour gérer les notifications du feed
 * Récupère le nombre de notifications non lues et les rafraîchit périodiquement
 */
export function useFeedNotifications() {
  const { user, handleTokenExpired } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  /**
   * Récupère le nombre de notifications non lues
   */
  const refreshUnreadCount = useCallback(async () => {
    if (!user?.token) {
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const response = await api.getFeedNotificationsUnreadCount(user.token);
      if (response && response.success) {
        setUnreadCount(response.count || 0);
      }
    } catch (error) {
      console.error('Erreur récupération notifications feed:', error);
      // ✅ CORRECTION: Gérer les erreurs de token expiré
      if (error?.isTokenExpired || error?.status === 401 || error?.status === 403) {
        handleTokenExpired();
      } else {
        setUnreadCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  // Rafraîchir au chargement et toutes les 15 secondes
  useEffect(() => {
    refreshUnreadCount();

    // Mettre en place le polling toutes les 15 secondes
    intervalRef.current = setInterval(() => {
      refreshUnreadCount();
    }, 15000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshUnreadCount]);

  return {
    unreadCount,
    loading,
    refreshUnreadCount,
  };
}
