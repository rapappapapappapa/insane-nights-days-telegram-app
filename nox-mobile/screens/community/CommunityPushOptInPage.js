import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { NoxText, NoxButton } from '../../components/nox';
import { getExpoPushTokenForRegistration } from '../../hooks/useExpoPushRegistration';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import { setPushOptInStatus } from '../../utils/communityPushOptInStorage';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';

export default function CommunityPushOptInPage() {
  const { goBack } = useNavigation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const fr = language === 'fr';
  const [loading, setLoading] = useState(false);

  const dismiss = async (status) => {
    await setPushOptInStatus(status);
    goBack();
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      const token = await getExpoPushTokenForRegistration();
      if (token && user?.token) {
        await api.registerExpoPushToken(user.token, token, Platform.OS);
      }
      await setPushOptInStatus('granted');
      goBack();
    } catch {
      await setPushOptInStatus('dismissed');
      goBack();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.xxxl }]}>
      <StatusBar style="light" />

      <View style={styles.iconWrap}>
        <Ionicons name="notifications-outline" size={40} color={Colors.primary} />
      </View>

      <NoxText variant="title" style={styles.title}>
        {fr ? 'Obtenez des notifications' : 'Get notifications'}
      </NoxText>
      <NoxText variant="secondary" style={styles.subtitle}>
        {fr
          ? 'Sois alerté des nouveaux événements, des réponses à tes commentaires et des demandes d’amis.'
          : 'Get alerts for new events, comment replies, and friend requests.'}
      </NoxText>

      <View style={styles.actions}>
        <NoxButton label={fr ? 'Activer' : 'Enable'} onPress={handleEnable} loading={loading} />
        <NoxButton
          label={fr ? 'Peut-être plus tard' : 'Maybe later'}
          variant="secondary"
          onPress={() => dismiss('dismissed')}
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: primaryAlpha(0.15),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  title: { textAlign: 'center', marginBottom: Spacing.md },
  subtitle: { textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xxxl },
  actions: { alignSelf: 'stretch', gap: Spacing.md },
});
