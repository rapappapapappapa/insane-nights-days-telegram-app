import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Image,
  Animated,
  Easing,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  getHomeScreenForProfile,
  getProfileScreenForProfile,
  isHomeScreenForProfile,
  isProfileScreenForProfile,
  LIEUX_SCREENS,
  RADIAL_NAV_HIDDEN_PAGES,
} from '../../utils/noxRoleNavigation';
import { getDiscoverScreen } from '../../utils/noxNavigation';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Spacing } from '../../constants/theme';

const NAV_SIZE = 48;
const NX_SIZE = 64;
/** Décalage NX au-dessus de la barre basse Lieux (Accueil / + / Profil). */
const LIEUX_BOTTOM_NAV_LIFT = 76;
/** Distance centre NX → icônes (plus grand = arc plus aéré). */
const ORBIT_RADIUS = 118;
/** Arc au-dessus du bouton NX (de gauche à droite). */
const ORBIT_ANGLES = [-152, -119, -86, -53, -20];

/**
 * Entrées de l'arc par rôle — l'agenda occupe toujours la position centrale
 * (TODO backlog : « agenda au centre, revoir la répartition »).
 * `screen: 'events'` résout par rôle via legacyScreenRedirects
 * (COMMUNITY → communityDiscover, VENUE → lieuxEvents, pro → EventsPage).
 */
const AGENDA_ITEM = {
  id: 'agenda',
  screen: 'events',
  icon: 'calendar-outline',
  labelFr: 'Agenda',
  labelEn: 'Agenda',
};

const COMMUNITY_ITEMS = [
  { id: 'home', screenKey: 'home', icon: 'home-outline', labelFr: 'Home', labelEn: 'Home' },
  { id: 'tickets', screen: 'tickets', icon: 'ticket-outline', labelFr: 'Tickets', labelEn: 'Tickets' },
  AGENDA_ITEM,
  { id: 'notifs', screen: 'notifications', icon: 'notifications-outline', labelFr: 'Notifs', labelEn: 'Notifs' },
  { id: 'profile', screenKey: 'profile', icon: 'person-outline', labelFr: 'Profil', labelEn: 'Profile' },
];

const VENUE_ITEMS = [
  { id: 'home', screenKey: 'home', icon: 'home-outline', labelFr: 'Accueil', labelEn: 'Home' },
  { id: 'demandes', screen: 'lieuxDemandes', icon: 'mail-unread-outline', labelFr: 'Demandes', labelEn: 'Requests' },
  AGENDA_ITEM,
  { id: 'notifs', screen: 'lieuxNotifications', icon: 'notifications-outline', labelFr: 'Notifs', labelEn: 'Notifs' },
  { id: 'profile', screenKey: 'profile', icon: 'person-outline', labelFr: 'Profil', labelEn: 'Profile' },
];

/** Raccourcis artistes / organisateurs (TODO backlog bouton central artistes). */
const PRO_ITEMS = [
  { id: 'home', screenKey: 'home', icon: 'home-outline', labelFr: 'Accueil', labelEn: 'Home' },
  { id: 'booking', screenKey: 'dashboard', icon: 'briefcase-outline', labelFr: 'Booking', labelEn: 'Booking' },
  AGENDA_ITEM,
  { id: 'social', screen: 'createFeedPost', icon: 'share-social-outline', labelFr: 'Publier', labelEn: 'Post' },
  { id: 'notifs', screen: 'notifications', icon: 'notifications-outline', labelFr: 'Notifs', labelEn: 'Notifs' },
];

const PRO_DASHBOARDS = {
  DJ: 'djDashboard',
  BOOKER: 'bookerDashboard',
  PRESTATAIRE: 'prestataireDashboard',
};

function getNavItemDefs(activeProfileType) {
  if (activeProfileType === 'VENUE') return VENUE_ITEMS;
  if (activeProfileType === 'DJ' || activeProfileType === 'BOOKER' || activeProfileType === 'PRESTATAIRE') {
    return PRO_ITEMS;
  }
  return COMMUNITY_ITEMS;
}

