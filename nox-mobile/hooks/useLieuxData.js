import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/config';
import { filterUpcomingEvents, mapBookingStatusLabel } from '../utils/noxDiscoverUtils';

export function useLieuxData(token, language = 'fr') {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [venueProfile, setVenueProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [media, setMedia] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const profileRes = await api.getVenueProfile(token);
        const profile = profileRes?.success ? profileRes.profile : null;
        setVenueProfile(profile);

        const bookingsRes = await api.getVenueBookings(token);
        setBookings(bookingsRes?.success && Array.isArray(bookingsRes.bookings) ? bookingsRes.bookings : []);

        if (profile?.id) {
          const mediaRes = await api.getVenueMedia(profile.id);
          setMedia(mediaRes?.success && Array.isArray(mediaRes.media) ? mediaRes.media : []);
        } else {
          setMedia([]);
        }
      } catch (e) {
        setError(e?.message || 'Erreur chargement');
        setBookings([]);
        setMedia([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  const pendingBookings = useMemo(
    () => bookings.filter((b) => String(b.invitationStatus || '').toUpperCase() === 'PENDING'),
    [bookings],
  );

  const upcomingBookings = useMemo(() => {
    const accepted = bookings.filter((b) => {
      const st = String(b.invitationStatus || '').toUpperCase();
      return st === 'ACCEPTED' || st === 'CONFIRMED';
    });
    return filterUpcomingEvents(
      accepted.map((b) => ({
        id: b.eventVenueId || b.id,
        title: b.eventTitle,
        date: b.eventDate,
        location: b.eventLocation,
        booking: b,
      })),
      6,
    );
  }, [bookings]);

  const respondToBooking = useCallback(
    async (eventVenueId, action, reason = null) => {
      if (!token || !eventVenueId) return { success: false };
      if (action === 'accept') {
        return api.acceptVenueInvitation(token, eventVenueId);
      }
      if (action === 'reject') {
        return api.rejectVenueInvitation(token, eventVenueId, reason);
      }
      return { success: false };
    },
    [token],
  );

  const statusLabel = useCallback((status) => mapBookingStatusLabel(status, language), [language]);

  return {
    loading,
    refreshing,
    error,
    venueProfile,
    bookings,
    pendingBookings,
    upcomingBookings,
    media,
    refresh: () => load(true),
    respondToBooking,
    statusLabel,
  };
}
