import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, LogBox, Platform, BackHandler, ToastAndroid } from 'react-native';
import Colors from './constants/colors';
import { useNoxFonts } from './hooks/useNoxFonts';
import * as Updates from 'expo-updates';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './contexts/LanguageContext';
import { useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { EventFormProvider } from './contexts/EventFormContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { useNavigation } from './contexts/NavigationContext';
import { useNotifications } from './hooks/useNotifications';
import { useExpoPushRegistration } from './hooks/useExpoPushRegistration';
import * as Notifications from 'expo-notifications';
import { api } from './api/config';
import ErrorBoundary from './components/ErrorBoundary';
import PushNotification from './components/PushNotification';
import Drawer from './components/Drawer';
import NoxRadialNav from './components/nox/NoxRadialNav';
import { getHomeScreenForProfile, shouldShowDrawerMenuButton } from './utils/noxRoleNavigation';
// ✅ RÉORGANISATION: Imports organisés par fonctionnalité
import HomePage from './screens/feed/HomePage';
import OnboardingPage from './screens/onboarding/OnboardingPage';
import WelcomePage from './screens/feed/WelcomePage';
import FeedPage from './screens/feed/FeedPage';
import CreateFeedPostPage from './screens/feed/CreateFeedPostPage';

import LoginPage from './screens/auth/LoginPage';
import AccountTypePage from './screens/auth/AccountTypePage';
import RegisterCommunityPage from './screens/auth/RegisterCommunityPage';
import RegisterDjPage from './screens/auth/RegisterDjPage';
import RegisterBookerPage from './screens/auth/RegisterBookerPage';
import RegisterVenuePage from './screens/auth/RegisterVenuePage';
import RegisterPrestatairePage from './screens/auth/RegisterPrestatairePage';

import DjDashboardPage from './screens/dashboard/DjDashboardPage';
import BookerDashboardPage from './screens/dashboard/BookerDashboardPage';
import BookerEventDashboardPage from './screens/dashboard/BookerEventDashboardPage';
import VenueDashboardPage from './screens/dashboard/VenueDashboardPage';
import PrestataireDashboardPage from './screens/dashboard/PrestataireDashboardPage';
import AdminPage from './screens/dashboard/AdminPage';

import EventsPage from './screens/events/EventsPage';
import EventDetailPage from './screens/events/EventDetailPage';
import RateEventPage from './screens/events/RateEventPage';
import TicketsPage from './screens/events/TicketsPage';
import EventStaffPage from './screens/events/EventStaffPage';
import ScanTicketPage from './screens/events/ScanTicketPage';
import StaffEventsPage from './screens/events/StaffEventsPage';

import ProfilePage from './screens/profiles/ProfilePage';
import CommunityProfileEditPage from './screens/profiles/CommunityProfileEditPage';
import CommunityProfilePage from './screens/profiles/CommunityProfilePage';
import CommunityFriendsPage from './screens/profiles/CommunityFriendsPage';
import BookerFriendsPage from './screens/profiles/BookerFriendsPage';
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
import SelectPrestatairePage from './screens/selection/SelectPrestatairePage';

import SwitchProfilePage from './screens/profile-management/SwitchProfilePage';

import PurchasesPage from './screens/purchases/PurchasesPage';
import PurchaseSuccessPage from './screens/purchases/PurchaseSuccessPage';

import NotificationsPage from './screens/notifications/NotificationsPage';

import RankingPage from './screens/ranking/RankingPage';

import TutorialPage from './screens/tutorial/TutorialPage';
import LegalPage from './screens/legal/LegalPage';

// LIEUX (nouveau design, UI-first)
import LieuxDashboardPage from './screens/lieux/LieuxDashboardPage';
import LieuxProfilPage from './screens/lieux/LieuxProfilPage';
import LieuxAvailabilityPage from './screens/lieux/LieuxAvailabilityPage';
import LieuxMediaPage from './screens/lieux/LieuxMediaPage';
import LieuxRequestDetailPage from './screens/lieux/LieuxRequestDetailPage';
import LieuxBookingChatPage from './screens/lieux/LieuxBookingChatPage';
import LieuxEventsPage from './screens/lieux/LieuxEventsPage';
import LieuxEventDetailPage from './screens/lieux/LieuxEventDetailPage';
import LieuxSettingsPage from './screens/lieux/LieuxSettingsPage';
import LieuxScannerPage from './screens/lieux/LieuxScannerPage';
import LieuxNotificationsPage from './screens/lieux/LieuxNotificationsPage';
import LieuxFeedPage from './screens/lieux/LieuxFeedPage';
import LieuxStaffPage from './screens/lieux/LieuxStaffPage';

// COMMUNAUTÉ (nouveau design, UI-first)
import CommunityOnboardingPage from './screens/community/CommunityOnboardingPage';
import CommunityHomePage from './screens/community/CommunityHomePage';
import CommunityMyProfilePage from './screens/community/CommunityMyProfilePage';
import CommunityPushOptInPage from './screens/community/CommunityPushOptInPage';
import CommunityEventDetailPage from './screens/community/CommunityEventDetailPage';
import CommunityDiscoverPage from './screens/community/CommunityDiscoverPage';

const SCREENS = {
  onboarding: OnboardingPage,
  home: HomePage,
  login: LoginPage,
  accountType: AccountTypePage,
  registerCommunity: RegisterCommunityPage,
  registerDj: RegisterDjPage,
  registerBooker: RegisterBookerPage,
  registerVenue: RegisterVenuePage,
  registerPrestataire: RegisterPrestatairePage,
  welcome: WelcomePage,
  events: EventsPage,
  eventDetail: EventDetailPage,
  purchaseSuccess: PurchaseSuccessPage,
  tickets: TicketsPage,
  purchases: PurchasesPage,
  djRatings: DjRatingsPage,
  ranking: RankingPage,
  venueRatings: VenueRatingsPage,
  rateEvent: RateEventPage,
  djList: DjListPage,
  venueList: VenueListPage,
  djProfile: DjProfilePage,
  bookerProfile: BookerProfilePage,
  djDashboard: DjDashboardPage,
  venueDashboard: VenueDashboardPage,
  prestataireDashboard: PrestataireDashboardPage,
  bookerDashboard: BookerDashboardPage,
  bookerEventDashboard: BookerEventDashboardPage,
  selectDj: SelectDjPage,
  selectVenue: SelectVenuePage,
  selectPrestataire: SelectPrestatairePage,
  venueProfile: VenueProfilePage,
  switchProfile: SwitchProfilePage,
  profile: ProfilePage,
  communityProfileEdit: CommunityProfileEditPage,
  communityProfile: CommunityProfilePage,
  communityFriends: CommunityFriendsPage,
  bookerFriends: BookerFriendsPage,
  eventStaff: EventStaffPage,
  scanTicket: ScanTicketPage,
  staffEvents: StaffEventsPage,
  venueProfileEdit: VenueProfileEditPage,
  feed: FeedPage, // ✅ AJOUT: Route pour le feed
  createFeedPost: CreateFeedPostPage, // ✅ AJOUT: Route pour créer un post
  tutorial: TutorialPage, // ✅ AJOUT: Route pour le tutoriel
  notifications: NotificationsPage, // ✅ AJOUT: Route notifications (feed)
  admin: AdminPage, // ✅ AJOUT: Route admin (visible uniquement pour admins)
  legal: LegalPage, // CGU, CGV, mentions légales, politique de confidentialité
  // LIEUX (nouveau design)
  lieuxDashboard: LieuxDashboardPage,
  lieuxProfil: LieuxProfilPage,
  lieuxAvailability: LieuxAvailabilityPage,
  lieuxMedia: LieuxMediaPage,
  lieuxRequestDetail: LieuxRequestDetailPage,
  lieuxBookingChat: LieuxBookingChatPage,
  lieuxEvents: LieuxEventsPage,
  lieuxEventDetail: LieuxEventDetailPage,
  lieuxSettings: LieuxSettingsPage,
  lieuxScanner: LieuxScannerPage,
  lieuxNotifications: LieuxNotificationsPage,
  lieuxFeed: LieuxFeedPage,
  lieuxStaff: LieuxStaffPage,
  // COMMUNAUTÉ (nouveau design)
  communityOnboarding: CommunityOnboardingPage,
  communityHome: CommunityHomePage,
  communityMyProfile: CommunityMyProfilePage,
  communityPushOptIn: CommunityPushOptInPage,
  communityEventDetail: CommunityEventDetailPage,
  communityDiscover: CommunityDiscoverPage,
};

function AppContent() {
  const { currentPage, navigate, goBack, tryHardwareBack, setBackFallback } = useNavigation();
  const { language } = useLanguage();
  const { user, isInitializing, refreshCurrentUser } = useAuth();
  const { hasNewMessage, clearNewMessage, latest } = useNotifications();
  const androidExitPressRef = useRef(0);
  const initialPushHandledRef = useRef(false);
  const drawerRef = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useExpoPushRegistration(user);

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
  
  useEffect(() => {
    if (user?.isAuthenticated) {
      setBackFallback(getHomeScreenForProfile(user?.activeProfileType));
    } else {
      setBackFallback('onboarding');
    }
  }, [user?.isAuthenticated, user?.activeProfileType, setBackFallback]);

  // IMPORTANT: Tous les Hooks doivent être appelés AVANT tout return conditionnel
  // Si l'utilisateur est connecté et qu'on est sur home, rediriger vers welcome
  useEffect(() => {
    if (!isInitializing) {
      const homeScreen = getHomeScreenForProfile(user?.activeProfileType);
      if (user?.isAuthenticated && (currentPage === 'home' || currentPage === 'onboarding')) {
        navigate(homeScreen);
      } else if (user?.isAuthenticated && currentPage === 'login') {
        navigate(homeScreen);
      } else if (!user?.isAuthenticated && currentPage === 'welcome') {
        navigate('onboarding');
      }
    }
  }, [user?.isAuthenticated, user?.activeProfileType, currentPage, navigate, isInitializing]);

  useEffect(() => {
    androidExitPressRef.current = 0;
  }, [currentPage]);

  // Android : pile d’abord ; sur écran racine (home du rôle), double appui pour quitter.
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const homeScreen = user?.isAuthenticated
      ? getHomeScreenForProfile(user?.activeProfileType)
      : 'onboarding';
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tryHardwareBack()) return true;
      if (currentPage !== 'onboarding' && currentPage !== homeScreen) return false;
      const now = Date.now();
      if (now - androidExitPressRef.current < 2500) {
        BackHandler.exitApp();
        return true;
      }
      androidExitPressRef.current = now;
      ToastAndroid.show(
        language === 'fr' ? 'Appuyez encore pour quitter' : 'Press again to exit',
        ToastAndroid.SHORT
      );
      return true;
    });
    return () => sub.remove();
  }, [tryHardwareBack, currentPage, language, user?.isAuthenticated, user?.activeProfileType]);

  // Gérer la navigation vers le chat quand on clique sur la notification
  const handleNotificationPress = async () => {
    if (!user?.isAuthenticated) return;

    // ✅ Si on a une notif "latest", on navigue là où il y a à lire (DJ vs BOOKER vs VENUE)
    if (latest?.profileType === 'DJ' || latest?.profileType === 'BOOKER' || latest?.profileType === 'VENUE' || latest?.profileType === 'PRESTATAIRE') {
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
        openChatEventPrestataireId: latest.eventPrestataireId ?? null,
        openChatEventId: latest.eventId ?? null,
        openChatPreview: latest.preview ?? null,
        openChatEventTitle: latest.eventTitle ?? null,
      };

      if (targetProfile === 'DJ') {
        navigate('djDashboard', params);
      } else if (targetProfile === 'VENUE') {
        navigate('venueDashboard', params);
      } else if (targetProfile === 'PRESTATAIRE') {
        navigate('prestataireDashboard', params);
      } else {
        navigate('bookerDashboard', params);
      }
    } else {
      navigate(getHomeScreenForProfile(user.activeProfileType));
    }

    clearNewMessage();
  };

  const navigateToChatFromPushData = useCallback(
    async (data) => {
      if (!data || data.type !== 'CHAT_MESSAGE') return;
      if (!user?.isAuthenticated || !user?.token) return;
      const targetProfile = data.profileType;
      if (!targetProfile || !['DJ', 'BOOKER', 'VENUE', 'PRESTATAIRE'].includes(targetProfile)) return;

      if (user.activeProfileType && user.activeProfileType !== targetProfile) {
        try {
          const res = await api.switchProfile(user.token, targetProfile);
          if (res?.success) {
            await refreshCurrentUser();
          }
        } catch (e) {
          console.warn('[App] push: switch profil', e?.message ?? e);
        }
      }

      const params = {
        openBookings: true,
        openChatType: data.messageType ?? null,
        openChatEventDjId: data.eventDjId ?? null,
        openChatEventVenueId: data.eventVenueId ?? null,
        openChatEventPrestataireId: data.eventPrestataireId ?? null,
        openChatEventId: data.eventId ?? null,
        openChatPreview: data.preview ?? null,
        openChatEventTitle: data.eventTitle ?? null,
      };

      if (targetProfile === 'DJ') {
        navigate('djDashboard', params);
      } else if (targetProfile === 'VENUE') {
        navigate('venueDashboard', params);
      } else if (targetProfile === 'PRESTATAIRE') {
        navigate('prestataireDashboard', params);
      } else {
        navigate('bookerDashboard', params);
      }
    },
    [user?.isAuthenticated, user?.token, user?.activeProfileType, navigate, refreshCurrentUser]
  );

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      navigateToChatFromPushData(data);
    });
    return () => sub.remove();
  }, [navigateToChatFromPushData]);

  useEffect(() => {
    if (!user?.isAuthenticated) {
      initialPushHandledRef.current = false;
    }
  }, [user?.isAuthenticated]);

  useEffect(() => {
    if (isInitializing || !user?.isAuthenticated || initialPushHandledRef.current) return;
    initialPushHandledRef.current = true;
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response?.notification) return;
        const data = response.notification.request.content.data;
        navigateToChatFromPushData(data);
      })
      .catch(() => {});
  }, [isInitializing, user?.isAuthenticated, navigateToChatFromPushData]);

  useEffect(() => {
    if (isInitializing) return;
    console.log(
      '[NOX Boot]',
      'screen=',
      currentPage,
      'auth=',
      user?.isAuthenticated ? 'yes' : 'no',
    );
  }, [isInitializing, currentPage, user?.isAuthenticated]);

  // Afficher un loader pendant l'initialisation de l'authentification
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  
  const ScreenComponent = SCREENS[currentPage] || HomePage;
  const isCreateFeedPost = currentPage === 'createFeedPost';

  return (
    <>
      <Drawer
        ref={drawerRef}
        isOpen={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        showFloatingButton={
          !user?.isAuthenticated || shouldShowDrawerMenuButton(currentPage, !!user?.isAuthenticated)
        }
      >
        {isCreateFeedPost ? (
          <ErrorBoundary
            title="Erreur création de post"
            fallback={(err, reset) => (
              <View style={[styles.loadingContainer, { padding: 20 }]}>
                <Text style={{ color: Colors.primary, fontSize: 14, marginBottom: 12, textAlign: 'center' }}>
                  {err?.message || 'Erreur inconnue'}
                </Text>
                <TouchableOpacity
                  onPress={() => { reset(); goBack(); }}
                  style={{ backgroundColor: Colors.primary, padding: 12, borderRadius: 8 }}
                >
                  <Text style={{ color: '#fff' }}>Retour</Text>
                </TouchableOpacity>
              </View>
            )}
          >
            <ScreenComponent />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary
            key={currentPage}
            title="Erreur écran"
            context={`Écran: ${currentPage}`}
          >
            <ScreenComponent />
          </ErrorBoundary>
        )}
      </Drawer>
      <NoxRadialNav drawerOpen={drawerOpen} onOpenMenu={() => drawerRef.current?.open?.()} />
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
    backgroundColor: Colors.background,
  },
  /** Écran minimal avant montage de l’app : évite reload OTA pendant que React Navigation / auth tournent (crashes). */
  updateBootstrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});