/** @deprecated Utiliser RADIAL_NAV_HIDDEN_PAGES depuis noxRoleNavigation.js */
export { RADIAL_NAV_HIDDEN_PAGES as HIDE_RADIAL_NAV_PAGES } from '../../utils/noxRoleNavigation';

function polarOffset(angleDeg, radius) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius,
  };
}

function buildOrbitMotion(menuAnim, angle) {
  const offset = polarOffset(angle, ORBIT_RADIUS);
  return {
    tx: menuAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, offset.x],
      extrapolate: 'clamp',
    }),
    ty: menuAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, offset.y],
      extrapolate: 'clamp',
    }),
    scale: menuAnim.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [0.3, 0.85, 1],
      extrapolate: 'clamp',
    }),
    opacity: menuAnim.interpolate({
      inputRange: [0, 0.35, 1],
      outputRange: [0, 0.5, 1],
      extrapolate: 'clamp',
    }),
  };
}

/**
 * Barre NX Figma — bouton central qui déploie les raccourcis en arc au-dessus.
 */
export default function NoxRadialNav({ onOpenMenu, drawerOpen = false }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { navigate, currentPage } = useNavigation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const homeScreen = getHomeScreenForProfile(user?.activeProfileType);
  const profileScreen = getProfileScreenForProfile(user?.activeProfileType);

  const navItems = useMemo(
    () =>
      getNavItemDefs(user?.activeProfileType).map((item, index) => ({
        ...item,
        angle: ORBIT_ANGLES[index],
        screen:
          item.screenKey === 'home'
            ? homeScreen
            : item.screenKey === 'profile'
              ? profileScreen
              : item.screenKey === 'dashboard'
                ? PRO_DASHBOARDS[user?.activeProfileType] || homeScreen
                : item.screenKey === 'discover'
                  ? getDiscoverScreen(user?.activeProfileType)
                  : item.screen,
      })),
    [homeScreen, profileScreen, user?.activeProfileType],
  );

  /** Pilote unique orbite + assombrissement (évite la désync open / visuel). */
  const menuAnim = useRef(new Animated.Value(0)).current;
  const nxRotateAnim = useRef(new Animated.Value(0)).current;

  const backdropOpacity = useMemo(
    () =>
      menuAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    [menuAnim],
  );

  const nxRotate = useMemo(
    () =>
      nxRotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '42deg'],
        extrapolate: 'clamp',
      }),
    [nxRotateAnim],
  );

  const orbitMotions = useMemo(
    () => navItems.map((item) => buildOrbitMotion(menuAnim, item.angle)),
    [navItems, menuAnim],
  );

  const bottom =
    Math.max(insets.bottom, Spacing.md) +
    Spacing.sm +
    (LIEUX_SCREENS.has(currentPage) ? LIEUX_BOTTOM_NAV_LIFT : 0);
  /** Zone libre en bas : le backdrop ne capture pas les taps sur NX / l’arc. */
  const navClusterClearance = bottom + ORBIT_RADIUS + NX_SIZE / 2 + 28;

  useEffect(() => {
    menuAnim.stopAnimation();
    nxRotateAnim.stopAnimation();

    const menuTransition = Animated.spring(menuAnim, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      friction: open ? 7 : 8,
      tension: open ? 90 : 130,
      overshootClamping: !open,
    });

    const rotateTransition = open
      ? Animated.spring(nxRotateAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
          tension: 85,
        })
      : Animated.timing(nxRotateAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });

    Animated.parallel([menuTransition, rotateTransition]).start();
  }, [open, menuAnim, nxRotateAnim]);

  // Referme la nav radiale quand le drawer s'ouvre (évite un état ouvert résiduel au retour).
  useEffect(() => {
    if (drawerOpen && open) setOpen(false);
  }, [drawerOpen, open]);

  // Masqué : non connecté, drawer ouvert, ou page sans nav flottante.
  const hidden =
    !user?.isAuthenticated || drawerOpen || RADIAL_NAV_HIDDEN_PAGES.has(currentPage);
  if (hidden) return null;

  const handleNxPress = () => {
    setOpen((prev) => !prev);
  };
  const close = () => setOpen(false);

  const navigateTo = (screen) => {
    close();
    if (currentPage !== screen) navigate(screen);
  };

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.backdrop, { opacity: backdropOpacity, zIndex: 9999 }]}
      />
      <Pressable
        pointerEvents={open ? 'auto' : 'none'}
        style={[styles.backdropTap, { bottom: navClusterClearance, zIndex: 10000 }]}
        onPress={close}
        accessibilityLabel={language === 'fr' ? 'Fermer le menu' : 'Close menu'}
      />

      <View pointerEvents="box-none" style={[styles.wrap, { bottom, zIndex: 10002 }]}>
        <View pointerEvents={open ? 'box-none' : 'none'} style={styles.orbitHost}>
          <View style={styles.anchor} pointerEvents="box-none">
            {navItems.map((item, index) => {
              const motion = orbitMotions[index];
              const active =
                currentPage === item.screen ||
                (item.id === 'home' &&
                  isHomeScreenForProfile(user?.activeProfileType, currentPage)) ||
                (item.id === 'profile' &&
                  isProfileScreenForProfile(user?.activeProfileType, currentPage));
              const label = language === 'fr' ? item.labelFr : item.labelEn;

              return (
                <Animated.View
                  key={item.id}
                  style={[
                    styles.orbitItem,
                    {
                      opacity: motion.opacity,
                      transform: [
                        { translateX: motion.tx },
                        { translateY: motion.ty },
                        { scale: motion.scale },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.orbitBtn, active && styles.orbitBtnActive]}
                    onPress={() => navigateTo(item.screen)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={active ? Colors.primary : Colors.text}
                    />
                  </TouchableOpacity>
                  <Text style={[styles.orbitLabel, active && styles.orbitLabelActive]}>
                    {label}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
        </View>

        <Pressable
          style={styles.nxButton}
          onPress={handleNxPress}
          onLongPress={onOpenMenu}
          delayLongPress={350}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Fermer le menu NOX' : 'Ouvrir le menu NOX'}
          accessibilityHint={
            language === 'fr' ? 'Appui long pour le menu latéral' : 'Long press for side menu'
          }
        >
          <Animated.View style={[styles.nxLogoWrap, { transform: [{ rotate: nxRotate }] }]}>
            <Image
              source={require('../../assets/noxlogo.png')}
              style={styles.nxLogo}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdropTap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    elevation: 16,
  },
  orbitHost: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  anchor: {
    width: NX_SIZE,
    height: NX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitItem: {
    position: 'absolute',
    alignItems: 'center',
    minWidth: NAV_SIZE + 20,
    top: (NX_SIZE - NAV_SIZE) / 2 - 6,
    left: (NX_SIZE - NAV_SIZE) / 2 - 10,
    zIndex: 1,
  },
  orbitBtn: {
    width: NAV_SIZE,
    height: NAV_SIZE,
    borderRadius: NAV_SIZE / 2,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 6 },
    }),
  },
  orbitBtnActive: {
    borderColor: primaryAlpha(0.55),
    backgroundColor: primaryAlpha(0.12),
  },
  orbitLabel: {
    marginTop: 4,
    fontSize: 9,
    fontFamily: FontFamily.medium,
    color: Colors.textTertiary,
    textAlign: 'center',
    maxWidth: 56,
  },
  orbitLabelActive: {
    color: Colors.primary,
  },
  nxButton: {
    width: NX_SIZE,
    height: NX_SIZE,
    borderRadius: NX_SIZE / 2,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 24,
    zIndex: 100,
  },
  nxLogoWrap: {
    width: NX_SIZE,
    height: NX_SIZE,
    borderRadius: NX_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nxLogo: {
    width: NX_SIZE,
    height: NX_SIZE,
  },
});
