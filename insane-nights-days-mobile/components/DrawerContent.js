import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import Logo from './Logo';
import NotificationBadge from './NotificationBadge';

const menuItems = [
  {
    id: 'login',
    emoji: '🔐',
    title: 'Connexion',
    description: 'Se connecter à votre compte',
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
    id: 'accountType',
    emoji: '✨',
    title: 'Créer un compte',
    description: 'Inscription & progression',
    onlyWhenLoggedOut: true,
  },
  {
    id: 'profile',
    emoji: '👤',
    title: 'Mon Profil',
    description: 'Personnaliser mon profil',
    onlyWhenLoggedIn: true,
  },
  {
    id: 'switchProfile',
    emoji: '🔄',
    title: 'Changer de profil',
    description: 'Basculer entre tes profils',
    onlyWhenLoggedIn: true,
  },
];

export default function DrawerContent({ navigation }) {
  const { navigate } = useNavigation();
  const { user } = useAuth();
  const { unreadCount, unreadByProfileType } = useNotifications();

  const getProfileLabel = (type) => {
    switch (type) {
      case 'DJ':
        return 'DJ';
      case 'BOOKER':
        return 'Booker';
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
    if (!user?.isAuthenticated) return null;
    switch (user?.activeProfileType) {
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
          title: 'Dashboard Booker',
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Logo size={60} />
        </View>
        <Text style={styles.title}>Menu Principal</Text>
        <Text style={styles.subtitle}>Que voulez-vous faire ?</Text>

        {user?.isAuthenticated && (
          <View style={styles.profilePill}>
            <Text style={styles.profilePillText}>
              Profil actif : {getProfileLabel(user?.activeProfileType)}
            </Text>
          </View>
        )}

        {user?.isAuthenticated && ((unreadByProfileType?.DJ || 0) > 0 || (unreadByProfileType?.BOOKER || 0) > 0) ? (
          <View style={styles.unreadBreakdownRow}>
            {(unreadByProfileType?.DJ || 0) > 0 ? (
              <View style={styles.unreadChip}>
                <Text style={styles.unreadChipText}>DJ +{unreadByProfileType.DJ}</Text>
              </View>
            ) : null}
            {(unreadByProfileType?.BOOKER || 0) > 0 ? (
              <View style={styles.unreadChip}>
                <Text style={styles.unreadChipText}>Booker +{unreadByProfileType.BOOKER}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.menuList}>
        {itemsToRender.map(item => {
          // Filtrage simple basé sur l'état de connexion
          if (item.onlyWhenLoggedOut && user?.isAuthenticated) return null;
          if (item.onlyWhenLoggedIn && !user?.isAuthenticated) return null;
          if (item.onlyForActiveProfileTypes && user?.isAuthenticated) {
            const active = user?.activeProfileType || null;
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
});
