import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { EventFormProvider } from './contexts/EventFormContext';
import { useNavigation } from './contexts/NavigationContext';
import { useNotifications } from './hooks/useNotifications';
import ErrorBoundary from './components/ErrorBoundary';
import PushNotification from './components/PushNotification';
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
import VenueListPage from './screens/VenueListPage';
import DjProfilePage from './screens/DjProfilePage';
import DjDashboardPage from './screens/DjDashboardPage';
import BookerDashboardPage from './screens/BookerDashboardPage';
import VenueDashboardPage from './screens/VenueDashboardPage';
import SelectDjPage from './screens/SelectDjPage';
import SelectVenuePage from './screens/SelectVenuePage';
import VenueProfilePage from './screens/VenueProfilePage';
import SwitchProfilePage from './screens/SwitchProfilePage';
import ProfilePage from './screens/ProfilePage';

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
  venueList: VenueListPage,
  djProfile: DjProfilePage,
  djDashboard: DjDashboardPage,
  venueDashboard: VenueDashboardPage,
  bookerDashboard: BookerDashboardPage,
  selectDj: SelectDjPage,
  selectVenue: SelectVenuePage,
  venueProfile: VenueProfilePage,
  switchProfile: SwitchProfilePage,
  profile: ProfilePage,
};

function AppContent() {
  const { currentPage, navigate } = useNavigation();
  const { user, isInitializing } = useAuth();
  const { hasNewMessage, clearNewMessage } = useNotifications();
  
  // IMPORTANT: Tous les Hooks doivent être appelés AVANT tout return conditionnel
  // Si l'utilisateur est connecté et qu'on est sur home, rediriger vers welcome
  useEffect(() => {
    if (!isInitializing) {
      if (user?.isAuthenticated && currentPage === 'home') {
        navigate('welcome');
      } else if (!user?.isAuthenticated && currentPage === 'welcome') {
        navigate('home');
      }
    }
  }, [user?.isAuthenticated, currentPage, navigate, isInitializing]);

  // Gérer la navigation vers le chat quand on clique sur la notification
  const handleNotificationPress = () => {
    if (!user?.isAuthenticated) return;

    // Naviguer vers le dashboard approprié selon le profil actif avec la section bookings ouverte
    if (user.activeProfileType === 'DJ') {
      navigate('djDashboard', { openBookings: true });
    } else if (user.activeProfileType === 'BOOKER') {
      navigate('bookerDashboard', { openBookings: true });
    } else {
      // Par défaut, aller sur welcome
      navigate('welcome');
    }
    clearNewMessage();
  };
  
  // Afficher un loader pendant l'initialisation de l'authentification
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF1744" />
      </View>
    );
  }
  
  const ScreenComponent = SCREENS[currentPage] || HomePage;
  
  return (
    <>
      <ScreenComponent />
      {/* Notification push globale */}
      {user?.isAuthenticated && (
        <PushNotification
          visible={hasNewMessage}
          message="Vous avez reçu un nouveau message"
          onPress={handleNotificationPress}
          onClose={clearNewMessage}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0b0e',
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <NavigationProvider>
            <EventFormProvider>
              <AppContent />
            </EventFormProvider>
          </NavigationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

 