import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import { useConfirm } from '../contexts/ConfirmContext';
import { api } from '../api/config';
import Logo from './Logo';
import NotificationBadge from './NotificationBadge';
import Colors from '../constants/colors';
import * as Updates from 'expo-updates';

/** Icônes Ionicons + libellés FR/EN (cohérence avec la langue de l’app). */
const MENU_DEF = [
  {
    id: 'home',
    icon: 'newspaper-outline',
    titleFr: 'Fil d’actualité',
    titleEn: 'Feed',
    descFr: 'Retour au fil d’actualité',
    descEn: 'Back to the news feed',
  },
  {
    id: 'login',
    icon: 'log-in-outline',
    titleFr: 'Connexion',
    titleEn: 'Sign in',
    descFr: 'Se connecter ou s’inscrire',
    descEn: 'Log in or register',
    onlyWhenLoggedOut: true,
  },
  {
    id: 'events',
    icon: 'calendar-outline',
    titleFr: 'Événements',
    titleEn: 'Events',
    descFr: 'Découvrir les événements',
    descEn: 'Discover events',
  },
  {
    id: 'djList',
    icon: 'musical-notes-outline',
    titleFr: 'Liste des DJs',
    titleEn: 'DJ list',
    descFr: 'Découvrir les DJs',
    descEn: 'Discover DJs',
  },
  {
    id: 'ranking',
    icon: 'trophy-outline',
    titleFr: 'Classement DJs',
    titleEn: 'DJ ranking',
    descFr: 'Consulter le top artistes',
    descEn: 'Top artists',
  },
  {
    id: 'notifications',
    icon: 'notifications-outline',
    titleFr: 'Notifications',
    titleEn: 'Notifications',
    descFr: 'J’aime et commentaires',
    descEn: 'Likes & comments',
    onlyWhenLoggedIn: true,
  },
  {
    id: 'tickets',
    icon: 'ticket-outline',
    titleFr: 'Mes billets',
    titleEn: 'My tickets',
    descFr: 'Gérer mes billets',
    descEn: 'Manage my tickets',
    onlyForActiveProfileTypes: ['COMMUNITY'],
  },
  {
    id: 'purchases',
    icon: 'receipt-outline',
    titleFr: 'Mes achats',
    titleEn: 'My purchases',
    descFr: 'Historique des paiements',
    descEn: 'Payment history',
    onlyWhenLoggedIn: true,
    onlyForActiveProfileTypes: ['COMMUNITY'],
  },
  {
    id: 'profile',
    icon: 'person-circle-outline',
    titleFr: 'Mes profils',
    titleEn: 'My profiles',
    descFr: 'DJ, organisateur, communauté…',
    descEn: 'DJ, booker, community…',
    onlyWhenLoggedIn: true,
  },
  {
    id: 'communityFriends',
    icon: 'people-outline',
    titleFr: 'Mes amis',
    titleEn: 'My friends',
    descFr: 'Amis communauté',
    descEn: 'Community friends',
    onlyWhenLoggedIn: true,
    onlyForActiveProfileTypes: ['COMMUNITY'],
  },
  {
    id: 'staffEvents',
    icon: 'qr-code-outline',
    titleFr: 'Scanner billets',
    titleEn: 'Scan tickets',
    descFr: 'Événements où tu es staff',
    descEn: 'Events where you are staff',
    onlyWhenLoggedIn: true,
    onlyForActiveProfileTypes: ['COMMUNITY'],
  },
  {
    id: 'bookerFriends',
    icon: 'people-outline',
    titleFr: 'Mes amis',
    titleEn: 'My friends',
    descFr: 'Communauté pour le staff événements',
    descEn: 'Community for event staff',
    onlyWhenLoggedIn: true,
    onlyForActiveProfileTypes: ['BOOKER'],
  },
  {
    id: 'admin',
    icon: 'shield-checkmark-outline',
    titleFr: 'Administration',
    titleEn: 'Admin',
    descFr: 'Modération et utilisateurs',
    descEn: 'Moderation & users',
    onlyWhenLoggedIn: true,
    onlyWhenAdmin: true,
  },
];

