import React, { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import ProfileWallStream from '../../components/community/ProfileWallStream';
import { NoxScreenHeader, NoxText, NoxButton } from '../../components/nox';
import Colors from '../../constants/colors';
import { Layout, Spacing } from '../../constants/theme';

/**
 * Mur du profil actif (DJ / Orga / Lieu) — publier + voir réponses sans fil communauté.
 */
export default function OwnWallPage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { goBack, navigate, routeParams } = useNavigation();
  const { user } = useAuth();
  const [wallFilter, setWallFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const highlightPostId = routeParams?.highlightPostId || null;
  const openComments = !!routeParams?.openComments;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.token) {
        setLoading(false);
        setError(fr ? 'Connexion requise.' : 'Login required.');
        return;
      }
      const type = user.activeProfileType;
      if (!['DJ', 'BOOKER', 'VENUE'].includes(type)) {
        setLoading(false);
        setError(
          fr
            ? 'Passe sur un profil Artiste, Organisateur ou Lieu pour gérer tes publications.'
            : 'Switch to an Artist, Organizer or Venue profile to manage your posts.'
        );
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (type === 'DJ') {
          const res = await api.getDjProfile(user.token);
          if (cancelled) return;
          if (res?.success && res.dj?.id) {
            setWallFilter({ djId: res.dj.id });
          } else {
            setError(fr ? 'Profil artiste introuvable.' : 'Artist profile not found.');
          }
        } else if (type === 'BOOKER') {
          const res = await api.getBookerProfile(user.token);
          if (cancelled) return;
          const id = res?.booker?.id || res?.profile?.id;
          if (res?.success && id) {
            setWallFilter({ bookerId: id });
          } else {
            setError(fr ? 'Profil organisateur introuvable.' : 'Organizer profile not found.');
          }
        } else if (type === 'VENUE') {
          const res = await api.getVenueProfile(user.token);
          if (cancelled) return;
          const venueId = res?.venue?.id || res?.venues?.[0]?.id || null;
          if (res?.success && venueId) {
            setWallFilter({ venueId });
          } else {
            setError(fr ? 'Profil lieu introuvable.' : 'Venue profile not found.');
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || (fr ? 'Erreur de chargement.' : 'Load error.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.token, user?.activeProfileType, fr]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <NoxScreenHeader
        title={fr ? 'Mes publications' : 'My posts'}
        subtitle={
          fr
            ? 'Tes posts et les réponses — sans le fil communauté'
            : 'Your posts and replies — not the community feed'
        }
        onBack={goBack}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <NoxText variant="secondary" style={styles.errorText}>
            {error}
          </NoxText>
          <NoxButton
            label={fr ? 'Publier' : 'Post'}
            onPress={() => navigate('createFeedPost')}
            style={styles.btn}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ProfileWallStream
            wallFilter={wallFilter}
            isOwnProfile
            enabled={!!wallFilter}
            highlightPostId={highlightPostId}
            openCommentsOnHighlight={openComments}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.xxxl * 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  errorText: { textAlign: 'center' },
  btn: { minWidth: 160 },
});
