import React, { useCallback, useMemo, useState } from 'react';

import HomePage from './screens/HomePage';
import MenuPage from './screens/MenuPage';
import EventsPage from './screens/EventsPage';
import TicketsPage from './screens/TicketsPage';
import ProfilePage from './screens/ProfilePage';
import EventDetailPage from './screens/EventDetailPage';
import RankingPage from './screens/RankingPage';

const SCREENS = {
  home: HomePage,
  menu: MenuPage,
  events: EventsPage,
  eventDetail: EventDetailPage,
  tickets: TicketsPage,
  profile: ProfilePage,
  ranking: RankingPage,
};

export default function App() {
  const [route, setRoute] = useState({ name: 'home', params: undefined });
  const [user, setUser] = useState({
    username: 'User_insane',
    level: 1,
    score: 120,
    tickets: 0,
    eventsParticipated: 0,
    sbtActive: true,
    lastTicket: null,
  });
  const [tickets, setTickets] = useState([]);

  const navigate = (page, params) => {
    if (!SCREENS[page]) {
      console.warn(`⚠️ Page "${page}" inconnue, retour à l'accueil.`);
      setRoute({ name: 'home', params: undefined });
      return;
    }
    setRoute({ name: page, params });
  };

  const handleBuyTicket = useCallback((event) => {
    if (!event) {
      return null;
    }

    const ticketCode = `TICKET-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
    const purchaseDate = new Date().toISOString();

    let savedTicket = null;

    setTickets((prev) => {
      const existingIndex = prev.findIndex((ticket) => ticket.eventId === event.id);
      if (existingIndex !== -1) {
        const existingTicket = prev[existingIndex];
        const updatedTicket = {
          ...existingTicket,
          quantity: (existingTicket.quantity ?? 1) + 1,
          codes: [...(existingTicket.codes ?? []), ticketCode],
          lastPurchasedAt: purchaseDate,
        };
        savedTicket = updatedTicket;
        const remaining = prev.filter((_, idx) => idx !== existingIndex);
        return [updatedTicket, ...remaining];
      }

      const createdTicket = {
        id: event.id,
        eventId: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        price: event.price,
        quantity: 1,
        codes: [ticketCode],
        lastPurchasedAt: purchaseDate,
        status: 'confirmé',
      };
      savedTicket = createdTicket;
      return [createdTicket, ...prev];
    });

    setUser((prev) => {
      const updatedScore = prev.score + 50;
      const updatedTickets = prev.tickets + 1;
      const updatedEvents = prev.eventsParticipated + 1;

      return {
        ...prev,
        score: updatedScore,
        tickets: updatedTickets,
        eventsParticipated: updatedEvents,
        level: Math.floor(updatedScore / 200) + 1,
        lastTicket: savedTicket,
      };
    });

    return savedTicket;
  }, []);

  const handleRemoveTicket = useCallback((eventId) => {
    if (!eventId) {
      return false;
    }

    let removedTicket = null;
    let updatedTicketsList = [];

    setTickets((prev) => {
      const index = prev.findIndex((ticket) => ticket.eventId === eventId);
      if (index === -1) {
        updatedTicketsList = prev;
        return prev;
      }
      removedTicket = prev[index];
      updatedTicketsList = prev.filter((_, idx) => idx !== index);
      return updatedTicketsList;
    });

    if (!removedTicket) {
      return false;
    }

    setUser((prev) => {
      const quantityRemoved = removedTicket.quantity ?? 1;
      const newScore = Math.max(0, prev.score - 50 * quantityRemoved);
      const newTicketsCount = Math.max(0, prev.tickets - quantityRemoved);
      const newEventsCount = Math.max(0, prev.eventsParticipated - quantityRemoved);
      const recalculatedLevel = Math.max(1, Math.floor(newScore / 200) + 1);

      return {
        ...prev,
        score: newScore,
        tickets: newTicketsCount,
        eventsParticipated: newEventsCount,
        level: recalculatedLevel,
        lastTicket: updatedTicketsList[0] ?? null,
      };
    });

    return true;
  }, []);

  const handleUpdateUser = useCallback((partialUser) => {
    setUser((prev) => ({
      ...prev,
      ...partialUser,
    }));
  }, []);

  const ScreenComponent = useMemo(() => SCREENS[route.name] ?? HomePage, [route.name]);

  return (
    <ScreenComponent
      onNavigate={navigate}
      routeParams={route.params}
      user={user}
      tickets={tickets}
      onBuyTicket={handleBuyTicket}
      onUpdateUser={handleUpdateUser}
      onRemoveTicket={handleRemoveTicket}
    />
  );
}

