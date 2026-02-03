import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './contexts/LanguageContext';
import { useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { EventFormProvider } from './contexts/EventFormContext';
import { useNavigation } from './contexts/NavigationContext';
import { useNotifications } from './hooks/useNotifications';
import { api } from './api/config';
import ErrorBoundary from './components/ErrorBoundary';
import PushNotification from './components/PushNotification';
import Drawer from './components/Drawer';
import HomePage from './screens/HomePage';
import LoginPage from './screens/LoginPage';
import AccountTypePage from './screens/AccountTypePage';
import RegisterCommunityPage from './screens/RegisterCommunityPage';
import RegisterDjPage from './screens/RegisterDjPage';
import RegisterBookerPage from './screens/RegisterBookerPage';
import RegisterVenuePage from './screens/RegisterVenuePage';
import WelcomePage from './screens/WelcomePage';
import EventsPage from './screens/EventsPage';
import EventDetailPage from './screens/EventDetailPage';
import PurchaseSuccessPage from './screens/PurchaseSuccessPage';
import DjRatingsPage from './screens/DjRatingsPage';
import VenueRatingsPage from './screens/VenueRatingsPage';
import RateEventPage from './screens/RateEventPage';
import TicketsPage from './screens/TicketsPage';
import PurchasesPage from './screens/PurchasesPage';
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
import FeedPage from './screens/FeedPage'; // ✅ AJOUT: Page Feed d'actualité
import CreateFeedPostPage from './screens/CreateFeedPostPage'; // ✅ AJOUT: Page création de post
import TutorialPage from './screens/TutorialPage'; // ✅ AJOUT: Page de tutoriel
import NotificationsPage from './screens/NotificationsPage'; // ✅ AJOUT: Page notifications (feed)
import AdminPage from './screens/AdminPage'; // ✅ AJOUT: Page admin

const SCREENS = {
  home: HomePage,
  login: LoginPage,
  accountType: AccountTypePage,
  registerCommunity: RegisterCommunityPage,
  registerDj: RegisterDjPage,
  registerBooker: RegisterBookerPage,
  registerVenue: RegisterVenuePage,
  welcome: WelcomePage,
  events: EventsPage,
  eventDetail: EventDetailPage,
  purchaseSuccess: PurchaseSuccessPage,
  tickets: TicketsPage,
  purchases: PurchasesPage,
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
  feed: FeedPage, // ✅ AJOUT: Route pour le feed
  createFeedPost: CreateFeedPostPage, // ✅ AJOUT: Route pour créer un post
  tutorial: TutorialPage, // ✅ AJOUT: Route pour le tutoriel
  notifications: NotificationsPage, // ✅ AJOUT: Route notifications (feed)
  admin: AdminPage, // ✅ AJOUT: Route admin (visible uniquement pour admins)
};

function AppContent() {
  const { currentPage, navigate } = useNavigation();
  const { language } = useLanguage();
  const { user, isInitializing, refreshCurrentUser } = useAuth();
  const { hasNewMessage, clearNewMessage, latest } = useNotifications();

  // expo-av Video is deprecated in favor of expo-video, but we use it as a
  // temporary workaround for Android crashes with expo-video.
  useEffect(() => {
    LogBox.ignoreLogs([
      '[expo-av]: Video component from `expo-av` is deprecated in favor of `expo-video`.',
    ]);
  }, []);
  
  // ✅ AJOUT: Log pour debug - vérifier que hasNewMessage change bien
  useEffect(() => {
    if (hasNewMessage) {
      console.log('🔔 App.js: hasNewMessage est TRUE - La notification devrait s\'afficher');
    }
  }, [hasNewMessage]);
  
  // IMPORTANT: Tous les Hooks doivent être appelés AVANT tout return conditionnel
  // Si l'utilisateur est connecté et qu'on est sur home, rediriger vers welcome
  useEffect(() => {
    if (!isInitializing) {
      if (user?.isAuthenticated && currentPage === 'home') {
        navigate('welcome');
      } else if (user?.isAuthenticated && currentPage === 'login') {
        navigate('welcome');
      } else if (!user?.isAuthenticated && currentPage === 'welcome') {
        navigate('home');
      }
    }
  }, [user?.isAuthenticated, currentPage, navigate, isInitializing]);

  // Gérer la navigation vers le chat quand on clique sur la notification
  const handleNotificationPress = async () => {
    if (!user?.isAuthenticated) return;

    // ✅ Si on a une notif "latest", on navigue là où il y a à lire (DJ vs BOOKER)
    if (latest?.profileType === 'DJ' || latest?.profileType === 'BOOKER') {
      const targetProfile = latest.profileType;

      // Si on n'est pas sur le bon profil, basculer automatiquement
      if (user?.token && user?.activeProfileType && user.activeProfileType !== targetProfile) {
        try {
          const res = await api.switchProfile(user.token, targetProfile);
          if (res?.success) {
            await refreshCurrentUser();
          }
        } catch (e) {
          // best-effort: on continue quand même vers le dashboard
          console.warn('[App] Auto switch profile failed:', e?.message ?? e);
        }
      }

      const params = {
        openBookings: true,
        openChatType: latest.messageType ?? null, // 'PRIVATE' | 'GROUP'
        openChatEventDjId: latest.eventDjId ?? null,
        openChatEventId: latest.eventId ?? null,
        openChatPreview: latest.preview ?? null,
        openChatEventTitle: latest.eventTitle ?? null,
      };

      if (targetProfile === 'DJ') {
        navigate('djDashboard', params);
      } else {
        navigate('bookerDashboard', params);
      }
    } else {
      // Fallback: Naviguer vers le dashboard approprié selon le profil actif
      if (user.activeProfileType === 'DJ') {
        navigate('djDashboard', { openBookings: true });
      } else if (user.activeProfileType === 'BOOKER') {
        navigate('bookerDashboard', { openBookings: true });
      } else {
        navigate('welcome');
      }
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
      <Drawer>
        <ScreenComponent />
      </Drawer>
      {/* Notification push globale */}
      {user?.isAuthenticated && (
        <PushNotification
          visible={hasNewMessage}
          message={
            latest
              ? `${latest.profileType === 'DJ' ? 'DJ' : 'Booker'}${latest.eventTitle ? ` • ${latest.eventTitle}` : ''}${latest.preview ? ` — ${latest.preview}` : ''}`
              : (language === 'fr' ? 'Vous avez reçu un nouveau message' : 'You have received a new message')
          }
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
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}

 