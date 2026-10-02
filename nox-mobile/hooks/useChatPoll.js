import { useEffect } from 'react';

const DEFAULT_INTERVAL_MS = 2800;

/**
 * Appelle pollRef.current() tant que active (ex. modal chat ouvert).
 * Permet aux destinataires de voir les nouveaux messages sans fermer le chat.
 */
export function useChatPoll({ active, pollRef, intervalMs = DEFAULT_INTERVAL_MS }) {
  useEffect(() => {
    if (!active) return undefined;
    const tick = () => {
      try {
        pollRef.current?.();
      } catch (_) {
        /* ignore */
      }
    };
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, pollRef]);
}
