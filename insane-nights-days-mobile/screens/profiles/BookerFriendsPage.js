/**
 * Page Amis Organisateur - Liste des amis Communauté, recherche, envoi de demandes
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';

export default function BookerFriendsPage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { goBack, navigate } = useNavigation();
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#FF1744" />
        </TouchableOpacity>
        <Text style={styles.title}>{fr ? 'Mes amis' : 'My friends'}</Text>
        <View style={styles.headerRight} />
      </View>

      <Text style={styles.subtitle}>
        {fr ? 'Ajoute des profils Communauté comme amis pour les assigner comme staff sur tes événements.' : 'Add Community profiles as friends to assign them as staff on your events.'}
      </Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={fr ? 'Rechercher par pseudo...' : 'Search by pseudo...'}
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
          {searching ? <ActivityIndicator size="small" color="#FF1744" /> : <Ionicons name="search" size={22} color="#FF1744" />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF1744" />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#FF1744" style={styles.loader} />
        ) : (
          <>
            {hasSearched && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{fr ? 'Résultats' : 'Results'}</Text>
                {searchResults.length === 0 ? (
                  <Text style={styles.emptyText}>{fr ? 'Aucun résultat' : 'No results'}</Text>
                ) : (
                  searchResults.map((r) => {
                    const isFriend = isAlreadyFriend(r.id);
                    return (
                      <View key={r.id} style={styles.friendRow}>
                        <Image source={{ uri: normalizeMediaUrl(r.profileImage) || 'https://via.placeholder.com/48' }} style={styles.avatar} />
                        <Text style={styles.pseudo}>{r.pseudo}</Text>
                        {isFriend ? (
                          <Text style={styles.badge}>{fr ? 'Ami' : 'Friend'}</Text>
                        ) : (
                          <TouchableOpacity
                            style={[styles.addBtn, sendingRequest === r.id && styles.addBtnDisabled]}
                            onPress={() => handleAddFriend(r.id)}
                            disabled={sendingRequest === r.id}
                          >
                            {sendingRequest === r.id ? (
                              <ActivityIndicator size="small" color="#0b0b0e" />
                            ) : (
                              <Text style={styles.addBtnText}>+</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{fr ? 'Mes amis' : 'My friends'} ({friends.length})</Text>
              {friends.length === 0 ? (
                <Text style={styles.emptyText}>{fr ? 'Aucun ami pour l\'instant. Recherche des profils Communauté.' : 'No friends yet. Search for Community profiles.'}</Text>
              ) : (
                friends.map((f) => (
                  <View key={f.id} style={styles.friendRow}>
                    <Image source={{ uri: normalizeMediaUrl(f.profileImage) || 'https://via.placeholder.com/48' }} style={styles.avatar} />
                    <Text style={styles.pseudo}>{f.pseudo}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0e' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 8 },
  title: { flex: 1, color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  headerRight: { width: 40 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, paddingHorizontal: 20, marginBottom: 16 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  searchBtn: { marginLeft: 12, justifyContent: 'center', paddingHorizontal: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  loader: { marginTop: 40 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { color: '#FF1744', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  friendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 14 },
  pseudo: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  addBtn: { backgroundColor: '#FF1744', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#0b0b0e', fontSize: 20, fontWeight: '800' },
  badge: { color: '#10b981', fontSize: 13, fontWeight: '600' },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
});
