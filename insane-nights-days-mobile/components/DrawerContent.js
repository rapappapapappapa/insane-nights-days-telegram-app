import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../contexts/ConfirmContext';
import { api } from '../api/config';
import Logo from './Logo';
import NotificationBadge from './NotificationBadge';
import * as Updates from 'expo-updates';

const menuItems = [
  {
    id: 'home',
    emoji: '📰',
    title: 'Feed',
    description: 'Retour au fil d\'actualité',
  },
  {
    id: 'login',
    emoji: '🔐',
    title: 'Connexion',
    description: 'Se connecter ou s\'inscrire',
    onlyWhenLoggedOut: true,
  },
  {
    id: 'events',
    emoji: '🎵',
    title: 'Événements',
    description: 'Découvrir les événements',
  },
  {
    id: 'djList',
    emoji: '🎧',
    title: 'Liste des DJs',
    description: 'Découvrir les DJs',
  },
  {
    // ✅ Route réelle: djRatings (Classement)
    id: 'djRatings',
    emoji: '🏅',
    title: 'Classement DJs',
    description: 'Consulter le top artistes',
  },
  {
    id: 'notifications',
    emoji: '🔔',
    title: 'Notifications',
    description: 'Likes & commentaires',
    onlyWhenLoggedIn: true,
  },
  {
    id: 'tickets',
    emoji: '🎟️',
    title: 'Mes Tickets',
    description: 'Gérer mes tickets',
    // On n'achète des tickets qu'en profil Communauté
    onlyForActiveProfileTypes: ['COMMUNITY'],
  },
  {
    id: 'purchases',
    emoji: '🧾',
    title: 'Mes Achats',
    description: 'Historique des paiements',
    onlyWhenLoggedIn: true,
    // Achats = tickets => uniquement Communauté
    onlyForActiveProfileTypes: ['COMMUNITY'],
  },
  {
    id: 'profile',
    emoji: '👤',
    title: 'Mes Profils',
    description: 'Modifier tes profils (DJ, Organisateur, Communauté...)',
    onlyWhenLoggedIn: true,
  },
  {
    id: 'communityFriends',
    emoji: '👥',
    title: 'Mes amis',
    description: 'Recherche et liste d\'amis Communauté',
    onlyWhenLoggedIn: true,
    onlyForActiveProfileTypes: ['COMMUNITY'],
  },
  {
    id: 'staffEvents',
    emoji: '📱',
    title: 'Scanner billets',
    description: 'Événements où tu es staff',
    onlyWhenLoggedIn: true,
    onlyForActiveProfileTypes: ['COMMUNITY'],
  },
  {
    id: 'bookerFriends',
    emoji: '👥',
    title: 'Mes amis',
    description: 'Amis Communauté pour staff événements',
    onlyWhenLoggedIn: true,
    onlyForActiveProfileTypes: ['BOOKER'],
  },
  {
    id: 'admin',
    emoji: '🛡️',
    title: 'Admin',
    description: 'Modération & utilisateurs',
    onlyWhenLoggedIn: true,
    onlyWhenAdmin: true,
  },
];

