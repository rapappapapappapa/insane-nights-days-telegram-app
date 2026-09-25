/**
 * Page Amis Organisateur - Liste des amis Communauté, recherche, envoi de demandes
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { Layout, Radius, Spacing } from '../../constants/theme';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { NoxText, NoxScreenHeader, NoxSearchBar } from '../../components/nox';

export default function BookerFriendsPage() {
  const { language } = useLanguage();
  const { goBack } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(null);

  const fr = language === 'fr';

  const fetchFriends = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await api.getBookerFriends(user.token);
      if (res?.success && res.friends) setFriends(res.friends);
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur chargement' : 'Load error'));
    }
  }, [user?.token, fr, showError]);

  useEffect(() => {
    if (user?.token) {
      setLoading(true);
      fetchFriends().finally(() => setLoading(false));
    }
  }, [user?.token, fetchFriends]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFriends();
    setRefreshing(false);
  };

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      if (q.length > 0) showError(fr ? 'Saisis au moins 2 caractères.' : 'Enter at least 2 characters.');
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await api.searchCommunities(user.token, q);
      if (res?.success && res.results) setSearchResults(res.results);
      else setSearchResults([]);
    } catch (e) {
      showError(e?.message || 'Erreur');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, user?.token, fr, showError]);

  const handleAddFriend = async (communityId) => {
    if (!user?.token || sendingRequest) return;
    setSendingRequest(communityId);
    try {
      const res = await api.addBookerFriend(user.token, communityId);
      if (res?.success) {
        showSuccess(fr ? 'Demande envoyée.' : 'Request sent.');
        setSearchResults((prev) => prev.filter((r) => r.id !== communityId));
      } else {
        showError(res?.message || (fr ? 'Erreur' : 'Error'));
      }
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur' : 'Error'));
    } finally {
      setSendingRequest(null);
    }
  };

  const isAlreadyFriend = (communityId) => friends.some((f) => f.communityId === communityId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <NoxScreenHeader
        title={fr ? 'Mes amis' : 'My friends'}
        subtitle={fr ? 'Staff pour tes événements' : 'Staff for your events'}
        onBack={goBack}
      />

      <NoxText variant="secondary" style={styles.subtitle}>
        {fr
          ? 'Ajoute des profils Communauté comme amis pour les assigner comme staff sur tes événements.'
          : 'Add Community profiles as friends to assign them as staff on your events.'}
      </NoxText>

      <View style={styles.searchRow}>
        <NoxSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={fr ? 'Rechercher par pseudo…' : 'Search by pseudo…'}
          style={styles.searchBar}
        />
        <TouchableOpacity
          style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
          onPress={handleSearch}
          disabled={searching}
          accessibilityRole="button"
          accessibilityLabel={fr ? 'Rechercher' : 'Search'}
        >
          {searching ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <Ionicons name="search" size={20} color={Colors.text} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : (
          <>
            {hasSearched ? (
              <View style={styles.section}>
                <NoxText variant="form" style={styles.sectionTitle}>
                  {fr ? 'Résultats' : 'Results'}
                </NoxText>
                {searchResults.length === 0 ? (
                  <NoxText variant="secondary" style={styles.emptyText}>
                    {fr ? 'Aucun résultat' : 'No results'}
                  </NoxText>
                ) : (
                  searchResults.map((r) => {
                    const isFriend = isAlreadyFriend(r.id);
                    return (
                      <View key={r.id} style={styles.friendRow}>
                        <Image
                          source={{ uri: normalizeMediaUrl(r.profileImage) || 'https://via.placeholder.com/48' }}
                          style={styles.avatar}
                        />
                        <NoxText variant="form" style={styles.pseudo}>{r.pseudo}</NoxText>
                        {isFriend ? (
                          <NoxText style={styles.badge}>{fr ? 'Ami' : 'Friend'}</NoxText>
                        ) : (
                          <TouchableOpacity
                            style={[styles.addBtn, sendingRequest === r.id && styles.addBtnDisabled]}
                            onPress={() => handleAddFriend(r.id)}
                            disabled={sendingRequest === r.id}
                          >
                            {sendingRequest === r.id ? (
                              <ActivityIndicator size="small" color={Colors.text} />
                            ) : (
                              <Ionicons name="add" size={22} color={Colors.text} />
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            ) : null}

            <View style={styles.section}>
              <NoxText variant="form" style={styles.sectionTitle}>
                {fr ? 'Mes amis' : 'My friends'} ({friends.length})
              </NoxText>
              {friends.length === 0 ? (
                <NoxText variant="secondary" style={styles.emptyText}>
                  {fr
                    ? "Aucun ami pour l'instant. Recherche des profils Communauté."
                    : 'No friends yet. Search for Community profiles.'}
                </NoxText>
              ) : (
                friends.map((f) => (
                  <View key={f.id} style={styles.friendRow}>
                    <Image
                      source={{ uri: normalizeMediaUrl(f.profileImage) || 'https://via.placeholder.com/48' }}
                      style={styles.avatar}
                    />
                    <NoxText variant="form" style={styles.pseudo}>{f.pseudo}</NoxText>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  subtitle: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPaddingHorizontal,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  searchBar: { flex: 1 },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: { opacity: 0.6 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxxl },
  loader: { marginTop: Spacing.xxxl },
  section: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Spacing.md,
    backgroundColor: Colors.backgroundElevated,
  },
  pseudo: { flex: 1 },
  addBtn: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.6 },
  badge: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: { fontSize: 14 },
});
