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
import { getProDashboardScreen, isProfileScreenForProfile } from '../utils/noxRoleNavigation';
import { getDiscoverScreen } from '../utils/noxNavigation';
import Colors, { primaryAlpha } from '../constants/colors';
import * as Updates from 'expo-updates';

/** Icônes Ionicons + libellés FR/EN (cohérence avec la langue de l’app). */
const MENU_DEF = [
  {
    id: 'communityHome',
    group: 'role',
    icon: 'home-outline',
    titleFr: 'Accueil',
    titleEn: 'Home',
    descFr: 'Fil communauté',
    descEn: 'Community home',
    onlyWhenLoggedIn: true,
    onlyForActiveProfileTypes: ['COMMUNITY'],
  },
  {
    id: 'login',
    group: 'role',
    icon: 'log-in-outline',
    titleFr: 'Connexion',
    titleEn: 'Sign in',
    descFr: 'Se connecter ou s’inscrire',
    descEn: 'Log in or register',
    onlyWhenLoggedOut: true,
  },
  {
    id: 'profile',
    group: 'role',
    icon: 'person-circle-outline',
    titleFr: 'Profil',
    titleEn: 'Profile',
    descFr: 'Compte, mot de passe, rôles',
    descEn: 'Account, password, roles',
    onlyWhenLoggedIn: true,
  },
  {
    id: 'tickets',
    group: 'work',
    icon: 'ticket-outline',
    titleFr: 'Billets',
    titleEn: 'Tickets',
    descFr: 'Gérer mes billets',
    descEn: 'Manage my tickets',
    onlyWhenLoggedIn: true,
    onlyForActiveProfileTypes: ['COMMUNITY'],
  },
  {
    id: 'purchases',
    group: 'work',
    icon: 'receipt-outline',
    titleFr: 'Achats',
    titleEn: 'Purchases',
    descFr: 'Historique des paiements',
    descEn: 'Payment history',
    onlyWhenLoggedIn: true,
    onlyForActiveProfileTypes: ['COMMUNITY'],
  },
  {
    id: 'communityFriends',
    group: 'work',
    icon: 'people-outline',
    titleFr: 'Amis',
    titleEn: 'Friends',
    descFr: 'Amis communauté',
    descEn: 'Community friends',
    onlyWhenLoggedIn: true,
    onlyForActiveProfileTypes: ['COMMUNITY'],
  },
  {
    id: 'staffEvents',
    group: 'work',
    icon: 'qr-code-outline',
    titleFr: 'Scanner',
    titleEn: 'Scan',
    descFr: 'Événements où tu es staff',
    descEn: 'Events where you are staff',
    onlyWhenLoggedIn: true,
    onlyForActiveProfileTypes: ['COMMUNITY'],
  },
  {
    id: 'bookerFriends',
    group: 'work',
    icon: 'people-outline',
    titleFr: 'Staff',
    titleEn: 'Staff',
    descFr: 'Communauté pour le staff événements',
    descEn: 'Community for event staff',
    onlyWhenLoggedIn: true,
    onlyForActiveProfileTypes: ['BOOKER'],
  },
  {
    id: 'discover',
    group: 'discover',
    icon: 'calendar-outline',
    titleFr: 'Agenda',
    titleEn: 'Agenda',
    descFr: 'Découvrir les événements',
    descEn: 'Discover events',
    resolveDiscover: true,
  },
  {
    id: 'djList',
    group: 'discover',
    icon: 'musical-notes-outline',
    titleFr: 'DJs',
    titleEn: 'DJs',
    descFr: 'Découvrir les artistes',
    descEn: 'Discover DJs',
  },
  {
    id: 'ranking',
    group: 'discover',
    icon: 'trophy-outline',
    titleFr: 'Classement',
    titleEn: 'Ranking',
    descFr: 'Top artistes',
    descEn: 'Top artists',
  },
  {
    id: 'notifications',
    group: 'more',
    icon: 'notifications-outline',
    titleFr: 'Notifications',
    titleEn: 'Notifications',
    descFr: 'J’aime et commentaires',
    descEn: 'Likes & comments',
    onlyWhenLoggedIn: true,
  },
  {
    id: 'tutorial',
    group: 'more',
    icon: 'help-circle-outline',
    titleFr: 'Guide',
    titleEn: 'Guide',
    descFr: 'Découvrir l’application',
    descEn: 'Learn how the app works',
    onlyWhenLoggedIn: true,
  },
  {
    id: 'admin',
    group: 'more',
    icon: 'shield-checkmark-outline',
    titleFr: 'Administration',
    titleEn: 'Admin',
    descFr: 'Modération et utilisateurs',
    descEn: 'Moderation & users',
    onlyWhenLoggedIn: true,
    onlyWhenAdmin: true,
  },
];