export default function DrawerContent({ navigation }) {
  const { navigate } = useNavigation();
  const { user, logout } = useAuth();
  const { unreadCount, unreadByProfileType } = useNotifications();
  const { showError, showSuccess } = useToast();
  const { showConfirm } = useConfirm();
  const insets = useSafeAreaInsets();

  const [activeDjGenre, setActiveDjGenre] = useState(null);

  const isLoggedIn = !!user?.isAuthenticated;
  const activeProfileType = user?.activeProfileType || null;
  const isAdmin = (user?.role || 'USER') === 'ADMIN';

  const showUpdateInfo = async () => {
    try {
      // Vérifier si expo-updates est disponible
      const isEnabled = Updates.isEnabled;
      const channel = Updates?.channel || 'no-channel';
      const runtimeVersion = Updates?.runtimeVersion || 'n/a';
      const updateId = Updates?.updateId || 'n/a';
      const isEmbedded = Updates?.isEmbeddedLaunch || false;
      
      const updateInfo = [
        `Updates activés: ${isEnabled ? '✅ Oui' : '❌ Non'}`,
        `Canal: ${channel}`,
        `Version runtime: ${runtimeVersion}`,
        `Update ID: ${updateId}`,
        `Embedded: ${isEmbedded ? 'oui' : 'non'}`,
        '',
        isEnabled 
          ? 'Les OTA updates sont activés. Cliquez sur "Vérifier" pour chercher des mises à jour.'
          : '⚠️ Les OTA updates ne sont PAS activés.\n\nL\'app doit être rebuildée avec EAS Build pour que les updates fonctionnent.',
      ].join('\n');

      showConfirm(
        'Informations Updates',
        updateInfo,
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'Vérifier',
            onPress: async () => {
              try {
                if (!isEnabled) {
                  showError('Les OTA updates ne sont pas activés. Rebuild l\'app avec EAS Build pour les activer.');
                  return;
                }
                const res = await Updates.checkForUpdateAsync();
                if (!res?.isAvailable) {
                  showSuccess('Aucune mise à jour disponible.');
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
          emoji: '🎧',
          title: 'Dashboard DJ',
          description: 'Messages, bookings, statut',
          showBadge: true,
          badgeCount: unreadByProfileType?.DJ ?? unreadCount,
        };
      case 'BOOKER':
        return {
          id: 'bookerDashboard',
          emoji: '📋',
          title: 'Dashboard Organisateur',
          description: 'Messages & événements',
          showBadge: true,
          badgeCount: unreadByProfileType?.BOOKER ?? unreadCount,
        };
      case 'VENUE':
        return {
          id: 'venueDashboard',
          emoji: '📍',
          title: 'Dashboard Lieu',
          description: 'Infos, médias, avis',
          showBadge: false,
          badgeCount: 0,
        };
      default:
        return null;
    }
  })();

  const itemsToRender = dashboardItem ? [dashboardItem, ...menuItems] : menuItems;

  const contentPaddingBottom = useMemo(() => 24 + (insets?.bottom || 0), [insets?.bottom]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Logo size={60} />
        </View>
        <Text style={styles.title}>Menu Principal</Text>
        <Text style={styles.subtitle}>Que voulez-vous faire ?</Text>

        {isLoggedIn && (
          <View style={styles.profilePill}>
            <Text style={styles.profilePillText}>
              Profil actif : {getProfileLabel(activeProfileType)}
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
          
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuItemPress(item.id, item.params)}
              activeOpacity={0.7}
            >
              <View style={styles.menuEmojiContainer}>
                <Text style={styles.menuEmoji}>{item.emoji}</Text>
                {item.showBadge && (item.badgeCount || 0) > 0 && <NotificationBadge count={item.badgeCount} />}
              </View>
              <View style={styles.menuItemText}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.legalLinks}>
        <TouchableOpacity onPress={() => handleMenuItemPress('legal', { type: 'cgu' })}>
          <Text style={styles.legalLinkText}>CGU</Text>
        </TouchableOpacity>
        <Text style={styles.legalSeparator}>•</Text>
        <TouchableOpacity onPress={() => handleMenuItemPress('legal', { type: 'cgv' })}>
          <Text style={styles.legalLinkText}>CGV</Text>
        </TouchableOpacity>
        <Text style={styles.legalSeparator}>•</Text>
        <TouchableOpacity onPress={() => handleMenuItemPress('legal', { type: 'mentions' })}>
          <Text style={styles.legalLinkText}>Mentions légales</Text>
        </TouchableOpacity>
        <Text style={styles.legalSeparator}>•</Text>
        <TouchableOpacity onPress={() => handleMenuItemPress('legal', { type: 'privacy' })}>
          <Text style={styles.legalLinkText}>Confidentialité</Text>
        </TouchableOpacity>
      </View>

      {isLoggedIn ? (
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.updateButton}
            activeOpacity={0.85}
            onPress={showUpdateInfo}
          >
            <Text style={styles.updateButtonText}>⬇️ Updates</Text>
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
          >
            <Text style={styles.logoutButtonText}>🚪 Déconnexion</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
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
    borderBottomColor: 'rgba(255,23,68,0.2)',
  },
  logoContainer: {
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
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
  menuEmoji: {
    fontSize: 28,
    textAlign: 'center',
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  menuDescription: {
    color: 'rgba(255,255,255,0.6)',
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
    borderColor: 'rgba(255,23,68,0.35)',
    backgroundColor: 'rgba(255,23,68,0.10)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#FF1744',
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
