import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@nox_lieu_event_drafts_v1';

export function useLieuxEventDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setDrafts(Array.isArray(parsed) ? parsed : []);
    } catch {
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveDraft = useCallback(async (draft) => {
    const entry = {
      id: `local-${Date.now()}`,
      eventTitle: draft.title?.trim() || 'Sans titre',
      eventDate: draft.date || '',
      eventTime: draft.time || '',
      description: draft.description || '',
      eventStatus: 'DRAFT',
      invitationStatus: 'DRAFT',
      isLocalDraft: true,
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...drafts];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setDrafts(next);
    return entry;
  }, [drafts]);

  const deleteDraft = useCallback(async (id) => {
    const next = drafts.filter((d) => d.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setDrafts(next);
  }, [drafts]);

  return { drafts, loading, load, saveDraft, deleteDraft };
}
