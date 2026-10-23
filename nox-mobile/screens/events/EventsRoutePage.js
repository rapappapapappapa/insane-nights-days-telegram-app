import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LegacyScreenRedirect from '../../components/LegacyScreenRedirect';
import EventsPage from './EventsPage';

/**
 * Route `events` : redirect COMMUNITY / VENUE / invité → NOX ; DJ / BOOKER / PRESTATAIRE → EventsPage pro.
 * @see docs/mobile/PLAN_MIGRATION_NOX_LEGACY.md Phase D2
 */
export default function EventsRoutePage() {
  const { user } = useAuth();
  const profile = user?.activeProfileType;

  if (!user?.isAuthenticated) {
    return <LegacyScreenRedirect legacyKey="home" />;
  }

  if (profile === 'COMMUNITY' || profile === 'VENUE') {
    return <LegacyScreenRedirect legacyKey="events" />;
  }

  return <EventsPage />;
}
