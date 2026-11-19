import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NoxText from './NoxText';
import Colors from '../../constants/colors';
import { Spacing } from '../../constants/theme';

/**
 * Barre de navigation basse NOX (design LIEUX) : Accueil / bouton central + / Profil.
 * `active` = 'home' | 'profile' | null (aucun onglet surligné). `onHome`, `onProfile`, `onCreate` = callbacks.
 */
export default function NoxBottomNav({ active = 'home', onHome, onProfile, onCreate }) {
  const homeActive = active === 'home';
  const profileActive = active === 'profile';
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
      <View style={styles.bar}>
        <TouchableOpacity style={styles.tab} onPress={onHome} activeOpacity={0.8}>
          <Ionicons
            name={homeActive ? 'home' : 'home-outline'}
            size={22}
            color={homeActive ? Colors.primary : Colors.textTertiary}
          />
          <NoxText
            variant="secondary"
            style={[styles.label, homeActive && styles.labelActive]}
          >
            Accueil
          </NoxText>
        </TouchableOpacity>

        <View style={styles.centerSlot} />

        <TouchableOpacity style={styles.tab} onPress={onProfile} activeOpacity={0.8}>
          <Ionicons
            name={profileActive ? 'person' : 'person-outline'}
            size={22}
            color={profileActive ? Colors.primary : Colors.textTertiary}
          />
          <NoxText
            variant="secondary"
            style={[styles.label, profileActive && styles.labelActive]}
          >
            Profil
          </NoxText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.fab} onPress={onCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

const BAR_HEIGHT = 64;
const FAB_SIZE = 58;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: BAR_HEIGHT,
    width: '100%',
    borderRadius: 22,
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.xxl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 10 },
    }),
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    gap: 2,
  },
  centerSlot: {
    width: FAB_SIZE,
  },
  label: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  labelActive: {
    color: Colors.primary,
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    top: -FAB_SIZE / 2 + 8,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
    shadowColor: Colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
});