const DRAWER_GROUPS = [
  { id: 'role', titleFr: 'Mon rôle', titleEn: 'My role' },
  { id: 'work', titleFr: 'Outils', titleEn: 'Tools' },
  { id: 'discover', titleFr: 'Découvrir', titleEn: 'Discover' },
  { id: 'more', titleFr: 'Plus', titleEn: 'More' },
];

export default function DrawerContent({ navigation }) {
  const { language } = useLanguage();
  const { navigate, currentPage } = useNavigation();
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
        'Au lancement, une mise à jour disponible est téléchargée puis appliquée automatiquement (l’app redémarre). « Vérifier » force le téléchargement et redémarre l’app tout de suite.';
      const autoHintEn =
        'On launch, an available update is downloaded and applied automatically (the app restarts). “Check” forces the download and restarts the app right away.';

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
                  const reason = res?.reason ? `\nRaison: ${res.reason}` : '';
                  showSuccess(
                    (language === 'fr'
                      ? `Aucune MAJ sur le serveur.\nUpdate actuel: ${Updates.updateId || 'n/a'}\nEmbedded: ${Updates.isEmbeddedLaunch ? 'oui' : 'non'}`
                      : `No update on server.\nCurrent update: ${Updates.updateId || 'n/a'}\nEmbedded: ${Updates.isEmbeddedLaunch ? 'yes' : 'no'}`
                    ) + reason
                  );
                  return;
                }
                await Updates.fetchUpdateAsync();
                showSuccess(
                  language === 'fr'
                    ? 'Mise à jour téléchargée. Redémarrage de l’app…'
                    : 'Update downloaded. Restarting the app…'
                );
                // Applique la MAJ tout de suite (déclenché par l'utilisateur).
                // Si le nouveau bundle plantait, expo-updates fait un rollback automatique.
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
    navigation.closeDrawer();
    if (itemId === 'discover') {
      navigate(getDiscoverScreen(activeProfileType), params);
      return;
    }
    navigate(itemId, params);
  };

  const dashboardItem = (() => {
    if (!isLoggedIn) return null;
    const dashboardId = getProDashboardScreen(activeProfileType);
    if (!dashboardId) return null;
    switch (activeProfileType) {
      case 'DJ':
        return {
          id: dashboardId,
          group: 'role',
          icon: 'home-outline',
          titleFr: 'Accueil',
          titleEn: 'Home',
          descFr: 'Hub DJ & outils',
          descEn: 'DJ hub & tools',
          showBadge: true,
          badgeCount: unreadByProfileType?.DJ ?? unreadCount,
        };
      case 'BOOKER':
        return {
          id: dashboardId,
          group: 'role',
          icon: 'home-outline',
          titleFr: 'Accueil',
          titleEn: 'Home',
          descFr: 'Hub organisateur & outils',
          descEn: 'Organizer hub & tools',
          showBadge: true,
          badgeCount: unreadByProfileType?.BOOKER ?? unreadCount,
        };
      case 'VENUE':
        return {
          id: dashboardId,
          group: 'role',
          icon: 'home-outline',
          titleFr: 'Accueil',
          titleEn: 'Home',
          descFr: 'Hub lieu & outils',
          descEn: 'Venue hub & tools',
          showBadge: false,
          badgeCount: 0,
        };
      case 'PRESTATAIRE':
        return {
          id: dashboardId,
          group: 'role',
          icon: 'home-outline',
          titleFr: 'Accueil',
          titleEn: 'Home',
          descFr: 'Hub prestataire & outils',
          descEn: 'Provider hub & tools',
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
  const isItemActive = (item) => {
    if (item.resolveDiscover) return currentPage === getDiscoverScreen(activeProfileType);
    if (item.id === 'profile') return isProfileScreenForProfile(activeProfileType, currentPage);
    return currentPage === item.id;
  };

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
          <TouchableOpacity
            style={styles.profilePill}
            activeOpacity={0.8}
            onPress={() => handleMenuItemPress('switchProfile')}
            accessibilityRole="button"
            accessibilityLabel={language === 'fr' ? 'Changer de rôle' : 'Switch role'}
          >
            <Text style={styles.profilePillText}>
              {language === 'fr' ? 'Profil actif :' : 'Active profile:'}{' '}
              {getProfileLabel(activeProfileType)}
            </Text>
            <Text style={styles.profilePillHint}>
              {language === 'fr' ? 'Changer de rôle' : 'Switch role'}
            </Text>
          </TouchableOpacity>
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
        {DRAWER_GROUPS.map((group) => {
          const groupItems = itemsToRender.filter((item) => {
            if ((item.group || 'more') !== group.id) return false;
            if (item.onlyWhenLoggedOut && isLoggedIn) return false;
            if (item.onlyWhenLoggedIn && !isLoggedIn) return false;
            if (item.onlyWhenAdmin && !isAdmin) return false;
            if (item.onlyForActiveProfileTypes && isLoggedIn) {
              const active = activeProfileType;
              if (!active || !item.onlyForActiveProfileTypes.includes(active)) return false;
            }
            return true;
          });
          if (groupItems.length === 0) return null;
          const groupTitle = language === 'fr' ? group.titleFr : group.titleEn;
          return (
            <View key={group.id}>
              <Text style={styles.groupTitle}>{groupTitle}</Text>
              {groupItems.map((item) => {
                const title = menuLabel(item);
                const description = menuDesc(item);
                const active = isItemActive(item);
                const iconName = active && item.icon.endsWith('-outline')
                  ? item.icon.replace(/-outline$/, '')
                  : item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.menuItem, active && styles.menuItemActive]}
                    onPress={() => handleMenuItemPress(item.id, item.params)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${title}. ${description}`}
                  >
                    <View style={[styles.menuEmojiContainer, active && styles.menuEmojiContainerActive]}>
                      <Ionicons name={iconName} size={22} color={active ? Colors.text : Colors.primaryLight} />
                      {item.showBadge && (item.badgeCount || 0) > 0 && <NotificationBadge count={item.badgeCount} />}
                    </View>
                    <View style={styles.menuItemText}>
                      <Text style={[styles.menuTitle, active && styles.menuTitleActive]}>{title}</Text>
                      <Text style={styles.menuDescription} numberOfLines={1}>{description}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={active ? Colors.primaryLight : 'rgba(254,254,253,0.28)'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
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
                navigate('onboarding');
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
    textAlign: 'center',
  },
  profilePillHint: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
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
    paddingTop: 8,
  },
  groupTitle: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: 'rgba(254,254,253,0.08)',
  },
  menuItemActive: {
    backgroundColor: primaryAlpha(0.16),
    borderColor: primaryAlpha(0.55),
  },
  menuEmojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: primaryAlpha(0.14),
  },
  menuEmojiContainerActive: {
    backgroundColor: Colors.primary,
  },
  menuItemText: {
    flex: 1,
  },
  menuTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  menuTitleActive: {
    color: Colors.text,
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
