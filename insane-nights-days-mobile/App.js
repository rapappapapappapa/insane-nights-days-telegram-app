import React, { useEffect } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { useNavigation } from './contexts/NavigationContext';
import HomePage from './screens/HomePage';
import AccountTypePage from './screens/AccountTypePage';
import RegisterCommunityPage from './screens/RegisterCommunityPage';
import RegisterDjPage from './screens/RegisterDjPage';
import RegisterBookerPage from './screens/RegisterBookerPage';
import RegisterVenuePage from './screens/RegisterVenuePage';
import WelcomePage from './screens/WelcomePage';
import EventsPage from './screens/EventsPage';
import EventDetailPage from './screens/EventDetailPage';
import DjRatingsPage from './screens/DjRatingsPage';
import VenueRatingsPage from './screens/VenueRatingsPage';
import RateEventPage from './screens/RateEventPage';
import TicketsPage from './screens/TicketsPage';
import DjListPage from './screens/DjListPage';
import DjProfilePage from './screens/DjProfilePage';

const SCREENS = {
  home: HomePage,
  accountType: AccountTypePage,
  registerCommunity: RegisterCommunityPage,
  registerDj: RegisterDjPage,
  registerBooker: RegisterBookerPage,
  registerVenue: RegisterVenuePage,
  welcome: WelcomePage,
  events: EventsPage,
  eventDetail: EventDetailPage,
  tickets: TicketsPage,
  djRatings: DjRatingsPage,
  venueRatings: VenueRatingsPage,
  rateEvent: RateEventPage,
  djList: DjListPage,
  djProfile: DjProfilePage,
};

function AppContent() {
  const { currentPage, navigate } = useNavigation();
  const { user } = useAuth();
  
  // Si l'utilisateur est connecté et qu'on est sur home, rediriger vers welcome
  useEffect(() => {
    if (user?.isAuthenticated && currentPage === 'home') {
      navigate('welcome');
    } else if (!user?.isAuthenticated && currentPage === 'welcome') {
      navigate('home');
    }
  }, [user?.isAuthenticated, currentPage, navigate]);
  
  const ScreenComponent = SCREENS[currentPage] || HomePage;
  
  return <ScreenComponent />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NavigationProvider>
          <AppContent />
        </NavigationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

