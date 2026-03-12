import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './contexts/LanguageContext';
import { useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { EventFormProvider } from './contexts/EventFormContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { useNavigation } from './contexts/NavigationContext';
import { useNotifications } from './hooks/useNotifications';
import { api } from './api/config';
import ErrorBoundary from './components/ErrorBoundary';
import PushNotification from './components/PushNotification';
import Drawer from './components/Drawer';
// ✅ RÉORGANISATION: Imports organisés par fonctionnalité
import HomePage from './screens/feed/HomePage';
import WelcomePage from './screens/feed/WelcomePage';
import FeedPage from './screens/feed/FeedPage';
import CreateFeedPostPage from './screens/feed/CreateFeedPostPage';

import LoginPage from './screens/auth/LoginPage';
import AccountTypePage from './screens/auth/AccountTypePage';
import RegisterCommunityPage from './screens/auth/RegisterCommunityPage';
import RegisterDjPage from './screens/auth/RegisterDjPage';
import RegisterBookerPage from './screens/auth/RegisterBookerPage';
import RegisterVenuePage from './screens/auth/RegisterVenuePage';

import DjDashboardPage from './screens/dashboard/DjDashboardPage';
import BookerDashboardPage from './screens/dashboard/BookerDashboardPage';
import BookerEventDashboardPage from './screens/dashboard/BookerEventDashboardPage';
import VenueDashboardPage from './screens/dashboard/VenueDashboardPage';
import AdminPage from './screens/dashboard/AdminPage';

import EventsPage from './screens/events/EventsPage';
import EventDetailPage from './screens/events/EventDetailPage';
import RateEventPage from './screens/events/RateEventPage';
import TicketsPage from './screens/events/TicketsPage';

import ProfilePage from './screens/profiles/ProfilePage';
import CommunityProfileEditPage from './screens/profiles/CommunityProfileEditPage';
import CommunityProfilePage from './screens/profiles/CommunityProfilePage';
import CommunityFriendsPage from './screens/profiles/CommunityFriendsPage';
import VenueProfileEditPage from './screens/profiles/VenueProfileEditPage';
import DjProfilePage from './screens/profiles/DjProfilePage';
import BookerProfilePage from './screens/profiles/BookerProfilePage';
import VenueProfilePage from './screens/profiles/VenueProfilePage';
import DjListPage from './screens/profiles/DjListPage';
import VenueListPage from './screens/profiles/VenueListPage';
import DjRatingsPage from './screens/profiles/DjRatingsPage';
import VenueRatingsPage from './screens/profiles/VenueRatingsPage';

import SelectDjPage from './screens/selection/SelectDjPage';
import SelectVenuePage from './screens/selection/SelectVenuePage';

import SwitchProfilePage from './screens/profile-management/SwitchProfilePage';

import PurchasesPage from './screens/purchases/PurchasesPage';
import PurchaseSuccessPage from './screens/purchases/PurchaseSuccessPage';

import NotificationsPage from './screens/notifications/NotificationsPage';

import RankingPage from './screens/ranking/RankingPage';

import TutorialPage from './screens/tutorial/TutorialPage';
import LegalPage from './screens/legal/LegalPage';

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
  bookerProfile: BookerProfilePage,
  djDashboard: DjDashboardPage,
  venueDashboard: VenueDashboardPage,
  bookerDashboard: BookerDashboardPage,
  bookerEventDashboard: BookerEventDashboardPage,
  selectDj: SelectDjPage,
  selectVenue: SelectVenuePage,
  venueProfile: VenueProfilePage,
  switchProfile: SwitchProfilePage,
  profile: ProfilePage,
  communityProfileEdit: CommunityProfileEditPage,
  communityProfile: CommunityProfilePage,
  communityFriends: CommunityFriendsPage,
  venueProfileEdit: VenueProfileEditPage,
  feed: FeedPage, // ✅ AJOUT: Route pour le feed
  createFeedPost: CreateFeedPostPage, // ✅ AJOUT: Route pour créer un post
  tutorial: TutorialPage, // ✅ AJOUT: Route pour le tutoriel
  notifications: NotificationsPage, // ✅ AJOUT: Route notifications (feed)
  admin: AdminPage, // ✅ AJOUT: Route admin (visible uniquement pour admins)
  legal: LegalPage, // CGU, CGV, mentions légales, politique de confidentialité
};

function AppContent() {
  const { currentPage, navigate, goBack } = useNavigation();
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

    // ✅ Si on a une notif "latest", on navigue là où il y a à lire (DJ vs BOOKER vs VENUE)
    if (latest?.profileType === 'DJ' || latest?.profileType === 'BOOKER' || latest?.profileType === 'VENUE') {
      const targetProfile = latest.profileType;

      // Si on n'est pas sur le bon profil, basculer automatiquement
      if (user?.token && user?.activeProfileType && user.activeProfileType !== targetProfile) {
        try {
          const res = await api.switchProfile(user.token, targetProfile);
          if (res?.success) {
            await refreshCurrentUser();
          }
        } catch (e) {
          console.warn('[App] Auto switch profile failed:', e?.message ?? e);
        }
      }

      const params = {
        openBookings: true,
        openChatType: latest.messageType ?? null,
        openChatEventDjId: latest.eventDjId ?? null,
        openChatEventVenueId: latest.eventVenueId ?? null,
        openChatEventId: latest.eventId ?? null,
        openChatPreview: latest.preview ?? null,
        openChatEventTitle: latest.eventTitle ?? null,
      };

      if (targetProfile === 'DJ') {
        navigate('djDashboard', params);
      } else if (targetProfile === 'VENUE') {
        navigate('venueDashboard', params);
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
  const isCreateFeedPost = currentPage === 'createFeedPost';

  return (
    <>
      <Drawer>
        {isCreateFeedPost ? (
          <ErrorBoundary
            title="Erreur création de post"
            fallback={(err, reset) => (
              <View style={[styles.loadingContainer, { padding: 20 }]}>
                <Text style={{ color: '#FF1744', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>
                  {err?.message || 'Erreur inconnue'}
                </Text>
                <TouchableOpacity
                  onPress={() => { reset(); goBack(); }}
                  style={{ backgroundColor: '#FF1744', padding: 12, borderRadius: 8 }}
                >
                  <Text style={{ color: '#fff' }}>Retour</Text>
                </TouchableOpacity>
              </View>
            )}
          >
            <ScreenComponent />
          </ErrorBoundary>
        ) : (
          <ScreenComponent />
        )}
      </Drawer>
      {/* Notification push globale */}
      {user?.isAuthenticated && (
        <PushNotification
          visible={hasNewMessage}
          message={
            latest
              ? `${latest.profileType === 'DJ' ? 'DJ' : 'Organisateur'}${latest.eventTitle ? ` • ${latest.eventTitle}` : ''}${latest.preview ? ` — ${latest.preview}` : ''}`
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
                <ConfirmProvider>
                  <AppContent />
                </ConfirmProvider>
              </EventFormProvider>
            </NavigationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

 