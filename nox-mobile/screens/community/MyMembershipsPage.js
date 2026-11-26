import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Radius, Spacing } from '../../constants/theme';
import { NoxButton, NoxScreenHeader, NoxText } from '../../components/nox';

/** Adhésions du profil Communauté aux collectifs (actives puis expirées). */
export default function MyMembershipsPage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { goBack, navigate } = useNavigation();
  const { user } = useAuth();

  const [memberships, setMemberships] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.token) return;
    setError(null);
    try {
      const res = await api.getMyCollectifMemberships(user.token);
      const rows = Array.isArray(res?.memberships) ? res.memberships : [];
      rows.sort((a, b) => (a.status === 'ACTIVE' ? 0 : 1) - (b.status === 'ACTIVE' ? 0 : 1));
      setMemberships(rows);
    } catch (e) {
      setError(e?.message || (fr ? 'Chargement impossible.' : 'Could not load.'));
      setMemberships([]);
    }
  }, [user?.token, fr]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString(fr ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  const renderMembership = (m) => {
    const active = m.status === 'ACTIVE';
    const image = m.profileImage ? normalizeMediaUrl(m.profileImage) : null;
    return (
      <TouchableOpacity
        key={m.id}
        style={[styles.row, !active && styles.rowExpired]}
        activeOpacity={0.85}
        onPress={() => navigate('bookerProfile', { bookerId: m.bookerId })}
      >
        <View style={styles.avatar}>
          {image ? (
            <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} />
          ) : (
            <Ionicons name="people" size={20} color={Colors.primaryLight} />
          )}
        </View>
        <View style={styles.rowText}>
          <NoxText style={styles.name} numberOfLines={1}>
            {m.collectifName}
          </NoxText>
          <NoxText style={[styles.meta, active && styles.metaActive]}>
            {active
              ? m.validUntil
                ? fr
                  ? `Membre jusqu’au ${formatDate(m.validUntil)}`
                  : `Member until ${formatDate(m.validUntil)}`
                : fr
                  ? 'Membre'
                  : 'Member'
              : m.validUntil
                ? fr
                  ? `Expirée le ${formatDate(m.validUntil)} · renouveler depuis le profil`
                  : `Expired on ${formatDate(m.validUntil)} · renew from the profile`
                : fr
                  ? 'Expirée'
                  : 'Expired'}
          </NoxText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <NoxScreenHeader
        title={fr ? 'Mes adhésions' : 'My memberships'}
        subtitle={fr ? 'Collectifs' : 'Collectives'}
        onBack={goBack}
      />
      {memberships === null ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {error ? <NoxText style={styles.error}>{error}</NoxText> : null}
          {memberships.length === 0 && !error ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color={primaryAlpha(0.7)} />
              <NoxText variant="secondary" style={styles.emptyText}>
                {fr
                  ? 'Tu n’es membre d’aucun collectif pour le moment. Rejoins-en un depuis son profil.'
                  : 'You are not a member of any collective yet. Join one from its profile.'}
              </NoxText>
              <NoxButton
                label={fr ? 'Découvrir les collectifs' : 'Discover collectives'}
                variant="secondary"
                onPress={() => navigate('communityDiscover', { tab: 'collectifs' })}
                fullWidth={false}
              />
            </View>
          ) : (
            memberships.map(renderMembership)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Layout.screenPaddingHorizontal, paddingBottom: 140, gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundCard,
  },
  rowExpired: { opacity: 0.6 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: primaryAlpha(0.15),
  },
  rowText: { flex: 1, gap: 2 },
  name: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.text },
  meta: { fontSize: 13, color: Colors.textTertiary },
  metaActive: { color: Colors.primaryLight },
  error: { color: Colors.warning, textAlign: 'center', marginVertical: Spacing.md },
  empty: { alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xxl, paddingHorizontal: Spacing.lg },
  emptyText: { textAlign: 'center' },
});
