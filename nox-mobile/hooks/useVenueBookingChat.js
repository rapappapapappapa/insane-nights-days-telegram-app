import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/config';
import { useChatPoll } from './useChatPoll';

/**
 * Chat Organisateur ↔ Lieu (extrait de useVenueDashboard pour écrans NOX).
 */
export function useVenueBookingChat({ token, eventVenueId, onError }) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  const onErrorRef = useRef(onError);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    initialLoadDoneRef.current = false;
    setMessages([]);
    setDraft('');
    setLoading(!!token && !!eventVenueId);
  }, [token, eventVenueId]);

  const loadMessages = useCallback(
    async (options = {}) => {
      const silent = options.silent === true;
      if (!token || !eventVenueId) {
        setLoading(false);
        return;
      }
      if (!silent && !initialLoadDoneRef.current) setLoading(true);
      try {
        const response = await api.getVenueMessages(token, eventVenueId);
        if (response?.success && Array.isArray(response.messages)) {
          const incoming = response.messages;
          setMessages((prev) => {
            if (!silent) return incoming;
            const prevLast = prev[prev.length - 1]?.id;
            const nextLast = incoming[incoming.length - 1]?.id;
            if (prevLast !== nextLast || incoming.length !== prev.length) {
              setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 60);
            }
            return incoming;
          });
          if (!silent) {
            setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: false }), 100);
          }
        }
      } catch (e) {
        if (!silent) onErrorRef.current?.(e?.message);
      } finally {
        if (!silent) {
          initialLoadDoneRef.current = true;
          setLoading(false);
        }
      }
    },
    [token, eventVenueId],
  );

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (token) {
      api.markAllMessagesAsRead(token).catch(() => {});
    }
  }, [token, eventVenueId]);

  const pollRef = useRef(() => {});
  pollRef.current = () => {
    if (token && eventVenueId) loadMessages({ silent: true });
  };

  useChatPoll({
    active: !!token && !!eventVenueId,
    pollRef,
  });

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!token || !eventVenueId || !text || sending) return false;
    setDraft('');
    setSending(true);
    try {
      const response = await api.sendVenueMessage(token, eventVenueId, text);
      if (response?.success) {
        await loadMessages({ silent: true });
        return true;
      }
      onErrorRef.current?.(response?.message);
      setDraft(text);
      return false;
    } catch (e) {
      onErrorRef.current?.(e?.message);
      setDraft(text);
      return false;
    } finally {
      setSending(false);
    }
  }, [token, eventVenueId, draft, sending, loadMessages]);

  return {
    loading,
    sending,
    messages,
    draft,
    setDraft,
    sendMessage,
    scrollRef,
    refresh: () => loadMessages({ silent: true }),
  };
}