export default function App() {
  const { fontsLoaded, fontsError } = useNoxFonts();
  const [updateBootstrapDone, setUpdateBootstrapDone] = useState(__DEV__);

  useEffect(() => {
    if (__DEV__) return undefined;

    let cancelled = false;
    const safetyMs = 25000;
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setUpdateBootstrapDone(true);
    }, safetyMs);

    (async () => {
      try {
        if (Updates.isEnabled) {
          const check = await Updates.checkForUpdateAsync();
          if (cancelled) return;
          if (check.isAvailable) {
            const fetched = await Updates.fetchUpdateAsync();
            if (cancelled) return;
            // Applique l'OTA MAINTENANT, dans la fenêtre de bootstrap : AppContent
            // (navigation + auth) n'est pas encore monté, donc pas de boucle de crash.
            // reloadAsync redémarre l'app sur le nouveau bundle ; le code après ne s'exécute pas.
            if (fetched?.isNew) {
              await Updates.reloadAsync();
              return;
            }
          }
        }
      } catch (e) {
        console.warn('[EASUpdate] bootstrap', e?.message || e);
      }
      clearTimeout(safetyTimer);
      if (!cancelled) setUpdateBootstrapDone(true);
    })();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, []);

  if (fontsError) {
    console.error('[NOX] Échec chargement polices Satoshi:', fontsError?.message || fontsError);
    return (
      <SafeAreaProvider>
        <View style={styles.updateBootstrap}>
          <Text style={{ color: Colors.primary, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
            Erreur polices (Satoshi)
          </Text>
          <Text style={{ color: Colors.textSecondary, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 }} selectable>
            {fontsError?.message || String(fontsError)}
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!updateBootstrapDone || !fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={styles.updateBootstrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

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

 