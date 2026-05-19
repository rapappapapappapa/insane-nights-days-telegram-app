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
  const [unreadByProfileType, setUnreadByProfileType] = useState({ DJ: 0, BOOKER: 0, VENUE: 0, PRESTATAIRE: 0 });
  const [latest, setLatest] = useState(null); // { profileType, messageType, preview, eventDjId, eventId, eventTitle, createdAt }
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const previousCountRef = useRef(null); // ✅ CORRECTION: Initialiser à null pour détecter le premier chargement
  const isInitialLoadRef = useRef(true); // ✅ AJOUT: Flag pour savoir si c'est le premier chargement

  /**
   * Récupère le nombre de messages non lus
   * ✅ CORRECTION: Amélioration de la détection des nouveaux messages
   */
  const refreshUnreadCount = useCallback(async () => {
    if (!user?.token) {
      setUnreadCount(0);
      setUnreadByProfileType({ DJ: 0, BOOKER: 0, VENUE: 0, PRESTATAIRE: 0 });
      setLatest(null);
      previousCountRef.current = null;
      isInitialLoadRef.current = true; // ✅ Réinitialiser le flag si l'utilisateur se déconnecte
      return;
    }

    setLoading(true);
    try {
      const response = await api.getUnreadMessagesCount(user.token);
      if (response && response.success) {
        const newCount = response.count || 0;
        const nextByType = {
          DJ: Number(response?.byProfileType?.DJ || 0),
          BOOKER: Number(response?.byProfileType?.BOOKER || 0),
          VENUE: Number(response?.byProfileType?.VENUE || 0),
          PRESTATAIRE: Number(response?.byProfileType?.PRESTATAIRE || 0),
        };
        const nextLatest = response?.latest ?? null;
        const previousCount = previousCountRef.current;
        if (previousCount !== null && newCount !== previousCount) {
          console.log('[Notifications] unread changed:', {
            prev: previousCount,
            next: newCount,
            byProfileType: nextByType,
            latest: nextLatest ? { profileType: nextLatest.profileType, messageType: nextLatest.messageType, eventTitle: nextLatest.eventTitle } : null,
          });
        }

        // ✅ CORRECTION: Détecter si un nouveau message est arrivé
        // On détecte si le compteur augmente ET que ce n'est pas le premier chargement
        // Cela évite d'afficher une notification au démarrage de l'app si l'utilisateur a déjà des messages non lus
        if (!isInitialLoadRef.current && previousCount !== null && newCount > previousCount) {
          console.log(`🔔 Nouveau message détecté! ${previousCount} -> ${newCount}`);
          setHasNewMessage(true);
        }

        // ✅ Marquer que le premier chargement est terminé
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          console.log(`📬 Compteur initial de messages non lus: ${newCount}`);
        }

        setUnreadCount(newCount);
        setUnreadByProfileType(nextByType);
        setLatest(nextLatest);
        previousCountRef.current = newCount;
      }
    } catch (error) {
      console.error('Erreur récupération messages non lus:', error);
      // ✅ CORRECTION: Gérer les erreurs de token expiré
      if (error?.isTokenExpired || error?.status === 401 || error?.status === 403) {
        // Ne pas appeler handleTokenExpired ici car cela pourrait créer une boucle
        // Le token sera géré par les autres hooks/composants
        setUnreadCount(0);
        setUnreadByProfileType({ DJ: 0, BOOKER: 0, VENUE: 0, PRESTATAIRE: 0 });
        setLatest(null);
        previousCountRef.current = null;
      } else {
        setUnreadCount(0);
        setUnreadByProfileType({ DJ: 0, BOOKER: 0, VENUE: 0, PRESTATAIRE: 0 });
        setLatest(null);
        previousCountRef.current = null;
      }
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
    unreadByProfileType,
    latest,
    refreshUnreadCount,
    markAllAsRead,
    loading,
    hasNewMessage,
    clearNewMessage,
  };
}
