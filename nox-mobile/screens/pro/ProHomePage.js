import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { api } from '../../api/config';
import { NoxSearchBar, NoxTabs, NoxText, NoxCard } from '../../components/nox';
import CommunityFeedStream from '../../components/community/CommunityFeedStream';
import { useFeedNotifications } from '../../hooks/useFeedNotifications';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationBadge from '../../components/NotificationBadge';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { openDiscover } from '../../utils/noxNavigation';
import { styles } from './ProHomePage.styles';

export default function ProHomePage() {
  const { language } = useLanguage();
  const { user, updateUser, refreshCurrentUser } = useAuth();
  const { navigate, routeParams } = useNavigation();
  const { unreadCount: feedNotificationsCount, refreshUnreadCount: refreshFeedNotifications } = useFeedNotifications();
  const { unreadCount: chatUnreadCount, latest: chatLatest } = useNotifications();
  const { toast, showError, showSuccess, showInfo, hideToast } = useToast();
  
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [feedTab, setFeedTab] = useState('all'); // 'all' | 'following'

  useEffect(() => {
    if (user?.activeProfileType === 'DJ') {
      navigate('djDashboard', routeParams);
    }
  }, [user?.activeProfileType, navigate, routeParams]);

  useEffect(() => {
    if (user?.isAuthenticated && user?.token) {
      loadUserData();
    }
  }, [user?.isAuthenticated, user?.token]);

  const loadUserData = async () => {
    if (!user?.token) return;
    setLoadingUserData(true);
    try {
      const response = await api.getCurrentUser(user.token);
      if (response && response.success && response.user) {
        updateUser({
          activeProfileType: response.user.activeProfileType,
          score: response.user.score,
          level: response.user.level,
        });
      }
    } catch (error) {
      console.error('Erreur chargement données utilisateur:', error);
    } finally {
      setLoadingUserData(false);
    }
  };

  const openChatNotifications = async () => {
    if (!user?.isAuthenticated || !user?.token) return;

    // ✅ Si on a un "latest", aller directement là où il y a à lire
    if (chatLatest?.profileType === 'DJ' || chatLatest?.profileType === 'BOOKER') {
      const targetProfile = chatLatest.profileType;

      if (user?.activeProfileType && user.activeProfileType !== targetProfile) {
        try {
          const res = await api.switchProfile(user.token, targetProfile);
          if (res?.success) {
            await refreshCurrentUser();
          }
        } catch (e) {
          // best-effort
          console.warn('[ProHomePage] Auto switch profile failed:', e?.message ?? e);
        }
      }

      const params = {
        openBookings: true,
        openChatType: chatLatest.messageType ?? null,
        openChatEventDjId: chatLatest.eventDjId ?? null,
        openChatEventId: chatLatest.eventId ?? null,
        openChatPreview: chatLatest.preview ?? null,
        openChatEventTitle: chatLatest.eventTitle ?? null,
      };

      if (targetProfile === 'DJ') {
        navigate('djDashboard', params);
      } else {
        navigate('bookerDashboard', params);
      }
      return;
    }

    // Fallback: pas de détail, on ouvre le dashboard de ton profil actif
    if (user.activeProfileType === 'DJ') {
      navigate('djDashboard', { openBookings: true });
    } else if (user.activeProfileType === 'BOOKER') {
      navigate('bookerDashboard', { openBookings: true });
    } else {
      showInfo(language === 'fr' ? 'Aucun message non lu.' : 'No unread messages.');
    }
  };

  const openFeedNotifications = async () => {
    if (!user?.isAuthenticated || !user?.token) return;
    try {
      // ✅ Marquer comme lues (remet le compteur à 0) puis ouvrir l'écran dédié
      await api.markAllFeedNotificationsRead(user.token);
      await refreshFeedNotifications();
      navigate('notifications');
    } catch (e) {
      console.error('[ProHomePage] openFeedNotifications error:', e);
      // Même si l'UI échoue, tenter de remettre à jour le compteur
      refreshFeedNotifications();
      showError(language === 'fr' ? 'Impossible de charger les notifications.' : 'Unable to load notifications.');
    }
  };

  const displayName = (() => {
    const raw = user?.username || '';
    const base = raw.includes('@') ? raw.split('@')[0] : raw;
    if (!base) return language === 'fr' ? 'toi' : 'there';
    return base.charAt(0).toUpperCase() + base.slice(1);
  })();

  const proShortcuts = (() => {
    const fr = language === 'fr';
    switch (user?.activeProfileType) {
      case 'DJ':
        return [
          {
            id: 'dashboard',
            screen: 'djDashboard',
            icon: 'headset-outline',
            title: fr ? 'Dashboard DJ' : 'DJ dashboard',
            subtitle: fr ? 'Bookings, contrats, médias' : 'Bookings, contracts, media',
          },
          {
            id: 'discover',
            screen: null,
            icon: 'compass-outline',
            title: fr ? 'Découvrir' : 'Discover',
            subtitle: fr ? 'Events & artistes' : 'Events & artists',
            onPress: () => openDiscover(navigate, user?.activeProfileType),
          },
        ];
      case 'BOOKER':
        return [
          {
            id: 'dashboard',
            screen: 'bookerDashboard',
            icon: 'clipboard-outline',
            title: fr ? 'Dashboard orga' : 'Organizer dashboard',
            subtitle: fr ? 'Events, messages, profil' : 'Events, messages, profile',
          },
          {
            id: 'create',
            screen: 'bookerEventDashboard',
            icon: 'add-circle-outline',
            title: fr ? 'Créer un event' : 'Create event',
            subtitle: fr ? 'Wizard organisateur' : 'Organizer wizard',
          },
        ];
      case 'PRESTATAIRE':
        return [
          {
            id: 'dashboard',
            screen: 'prestataireDashboard',
            icon: 'construct-outline',
            title: fr ? 'Dashboard prestataire' : 'Provider dashboard',
            subtitle: fr ? 'Missions & contrats' : 'Jobs & contracts',
          },
        ];
      default:
        return [];
    }
  })();

  if (user?.activeProfileType === 'DJ') {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
      <View style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.feedContainer}>
          <View style={styles.screenHeader}>
            <View style={styles.headerRow}>
              <NoxText variant="title" style={styles.helloTitle}>
                {language === 'fr' ? `Hello ${displayName} !` : `Hello ${displayName}!`}
              </NoxText>
              <View style={styles.headerActions}>
                {user?.isAuthenticated && chatUnreadCount > 0 ? (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={openChatNotifications}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'fr' ? 'Messages' : 'Messages'}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.text} />
                    <NotificationBadge count={chatUnreadCount} />
                  </TouchableOpacity>
                ) : null}
                {feedNotificationsCount > 0 ? (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={openFeedNotifications}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'fr' ? 'Notifications' : 'Notifications'}
                  >
                    <Ionicons name="notifications-outline" size={22} color={Colors.text} />
                    <NotificationBadge count={feedNotificationsCount} />
                  </TouchableOpacity>
                ) : null}
                {(user?.activeProfileType === 'DJ' || user?.activeProfileType === 'BOOKER') ? (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => navigate('createFeedPost')}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'fr' ? 'Créer une publication' : 'Create post'}
                  >
                    <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <NoxSearchBar
              placeholder={language === 'fr' ? 'Ouvrir Découvrir…' : 'Open Discover…'}
              accessibilityLabel={
                language === 'fr' ? 'Ouvrir la page Découvrir pour chercher' : 'Open Discover to search'
              }
              onPress={() => openDiscover(navigate, user?.activeProfileType)}
              style={styles.searchBar}
            />

            {proShortcuts.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.shortcutsRow}
              >
                {proShortcuts.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.85}
                    onPress={
                      item.onPress ||
                      (item.screen ? () => navigate(item.screen) : undefined)
                    }
                  >
                    <NoxCard style={styles.shortcutCard}>
                      <Ionicons name={item.icon} size={22} color={Colors.primary} />
                      <NoxText variant="form" style={styles.shortcutTitle}>
                        {item.title}
                      </NoxText>
                      <NoxText variant="secondary" style={styles.shortcutSubtitle}>
                        {item.subtitle}
                      </NoxText>
                    </NoxCard>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <NoxTabs
            tabs={[
              {
                id: 'all',
                label: language === 'fr' ? 'Fil events' : 'Events feed',
                accessibilityLabel: language === 'fr' ? 'Fil événements' : 'Events feed',
              },
              {
                id: 'following',
                label: language === 'fr' ? 'Abonnements' : 'Following feed',
                accessibilityLabel: language === 'fr' ? 'Fil abonnements' : 'Following feed',
              },
            ]}
            activeId={feedTab}
            onChange={setFeedTab}
          />

          <CommunityFeedStream
            feedTab={feedTab}
            highlightPostId={routeParams?.highlightPostId}
            openCommentsOnHighlight={!!routeParams?.openComments}
          />
        </View>
      
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </View>
  );
}

