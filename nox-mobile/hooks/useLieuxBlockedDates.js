import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@nox_lieux_blocked_dates';

function normalizeKey(dateKey) {
  if (!dateKey) return null;
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function useLieuxBlockedDates(userId) {
  const [blockedDates, setBlockedDates] = useState([]);
  const [loading, setLoading] = useState(true);

  const storageKey = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setBlockedDates(Array.isArray(parsed) ? parsed : []);
    } catch {
      setBlockedDates([]);
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (next) => {
      setBlockedDates(next);
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  const toggleBlockedDate = useCallback(
    async (dateKey) => {
      const key = normalizeKey(dateKey);
      if (!key) return blockedDates;
      const set = new Set(blockedDates);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      const next = [...set].sort();
      await persist(next);
      return next;
    },
    [blockedDates, persist],
  );

  const isBlocked = useCallback(
    (dateKey) => {
      const key = normalizeKey(dateKey);
      return key ? blockedDates.includes(key) : false;
    },
    [blockedDates],
  );

  return {
    blockedDates,
    loading,
    refresh: load,
    toggleBlockedDate,
    isBlocked,
  };
}