export default function DrawerContent({ navigation }) {
  const { language } = useLanguage();
  const { navigate } = useNavigation();
  const { user, logout } = useAuth();
  const { unreadCount, unreadByProfileType } = useNotifications();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();
  const insets = useSafeAreaInsets();

  const [activeDjGenre, setActiveDjGenre] = useState(null);

  const isLoggedIn = !!user?.isAuthenticated;
  const activeProfileType = user?.activeProfileType || null;
  const isAdmin = (user?.role || 'USER') === 'ADMIN';

  const showUpdateInfo = async () => {
    try {
      const isEnabled = Updates.isEnabled;
      const channel = Updates?.channel || 'no-channel';
      const runtimeVersion = Updates?.runtimeVersion || 'n/a';
      const updateId = Updates?.updateId || 'n/a';
      const isEmbedded = Updates?.isEmbeddedLaunch || false;

      const autoHintFr =
        'Au lancement, une mise à jour peut être téléchargée en arrière-plan. « Vérifier » l’applique tout de suite (redémarrage).';
      const autoHintEn =
        'On launch, an update may download in the background. “Check” applies it now (restarts the app).';

      const updateInfo = [
        `Updates activés: ${isEnabled ? '✅ Oui' : '❌ Non'}`,
        `Canal: ${channel}`,
        `Version runtime: ${runtimeVersion}`,
        `Update ID: ${updateId}`,
        `Embedded: ${isEmbedded ? 'oui' : 'non'}`,
        '',
        isEnabled
          ? language === 'fr'
            ? autoHintFr
            : autoHintEn
          : '⚠️ Les OTA updates ne sont PAS activés.\n\nL\'app doit être rebuildée avec EAS Build pour que les updates fonctionnent.',
      ].join('\n');

      showConfirm(
        language === 'fr' ? 'Informations mises à jour' : 'Update information',
        updateInfo,
        [
          { text: 'OK', style: 'cancel' },
          {
            text: language === 'fr' ? 'Vérifier' : 'Check',
            onPress: async () => {
              try {
                if (!isEnabled) {
                  showError(
                    language === 'fr'
                      ? 'Les OTA ne sont pas activés. Rebuild avec EAS Build pour les activer.'
                      : 'OTA is not enabled. Rebuild with EAS Build to enable it.'
                  );
                  return;
                }
                const res = await Updates.checkForUpdateAsync();
                if (!res?.isAvailable) {
                  showSuccess(language === 'fr' ? 'Aucune mise à jour disponible.' : 'No update available.');
                  return;
                }
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              } catch (e) {
                showError(String(e?.message || e));
              }
            },
          },
        ]
      );
    } catch (e) {
      showError(String(e?.message || e));
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadGenre = async () => {
      try {
        if (!isLoggedIn || !user?.token || activeProfileType !== 'DJ') {
          if (mounted) setActiveDjGenre(null);
          return;
        }
        const res = await api.getDjProfile(user.token);
        const genre = res?.dj?.genre || null;
        if (mounted) setActiveDjGenre(genre);
      } catch (e) {
        if (mounted) setActiveDjGenre(null);
      }
    };
    loadGenre();
    return () => {
      mounted = false;
    };
  }, [isLoggedIn, user?.token, activeProfileType]);

  const getProfileLabel = (type) => {
    switch (type) {
      case 'DJ':
        return 'DJ';
      case 'BOOKER':
        return 'Organisateur';
      case 'VENUE':
        return 'Lieu';
      case 'PRESTATAIRE':
        return language === 'fr' ? 'Prestataire' : 'Service provider';
      case 'COMMUNITY':
        return 'Communauté';
      default:
        return type || '—';
    }
  };

  const handleMenuItemPress = (itemId, params) => {
    navigation.closeDrawer(); // Fermer le drawer avant de naviguer
    navigate(itemId, params);
  };

  const dashboardItem = (() => {
    if (!isLoggedIn) return null;
    switch (activeProfileType) {
      case 'DJ':
        return {
          id: 'djDashboard',
          icon: 'headset-outline',
          titleFr: 'Tableau de bord DJ',
          titleEn: 'DJ dashboard',
          descFr: 'Messages, bookings, statut',
          descEn: 'Messages, bookings, status',
          showBadge: true,
          badgeCount: unreadByProfileType?.DJ ?? unreadCount,
        };
      case 'BOOKER':
        return {
          id: 'bookerDashboard',
          icon: 'clipboard-outline',
          titleFr: 'Tableau de bord organisateur',
          titleEn: 'Organizer dashboard',
          descFr: 'Messages et événements',
          descEn: 'Messages & events',
          showBadge: true,
          badgeCount: unreadByProfileType?.BOOKER ?? unreadCount,
        };
      case 'VENUE':
        return {
          id: 'venueDashboard',
          icon: 'location-outline',
          titleFr: 'Tableau de bord lieu',
          titleEn: 'Venue dashboard',
          descFr: 'Infos, médias, avis',
          descEn: 'Info, media, reviews',
          showBadge: false,
          badgeCount: 0,
        };
      case 'PRESTATAIRE':
        return {
          id: 'prestataireDashboard',
          icon: 'construct-outline',
          titleFr: 'Tableau de bord prestataire',
          titleEn: 'Service provider dashboard',
          descFr: 'Profil et missions (MVP)',
          descEn: 'Profile & jobs (MVP)',
          showBadge: false,
          badgeCount: 0,
        };
      default:
        return null;
    }
  })();

  const itemsToRender = dashboardItem ? [dashboardItem, ...MENU_DEF] : MENU_DEF;

  const menuLabel = (item) => (language === 'fr' ? item.titleFr : item.titleEn);
  const menuDesc = (item) => (language === 'fr' ? item.descFr : item.descEn);

  const contentPaddingBottom = useMemo(() => 24 + (insets?.bottom || 0), [insets?.bottom]);

  return (
    <>
      {toast?.visible ? (
        <Toast
          message={toast.message}
          type={toast.type || 'info'}
          visible
          onHide={hideToast}
        />
      ) : null}
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Logo size={60} />
        </View>
        <Text style={styles.title}>
          {language === 'fr' ? 'Menu principal' : 'Main menu'}
        </Text>
        <Text style={styles.subtitle}>
          {language === 'fr' ? 'Que souhaitez-vous faire ?' : 'What would you like to do?'}
        </Text>

        {isLoggedIn && (
          <View style={styles.profilePill}>
            <Text style={styles.profilePillText}>
              {language === 'fr' ? 'Profil actif :' : 'Active profile:'}{' '}
              {getProfileLabel(activeProfileType)}
            </Text>
          </View>
        )}

        {isLoggedIn && activeProfileType === 'DJ' && activeDjGenre ? (
          <View style={styles.genrePill}>
            <Text style={styles.genrePillText}>Style : {activeDjGenre}</Text>
          </View>
        ) : null}

        {isLoggedIn && ((unreadByProfileType?.DJ || 0) > 0 || (unreadByProfileType?.BOOKER || 0) > 0) ? (
          <View style={styles.unreadBreakdownRow}>
            {(unreadByProfileType?.DJ || 0) > 0 ? (
              <View style={styles.unreadChip}>
                <Text style={styles.unreadChipText}>DJ +{unreadByProfileType.DJ}</Text>
              </View>
            ) : null}
            {(unreadByProfileType?.BOOKER || 0) > 0 ? (
              <View style={styles.unreadChip}>
                <Text style={styles.unreadChipText}>Organisateur +{unreadByProfileType.BOOKER}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.menuList}>
        {itemsToRender.map(item => {
          // Filtrage simple basé sur l'état de connexion
          if (item.onlyWhenLoggedOut && isLoggedIn) return null;
          if (item.onlyWhenLoggedIn && !isLoggedIn) return null;
          if (item.onlyWhenAdmin && !isAdmin) return null;
          if (item.onlyForActiveProfileTypes && isLoggedIn) {
            const active = activeProfileType;
            if (!active || !item.onlyForActiveProfileTypes.includes(active)) return null;
          }
          
          const title = menuLabel(item);
          const description = menuDesc(item);
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuItemPress(item.id, item.params)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${title}. ${description}`}
            >
              <View style={styles.menuEmojiContainer}>
                <Ionicons name={item.icon} size={26} color={Colors.primary} />
                {item.showBadge && (item.badgeCount || 0) > 0 && <NotificationBadge count={item.badgeCount} />}
              </View>
              <View style={styles.menuItemText}>
                <Text style={styles.menuTitle}>{title}</Text>
                <Text style={styles.menuDescription}>{description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.legalLinks}>
        <TouchableOpacity
          onPress={() => handleMenuItemPress('legal', { type: 'cgu' })}
          accessibilityRole="button"
          accessibilityLabel="CGU"
        >
          <Text style={styles.legalLinkText}>CGU</Text>
        </TouchableOpacity>
        <Text style={styles.legalSeparator}>•</Text>
        <TouchableOpacity
          onPress={() => handleMenuItemPress('legal', { type: 'cgv' })}
          accessibilityRole="button"
          accessibilityLabel="CGV"
        >
          <Text style={styles.legalLinkText}>CGV</Text>
        </TouchableOpacity>
        <Text style={styles.legalSeparator}>•</Text>
        <TouchableOpacity
          onPress={() => handleMenuItemPress('legal', { type: 'mentions' })}
          accessibilityRole="button"
          accessibilityLabel={language === 'fr' ? 'Mentions légales' : 'Legal notice'}
        >
          <Text style={styles.legalLinkText}>
            {language === 'fr' ? 'Mentions légales' : 'Legal'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.legalSeparator}>•</Text>
        <TouchableOpacity
          onPress={() => handleMenuItemPress('legal', { type: 'privacy' })}
          accessibilityRole="button"
          accessibilityLabel={language === 'fr' ? 'Confidentialité' : 'Privacy'}
        >
          <Text style={styles.legalLinkText}>
            {language === 'fr' ? 'Confidentialité' : 'Privacy'}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoggedIn ? (
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.updateButton}
            activeOpacity={0.85}
            onPress={showUpdateInfo}
            accessibilityRole="button"
            accessibilityLabel={language === 'fr' ? 'Vérifier les mises à jour' : 'Check for updates'}
          >
            <Text style={styles.updateButtonText}>
              {language === 'fr' ? 'Mises à jour (OTA)' : 'Updates (OTA)'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.85}
            onPress={async () => {
              try {
                await logout();
              } finally {
                navigation.closeDrawer();
                navigate('home');
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={language === 'fr' ? 'Se déconnecter' : 'Log out'}
          >
            <Text style={styles.logoutButtonText}>
              {language === 'fr' ? 'Déconnexion' : 'Log out'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logoContainer: {
    marginBottom: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  profilePill: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 23, 68, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.28)',
  },
  profilePillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  genrePill: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  genrePillText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '800',
  },
  unreadBreakdownRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  unreadChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  unreadChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  menuList: {
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuEmojiContainer: {
    width: 40,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  menuItemText: {
    flex: 1,
  },
  menuTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  menuDescription: {
    color: Colors.textTertiary,
    fontSize: 13,
    lineHeight: 18,
  },
  logoutSection: {
    paddingTop: 18,
    paddingHorizontal: 20,
    gap: 10,
  },
  updateButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '900',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.35)',
    backgroundColor: 'rgba(77,163,255,0.10)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 4,
  },
  legalLinkText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
  },
  legalSeparator: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
});
