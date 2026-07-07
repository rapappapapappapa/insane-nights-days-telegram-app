import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/theme';

const NAV_SIZE = 48;
const NX_SIZE = 64;
/** Distance centre NX → icônes (plus grand = arc plus aéré). */
const ORBIT_RADIUS = 118;
/** Arc au-dessus du bouton NX (de gauche à droite). */
const ORBIT_ANGLES = [-152, -119, -86, -53, -20];

const NAV_ITEMS = [
  {
    id: 'discover',
    screen: 'events',
    icon: 'compass-outline',
    labelFr: 'Discover',
    labelEn: 'Discover',
  },
  {
    id: 'home',
    screen: 'welcome',
    icon: 'home-outline',
    labelFr: 'Home',
    labelEn: 'Home',
  },
  {
    id: 'tickets',
    screen: 'tickets',
    icon: 'ticket-outline',
    labelFr: 'Tickets',
    labelEn: 'Tickets',
  },
  {
    id: 'notifs',
    screen: 'notifications',
    icon: 'notifications-outline',
    labelFr: 'Notifs',
    labelEn: 'Notifs',
  },
  {
    id: 'profile',
    screen: 'profile',
    icon: 'person-outline',
    labelFr: 'Profil',
    labelEn: 'Profile',
  },
].map((item, index) => ({ ...item, angle: ORBIT_ANGLES[index] }));

/** Pages où la nav NX flottante est masquée (auth, wizards, dashboards…). */
export const HIDE_RADIAL_NAV_PAGES = new Set([
  'onboarding',
  'login',
  'accountType',
  'registerCommunity',
  'registerDj',
  'registerBooker',
  'registerVenue',
  'registerPrestataire',
  'home',
  'createFeedPost',
  'bookerEventDashboard',
  'djDashboard',
  'bookerDashboard',
  'venueDashboard',
  'prestataireDashboard',
  'admin',
  'scanTicket',
  'eventStaff',
  'selectDj',
  'selectVenue',
  'selectPrestataire',
  'switchProfile',
  'legal',
  'tutorial',
  'rateEvent',
  'purchaseSuccess',
]);

function polarOffset(angleDeg, radius) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius,
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

  const progress = useRef(new Animated.Value(0)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  const bottom = Math.max(insets.bottom, Spacing.md) + Spacing.sm;
  /** Zone libre en bas : le backdrop ne capture pas les taps sur NX / l’arc. */
  const navClusterClearance = bottom + ORBIT_RADIUS + NX_SIZE / 2 + 28;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(progress, {
        toValue: open ? 1 : 0,
        useNativeDriver: true,
        friction: 7,
        tension: 90,
      }),
      Animated.timing(backdrop, {
        toValue: open ? 1 : 0,
        duration: open ? 180 : 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, progress, backdrop]);

  // Referme la nav radiale quand le drawer s'ouvre (évite un état ouvert résiduel au retour).
  useEffect(() => {
    if (drawerOpen && open) setOpen(false);
  }, [drawerOpen, open]);

  // Masqué : non connecté, drawer ouvert, ou page sans nav flottante.
  const hidden =
    !user?.isAuthenticated || drawerOpen || HIDE_RADIAL_NAV_PAGES.has(currentPage);
  if (hidden) return null;

  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);

  const navigateTo = (screen) => {
    close();
    if (currentPage !== screen) navigate(screen);
  };

  const nxRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      {open ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[styles.backdrop, { opacity: backdrop, zIndex: 9999 }]}
          />
          <Pressable
            style={[styles.backdropTap, { bottom: navClusterClearance, zIndex: 10000 }]}
            onPress={close}
            accessibilityLabel={language === 'fr' ? 'Fermer le menu' : 'Close menu'}
          />
        </>
      ) : null}

      <View pointerEvents="box-none" style={[styles.wrap, { bottom, zIndex: 10002 }]}>
        <View style={styles.anchor}>
          {NAV_ITEMS.map((item) => {
            const offset = polarOffset(item.angle, ORBIT_RADIUS);
            const tx = progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, offset.x],
            });
            const ty = progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, offset.y],
            });
            const scale = progress.interpolate({
              inputRange: [0, 0.6, 1],
              outputRange: [0.3, 0.85, 1],
            });
            const opacity = progress.interpolate({
              inputRange: [0, 0.35, 1],
              outputRange: [0, 0.5, 1],
            });
            const active = currentPage === item.screen;
            const label = language === 'fr' ? item.labelFr : item.labelEn;

            return (
              <Animated.View
                key={item.id}
                style={[
                  styles.orbitItem,
                  {
                    opacity,
                    transform: [{ translateX: tx }, { translateY: ty }, { scale }],
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
                <Text style={[styles.orbitLabel, active && styles.orbitLabelActive]}>{label}</Text>
              </Animated.View>
            );
          })}

          <Pressable
            style={styles.nxButton}
            onPress={toggle}
            onLongPress={onOpenMenu}
            delayLongPress={350}
            accessibilityRole="button"
            accessibilityLabel={open ? 'Fermer le menu NX' : 'Ouvrir le menu NX'}
            accessibilityHint={
              language === 'fr' ? 'Appui long pour le menu latéral' : 'Long press for side menu'
            }
          >
            <Animated.Text style={[styles.nxLabel, { transform: [{ rotate: nxRotate }] }]}>
              NX
            </Animated.Text>
          </Pressable>
        </View>
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
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: Colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    zIndex: 2,
  },
  nxLabel: {
    fontFamily: FontFamily.black,
    fontSize: 20,
    color: '#000',
    letterSpacing: 0.5,
  },
});
