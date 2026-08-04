import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import Colors from '../constants/colors';
import { resolveNavigationTarget } from '../utils/legacyScreenRedirects';

/**
 * Écran placeholder : redirige immédiatement vers la cible NOX (Phase D).
 * @param {string} [legacyKey] — clé legacy à résoudre (`home`, `feed`, `welcome`, …)
 * @param {string} [target] — cible fixe si pas de résolution contextuelle
 */
export default function LegacyScreenRedirect({ legacyKey, target, params }) {
  const { navigate, routeParams } = useNavigation();
  const { user } = useAuth();

  useEffect(() => {
    const context = {
      activeProfileType: user?.activeProfileType,
      isAuthenticated: !!user?.isAuthenticated,
    };

    if (target) {
      navigate(target, params ?? routeParams);
      return;
    }

    const key = legacyKey || 'home';
    const { page, params: resolvedParams } = resolveNavigationTarget(
      key,
      params ?? routeParams,
      context,
    );
    navigate(page, resolvedParams);
  }, [legacyKey, target, params, routeParams, navigate, user?.activeProfileType, user?.isAuthenticated]);

  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
