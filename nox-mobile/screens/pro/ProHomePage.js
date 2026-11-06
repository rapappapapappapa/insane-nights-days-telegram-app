import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Colors from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { getHomeScreenForProfile } from '../../utils/noxRoleNavigation';
import { styles } from './ProHomePage.styles';

/**
 * Ancien « Fil pro » — redirige vers le hub du profil actif.
 * Le fil social (CommunityFeedStream) est réservé au profil COMMUNITY.
 */
export default function ProHomePage() {
  const { user } = useAuth();
  const { navigate, routeParams } = useNavigation();

  useEffect(() => {
    const target = getHomeScreenForProfile(user?.activeProfileType);
    navigate(target === 'proHome' ? 'splash' : target, routeParams);
  }, [user?.activeProfileType, navigate, routeParams]);

  return (
    <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <StatusBar style="light" />
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
