import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/config';

/**
 * Réservations / invitations prestataire.
 */
export function usePrestataireBookings({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!user?.token) return;
    setLoadingBookings(true);
    try {
      const res = await api.getPrestataireBookings(user.token);
      if (res?.success) setBookings(res.bookings || []);
      else setBookings([]);
    } catch (e) {
      console.error('[PrestataireDashboard] fetchBookings', e);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, [user?.token]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    loadingBookings,
    fetchBookings,
  };
}
