import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  PanResponder,
  Text,
} from 'react-native';
import DrawerContent from './DrawerContent';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85; // 85% de la largeur de l'écran
const EDGE_SWIPE_WIDTH = 24; // zone à gauche pour ouvrir par swipe
const FLOATING_BTN_SIZE = 56;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function Drawer({
  isOpen,
  onClose,
  onOpen,
  children,
  enableEdgeSwipe = true,
  showFloatingButton = true,
  floatingButtonLabel = 'MENU',
}) {
  const insets = useSafeAreaInsets();
  // ✅ Mode non contrôlé si isOpen n'est pas fourni
  const [internalOpen, setInternalOpen] = useState(false);
  const open = typeof isOpen === 'boolean' ? isOpen : internalOpen;

  const requestOpen = () => {
    if (typeof isOpen === 'boolean') onOpen?.();
    else setInternalOpen(true);
  };

  const requestClose = () => {
    if (typeof isOpen === 'boolean') onClose?.();
    else setInternalOpen(false);
  };

  const slideAnim = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(!!open);
  const gestureActiveRef = React.useRef(false);
  const gestureStartXRef = React.useRef(-DRAWER_WIDTH);
  const gestureModeRef = React.useRef(null); // 'opening' | 'closing' | null

  useEffect(() => {
    if (gestureActiveRef.current) return;
    if (open) {
      setShouldRender(true);
      // Animation d'ouverture
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animation de fermeture
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setShouldRender(false);
      });
    }
  }, [open]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => {
          if (!enableEdgeSwipe) return false;
          if (Math.abs(g.dy) > 20) return false;

          // Si ouvert: swipe gauche pour fermer
          if (open) return g.dx < -10;

          // Si fermé: swipe depuis le bord gauche pour ouvrir
          const startedFromLeftEdge = g.x0 <= EDGE_SWIPE_WIDTH;
          return startedFromLeftEdge && g.dx > 10;
        },
        onPanResponderGrant: () => {
          gestureActiveRef.current = true;
          gestureModeRef.current = open ? 'closing' : 'opening';
          if (!shouldRender) setShouldRender(true);

          slideAnim.stopAnimation((v) => {
            gestureStartXRef.current = typeof v === 'number' ? v : (open ? 0 : -DRAWER_WIDTH);
          });
          overlayOpacity.stopAnimation();
        },
        onPanResponderMove: (_, g) => {
          const nextX = clamp(gestureStartXRef.current + g.dx, -DRAWER_WIDTH, 0);
          slideAnim.setValue(nextX);
          const progress = 1 - Math.abs(nextX) / DRAWER_WIDTH; // 0..1
          overlayOpacity.setValue(progress);
        },
        onPanResponderRelease: (_, g) => {
          if (!enableEdgeSwipe) return;

          gestureActiveRef.current = false;

          const draggedX = clamp(gestureStartXRef.current + g.dx, -DRAWER_WIDTH, 0);
          const progress = 1 - Math.abs(draggedX) / DRAWER_WIDTH; // 0..1
          const shouldOpen =
            (gestureModeRef.current === 'opening' && (progress > 0.35 || g.vx > 0.35)) ||
            (gestureModeRef.current === 'closing' && !(progress < 0.65 || g.vx < -0.35));

          gestureModeRef.current = null;

          Animated.parallel([
            Animated.spring(slideAnim, {
              toValue: shouldOpen ? 0 : -DRAWER_WIDTH,
              useNativeDriver: true,
              tension: 70,
              friction: 12,
              velocity: g.vx,
            }),
            Animated.timing(overlayOpacity, {
              toValue: shouldOpen ? 1 : 0,
              duration: 180,
              useNativeDriver: true,
            }),
          ]).start(({ finished }) => {
            if (!finished) return;
            if (shouldOpen) requestOpen();
            else requestClose();
            if (!shouldOpen) setShouldRender(false);
          });
        },
        onPanResponderTerminate: () => {
          gestureActiveRef.current = false;
          gestureModeRef.current = null;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enableEdgeSwipe, open, isOpen, onClose, onOpen, shouldRender]
  );

  return (
    <View style={styles.container}>
      {/* Contenu principal */}
      {children}

      {/* Zone de swipe (toujours au-dessus du contenu) */}
      {enableEdgeSwipe && !open && (
        <View
          style={styles.edgeSwipeArea}
          pointerEvents="box-only"
          {...panResponder.panHandlers}
        />
      )}

      {/* ✅ Bouton menu fixe en bas (toujours visible) */}
      {showFloatingButton && !open && (
        <TouchableOpacity
          style={[styles.floatingButton, { bottom: 22 + (insets?.bottom ?? 0) }]}
          onPress={requestOpen}
          activeOpacity={0.85}
        >
          <Text style={styles.floatingButtonIcon}>≡</Text>
          <Text style={styles.floatingButtonLabel}>{floatingButtonLabel}</Text>
        </TouchableOpacity>
      )}

      {/* Overlay et Drawer */}
      {shouldRender && (
        <>
          {/* Overlay sombre */}
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={requestClose}
          >
            <Animated.View
              style={[
                styles.overlayBackground,
                {
                  opacity: overlayOpacity,
                },
              ]}
              pointerEvents="none"
            />
          </TouchableOpacity>

          {/* Drawer */}
          <Animated.View
            style={[
              styles.drawer,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
            {...(enableEdgeSwipe ? panResponder.panHandlers : {})}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={requestClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <DrawerContent navigation={{ closeDrawer: requestClose }} />
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  floatingButton: {
    position: 'absolute',
    left: 16,
    bottom: 22,
    width: FLOATING_BTN_SIZE,
    height: FLOATING_BTN_SIZE,
    borderRadius: FLOATING_BTN_SIZE / 2,
    backgroundColor: 'rgba(255, 23, 68, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  floatingButtonIcon: {
    color: '#0b0b0e',
    fontSize: 22,
    fontWeight: '900',
    marginTop: -2,
  },
  floatingButtonLabel: {
    position: 'absolute',
    bottom: -16,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  edgeSwipeArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE_SWIPE_WIDTH,
    zIndex: 9999,
    backgroundColor: 'transparent',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#0f0f14',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,23,68,0.18)',
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 23, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.22)',
    zIndex: 10002,
    elevation: 8,
  },
  closeButtonText: {
    color: '#FF1744',
    fontSize: 18,
    fontWeight: '900',
  },
});
