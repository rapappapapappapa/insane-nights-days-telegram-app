import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';

/**
 * Hook personnalisé pour gérer les notifications de messages non lus
 * @returns {Object} - { unreadCount, refreshUnreadCount, markAllAsRead, loading, hasNewMessage, clearNewMessage }
 */
export function useNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const previousCountRef = useRef(0);

  /**
   * Récupère le nombre de messages non lus
   */
  const refreshUnreadCount = useCallback(async () => {
    if (!user?.token) {
      setUnreadCount(0);
      previousCountRef.current = 0;
      return;
    }

    setLoading(true);
    try {
      const response = await api.getUnreadMessagesCount(user.token);
      if (response && response.success) {
        const newCount = response.count || 0;
        const previousCount = previousCountRef.current;

        // Détecter si un nouveau message est arrivé
        if (newCount > previousCount && previousCount > 0) {
          setHasNewMessage(true);
        }

        setUnreadCount(newCount);
        previousCountRef.current = newCount;
      }
    } catch (error) {
      console.error('Erreur récupération messages non lus:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  /**
   * Marque tous les messages non lus comme lus
   */
  const markAllAsRead = useCallback(async () => {
    if (!user?.token) return;

    try {
      const response = await api.markAllMessagesAsRead(user.token);
      if (response && response.success) {
        // Rafraîchir le compteur immédiatement
        await refreshUnreadCount();
        setHasNewMessage(false);
      }
    } catch (error) {
      console.error('Erreur marquage messages lus:', error);
    }
  }, [user?.token, refreshUnreadCount]);

  /**
   * Réinitialise le flag de nouveau message
   */
  const clearNewMessage = useCallback(() => {
    setHasNewMessage(false);
  }, []);

  // Rafraîchir le compteur au chargement et quand le token change
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Rafraîchir automatiquement toutes les 10 secondes pour détecter rapidement les nouveaux messages
  useEffect(() => {
    if (!user?.token) return;

    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 10000); // 10 secondes pour une détection plus rapide

    return () => clearInterval(interval);
  }, [user?.token, refreshUnreadCount]);

  return {
    unreadCount,
    refreshUnreadCount,
    markAllAsRead,
    loading,
    hasNewMessage,
    clearNewMessage,
  };
}
