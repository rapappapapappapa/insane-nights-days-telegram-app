/**
 * Page Amis Communauté
 * Recherche, liste d'amis, demandes reçues
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

export default function CommunityFriendsPage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { goBack } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(null);
  const [respondingRequest, setRespondingRequest] = useState(null);
  const [removingFriend, setRemovingFriend] = useState(null);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests'

  const fetchData = useCallback(async () => {
    if (!user?.token) return;
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        api.getCommunityFriends(user.token),
        api.getCommunityFriendRequests(user.token),
      ]);
      if (friendsRes?.success && friendsRes.friends) setFriends(friendsRes.friends);
      if (requestsRes?.success && requestsRes.requests) setRequests(requestsRes.requests);
    } catch (e) {
      showError(e?.message || (language === 'fr' ? 'Erreur chargement' : 'Load error'));
    }
  }, [user?.token, language, showError]);

  useEffect(() => {
    if (user?.token) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }
  }, [user?.token, fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.searchCommunities(user.token, q);
      if (res?.success && res.results) {
        setSearchResults(res.results);
      }
    } catch (e) {
      showError(e?.message || 'Erreur');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (communityId) => {
    if (!user?.token) return;
    setSendingRequest(communityId);
    try {
      await api.sendCommunityFriendRequest(user.token, communityId);
      showSuccess(language === 'fr' ? 'Demande envoyée' : 'Request sent');
      setSearchResults((prev) => prev.filter((r) => r.id !== communityId));
    } catch (e) {
      showError(e?.message || 'Erreur');
    } finally {
      setSendingRequest(null);
    }
  };

  const handleRespondRequest = async (requestId, action) => {
    if (!user?.token) return;
    setRespondingRequest(requestId);
    try {
      await api.respondToCommunityFriendRequest(user.token, requestId, action);
      showSuccess(action === 'accept' ? (language === 'fr' ? 'Demande acceptée' : 'Accepted') : (language === 'fr' ? 'Demande refusée' : 'Declined'));
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (action === 'accept') await fetchData();
    } catch (e) {
      showError(e?.message || 'Erreur');
    } finally {
      setRespondingRequest(null);
    }
  };

  const handleRemoveFriend = async (friendshipId) => {
    if (!user?.token) return;
    setRemovingFriend(friendshipId);
    try {
      await api.removeCommunityFriend(user.token, friendshipId);
      showSuccess(language === 'fr' ? 'Ami retiré' : 'Friend removed');
      setFriends((prev) => prev.filter((f) => f.id !== friendshipId));
    } catch (e) {
      showError(e?.message || 'Erreur');
    } finally {
      setRemovingFriend(null);
    }
  };

  const fr = language === 'fr';

  if (!user?.token) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.errorText}>{fr ? 'Connecte-toi pour accéder aux amis.' : 'Log in to access friends.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <TouchableOpacity style={[styles.backBtn, { top: insets.top + 10 }]} onPress={goBack}>
        <Text style={styles.backBtnText}>← {fr ? 'Retour' : 'Back'}</Text>
      </TouchableOpacity>

      <View style={[styles.header, { paddingTop: insets.top + 50 }]}>
        <Text style={styles.title}>{fr ? 'Mes amis' : 'My friends'}</Text>
        <Text style={styles.subtitle}>{fr ? 'Recherche et gère tes amis Communauté' : 'Search and manage your Community friends'}</Text>
      </View>

      {/* Recherche */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={fr ? 'Rechercher par pseudo...' : 'Search by pseudo...'}
          placeholderTextColor="rgba(255,255,255,0.4)"
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching || searchQuery.trim().length < 2}>
          {searching ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="search" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {searchResults.length > 0 && (
        <View style={styles.searchResults}>
          <Text style={styles.sectionTitle}>{fr ? 'Résultats' : 'Results'}</Text>
          {searchResults.map((r) => (
            <View key={r.id} style={styles.resultRow}>
              {r.profileImage ? (
                <Image source={{ uri: normalizeMediaUrl(r.profileImage) }} style={styles.avatarSmall} />
              ) : (
                <View style={[styles.avatarSmall, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{r.pseudo?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
              )}
              <Text style={styles.resultPseudo}>{r.pseudo}</Text>
              <TouchableOpacity
                style={[styles.addBtn, sendingRequest === r.id && styles.addBtnDisabled]}
                onPress={() => handleSendRequest(r.id)}
                disabled={sendingRequest === r.id}
              >
                {sendingRequest === r.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addBtnText}>+</Text>}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'friends' && styles.tabActive]} onPress={() => setActiveTab('friends')}>
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>{fr ? 'Amis' : 'Friends'}</Text>
          {friends.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{friends.length}</Text></View>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'requests' && styles.tabActive]} onPress={() => setActiveTab('requests')}>
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>{fr ? 'Demandes' : 'Requests'}</Text>
          {requests.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{requests.length}</Text></View>}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF1744" />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#FF1744" style={styles.loader} />
        ) : activeTab === 'friends' ? (
          friends.length === 0 ? (
            <Text style={styles.emptyText}>{fr ? 'Aucun ami pour le moment.' : 'No friends yet.'}</Text>
          ) : (
            friends.map((f) => (
              <View key={f.id} style={styles.friendRow}>
                {f.profileImage ? (
                  <Image source={{ uri: normalizeMediaUrl(f.profileImage) }} style={styles.avatarSmall} />
                ) : (
                  <View style={[styles.avatarSmall, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>{f.pseudo?.charAt(0)?.toUpperCase() || '?'}</Text>
                  </View>
                )}
                <Text style={styles.friendPseudo}>{f.pseudo}</Text>
                <TouchableOpacity
                  style={[styles.removeBtn, removingFriend === f.id && styles.removeBtnDisabled]}
                  onPress={() => handleRemoveFriend(f.id)}
                  disabled={removingFriend === f.id}
                >
                  {removingFriend === f.id ? <ActivityIndicator size="small" color="#FF1744" /> : <Ionicons name="person-remove" size={20} color="#FF1744" />}
                </TouchableOpacity>
              </View>
            ))
          )
        ) : (
          requests.length === 0 ? (
            <Text style={styles.emptyText}>{fr ? 'Aucune demande en attente.' : 'No pending requests.'}</Text>
          ) : (
            requests.map((r) => (
              <View key={r.id} style={styles.requestRow}>
                {r.profileImage ? (
                  <Image source={{ uri: normalizeMediaUrl(r.profileImage) }} style={styles.avatarSmall} />
                ) : (
                  <View style={[styles.avatarSmall, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>{r.pseudo?.charAt(0)?.toUpperCase() || '?'}</Text>
                  </View>
                )}
                <Text style={styles.requestPseudo}>{r.pseudo}</Text>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.acceptBtn, respondingRequest === r.id && styles.btnDisabled]}
                    onPress={() => handleRespondRequest(r.id, 'accept')}
                    disabled={respondingRequest === r.id}
                  >
                    {respondingRequest === r.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.acceptBtnText}>✓</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.declineBtn, respondingRequest === r.id && styles.btnDisabled]}
                    onPress={() => handleRespondRequest(r.id, 'decline')}
                    disabled={respondingRequest === r.id}
                  >
                    <Text style={styles.declineBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {toast.visible && <Toast message={toast.message} type={toast.type} onHide={hideToast} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0e' },
  backBtn: { position: 'absolute', left: 16, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8 },
  backBtnText: { color: '#fff', fontSize: 16 },
  header: { alignItems: 'center', paddingBottom: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 8 },
  searchInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 16 },
  searchBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#FF1744', alignItems: 'center', justifyContent: 'center' },
  searchResults: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#141419', borderRadius: 12, marginBottom: 8, gap: 12 },
  resultPseudo: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', gap: 6 },
  tabActive: { backgroundColor: 'rgba(255,23,68,0.3)', borderWidth: 1, borderColor: '#FF1744' },
  tabText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: '#FF1744', fontWeight: '700' },
  badge: { backgroundColor: '#FF1744', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loader: { marginTop: 40 },
  emptyText: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 40, fontSize: 16 },
  friendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#141419', borderRadius: 12, marginBottom: 8, gap: 12 },
  friendPseudo: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  requestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#141419', borderRadius: 12, marginBottom: 8, gap: 12 },
  requestPseudo: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  requestActions: { flexDirection: 'row', gap: 8 },
  avatarSmall: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { backgroundColor: 'rgba(255,23,68,0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 18, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF1744', alignItems: 'center', justifyContent: 'center' },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  removeBtn: { padding: 8 },
  removeBtnDisabled: { opacity: 0.6 },
  acceptBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  declineBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  declineBtnText: { color: '#fff', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
  errorText: { color: '#fff', textAlign: 'center', marginTop: 60, fontSize: 16 },
});
