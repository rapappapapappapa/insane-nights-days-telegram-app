import React, { useMemo, useState } from 'react';

import HomePage from './screens/HomePage';
import MenuPage from './screens/MenuPage';
import EventsPage from './screens/EventsPage';
import TicketsPage from './screens/TicketsPage';
import ProfilePage from './screens/ProfilePage';

const SCREENS = {
  home: HomePage,
  menu: MenuPage,
  events: EventsPage,
  tickets: TicketsPage,
  profile: ProfilePage,
};

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const navigate = (page) => {
    if (!SCREENS[page]) {
      console.warn(`⚠️ Page "${page}" inconnue, retour à l'accueil.`);
      setCurrentPage('home');
      return;
    }
    setCurrentPage(page);
  };

  const ScreenComponent = useMemo(() => SCREENS[currentPage] ?? HomePage, [currentPage]);

  return <ScreenComponent onNavigate={navigate} />;
}

