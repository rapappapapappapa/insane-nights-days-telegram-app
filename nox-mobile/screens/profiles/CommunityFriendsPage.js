/**
 * Page Amis Communauté
 * Recherche par pseudo (unique), demande d'ajout, liste d'amis, demandes reçues
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
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';
import { openEventPreview } from '../../utils/noxNavigation';

export default function CommunityFriendsPage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(null);
  const [respondingRequest, setRespondingRequest] = useState(null);
  const [removingFriend, setRemovingFriend] = useState(null);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests' | 'eventInvites' | 'bookerRequests'
  const [eventInvites, setEventInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [respondingInvite, setRespondingInvite] = useState(null);
  const [bookerRequests, setBookerRequests] = useState([]);
  const [respondingBookerRequest, setRespondingBookerRequest] = useState(null);

  const fr = language === 'fr';

  const fetchData = useCallback(async () => {
    if (!user?.token) return;
    try {
      setLoadingInvites(true);
      const [friendsRes, requestsRes, invitesRes, bookerRequestsRes] = await Promise.all([
        api.getCommunityFriends(user.token),
        api.getCommunityFriendRequests(user.token),
        api.getEventGroupInvitations(user.token),
        api.getBookerFriendRequests(user.token),
      ]);
      if (friendsRes?.success && friendsRes.friends) setFriends(friendsRes.friends);
      if (requestsRes?.success && requestsRes.requests) setRequests(requestsRes.requests);
      if (invitesRes?.success && invitesRes.invitations) setEventInvites(invitesRes.invitations);
      if (bookerRequestsRes?.success && bookerRequestsRes.requests) setBookerRequests(bookerRequestsRes.requests);
    } catch (e) {
      showError(e?.message || (language === 'fr' ? 'Erreur chargement' : 'Load error'));
    } finally {
      setLoadingInvites(false);
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

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      if (q.length > 0) {
        showError(fr ? 'Saisis au moins 2 caractères pour rechercher.' : 'Enter at least 2 characters to search.');
      }
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await api.searchCommunities(user.token, q);
      if (res?.success && res.results) {
        setSearchResults(res.results);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      showError(e?.message || 'Erreur');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, user?.token, fr, showError]);

  // Recherche automatique après saisie (debounce 500ms)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setHasSearched(false);
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      setHasSearched(true);
      try {
        const res = await api.searchCommunities(user.token, q);
        if (res?.success && res.results) {
          setSearchResults(res.results);
        } else {
          setSearchResults([]);
        }
      } catch (e) {
        showError(e?.message || 'Erreur');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery, user?.token, showError]);

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

  const handleRespondEventInvite = async (inviteId, groupId, action) => {
    if (!user?.token) return;
    setRespondingInvite(inviteId);
    try {
      await api.respondToEventGroupInvitation(user.token, groupId, action);
      showSuccess(action === 'join' ? (fr ? 'Tu as rejoint le groupe !' : 'You joined the group!') : (fr ? 'Invitation refusée' : 'Invitation declined'));
      setEventInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (e) {
      showError(e?.message || 'Erreur');
    } finally {
      setRespondingInvite(null);
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

      {/* Ajouter un ami - Recherche par pseudo */}
      <View style={styles.addFriendSection}>
        <Text style={styles.addFriendTitle}>{fr ? 'Ajouter un ami' : 'Add a friend'}</Text>
        <Text style={styles.addFriendHint}>{fr ? 'Recherche par pseudo (unique)' : 'Search by pseudo (unique)'}</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={fr ? 'Pseudo de ton ami...' : 'Your friend\'s pseudo...'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={[styles.searchBtn, (searching || searchQuery.trim().length < 2) && styles.searchBtnDisabled]} onPress={handleSearch} disabled={searching || searchQuery.trim().length < 2}>
            {searching ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="person-add" size={22} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>

      {searching && <Text style={styles.searchingText}>{fr ? 'Recherche en cours...' : 'Searching...'}</Text>}

      {hasSearched && !searching && searchResults.length === 0 && (
        <View style={styles.emptySearchBox}>
          <Ionicons name="search" size={32} color="rgba(255,255,255,0.4)" />
          <Text style={styles.emptySearchText}>{fr ? 'Aucun profil trouvé avec ce pseudo.' : 'No profile found with this pseudo.'}</Text>
          <Text style={styles.emptySearchHint}>
            {fr
              ? 'La personne doit avoir un pseudo Communauté défini (Mes Profils → Éditer profil Communauté).'
              : 'The person must have a Community pseudo set (My Profiles → Edit Community profile).'}
          </Text>
        </View>
      )}

      {searchResults.length > 0 && (
        <View style={styles.searchResults}>
          <Text style={styles.sectionTitle}>{fr ? 'Résultats — Clique sur + pour envoyer une demande' : 'Results — Tap + to send a request'}</Text>
          {searchResults.map((r) => (
            <View key={r.id} style={styles.resultRow}>
              <TouchableOpacity
                style={styles.resultRowTouch}
                onPress={() => navigate('communityProfile', { communityId: r.id })}
                activeOpacity={0.7}
              >
                {r.profileImage ? (
                  <Image source={{ uri: normalizeMediaUrl(r.profileImage) }} style={styles.avatarSmall} />
                ) : (
                  <View style={[styles.avatarSmall, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>{r.pseudo?.charAt(0)?.toUpperCase() || '?'}</Text>
                  </View>
                )}
                <Text style={styles.resultPseudo}>{r.pseudo}</Text>
              </TouchableOpacity>
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
        <TouchableOpacity style={[styles.tab, activeTab === 'eventInvites' && styles.tabActive]} onPress={() => setActiveTab('eventInvites')}>
          <Text style={[styles.tabText, activeTab === 'eventInvites' && styles.tabTextActive]}>{fr ? 'Événements' : 'Events'}</Text>
          {eventInvites.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{eventInvites.length}</Text></View>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'bookerRequests' && styles.tabActive]} onPress={() => setActiveTab('bookerRequests')}>
          <Text style={[styles.tabText, activeTab === 'bookerRequests' && styles.tabTextActive]}>{fr ? 'Orga' : 'Orga'}</Text>
          {bookerRequests.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{bookerRequests.length}</Text></View>}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : activeTab === 'friends' ? (
          friends.length === 0 ? (
            <Text style={styles.emptyText}>{fr ? 'Aucun ami pour le moment.' : 'No friends yet.'}</Text>
          ) : (
            friends.map((f) => (
              <View key={f.id} style={styles.friendRow}>
                <TouchableOpacity
                  style={styles.friendRowTouch}
                  onPress={() => navigate('communityProfile', { communityId: f.communityId })}
                  activeOpacity={0.7}
                >
                  {f.profileImage ? (
                    <Image source={{ uri: normalizeMediaUrl(f.profileImage) }} style={styles.avatarSmall} />
                  ) : (
                    <View style={[styles.avatarSmall, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarInitial}>{f.pseudo?.charAt(0)?.toUpperCase() || '?'}</Text>
                    </View>
                  )}
                  <Text style={styles.friendPseudo}>{f.pseudo}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.removeBtn, removingFriend === f.id && styles.removeBtnDisabled]}
                  onPress={() => handleRemoveFriend(f.id)}
                  disabled={removingFriend === f.id}
                >
                  {removingFriend === f.id ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="person-remove" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              </View>
            ))
          )
        ) : activeTab === 'bookerRequests' ? (
          bookerRequests.length === 0 ? (
            <Text style={styles.emptyText}>{fr ? 'Aucune demande d\'organisateur.' : 'No organizer requests.'}</Text>
          ) : (
            bookerRequests.map((r) => (
              <View key={r.id} style={styles.requestRow}>
                <TouchableOpacity
                  style={styles.requestRowTouch}
                  onPress={() => r.bookerId && navigate('bookerProfile', { bookerId: r.bookerId })}
                  activeOpacity={0.7}
                >
                  {r.profileImage ? (
                    <Image source={{ uri: normalizeMediaUrl(r.profileImage) }} style={styles.avatarSmall} />
                  ) : (
                    <View style={[styles.avatarSmall, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarInitial}>{r.pseudo?.charAt(0)?.toUpperCase() || '?'}</Text>
                    </View>
                  )}
                  <Text style={styles.requestPseudo}>{r.pseudo} {fr ? '(organisateur)' : '(organizer)'}</Text>
                </TouchableOpacity>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.acceptBtn, respondingBookerRequest === r.id && styles.btnDisabled]}
                    onPress={async () => {
                      setRespondingBookerRequest(r.id);
                      try {
                        const res = await api.respondBookerFriendRequest(user.token, r.id, true);
                        if (res?.success) { showSuccess(fr ? 'Demande acceptée.' : 'Request accepted.'); fetchData(); }
                        else showError(res?.message);
                      } catch (e) { showError(e?.message); }
                      setRespondingBookerRequest(null);
                    }}
                    disabled={respondingBookerRequest === r.id}
                  >
                    {respondingBookerRequest === r.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.acceptBtnText}>✓</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.declineBtn, respondingBookerRequest === r.id && styles.btnDisabled]}
                    onPress={async () => {
                      setRespondingBookerRequest(r.id);
                      try {
                        const res = await api.respondBookerFriendRequest(user.token, r.id, false);
                        if (res?.success) { showSuccess(fr ? 'Demande refusée.' : 'Request declined.'); fetchData(); }
                        else showError(res?.message);
                      } catch (e) { showError(e?.message); }
                      setRespondingBookerRequest(null);
                    }}
                    disabled={respondingBookerRequest === r.id}
                  >
                    <Text style={styles.declineBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : activeTab === 'eventInvites' ? (
          eventInvites.length === 0 ? (
            <Text style={styles.emptyText}>{fr ? 'Aucune invitation à un événement.' : 'No event invitations.'}</Text>
          ) : (
            eventInvites.map((inv) => (
              <View key={inv.id} style={styles.eventInviteCard}>
                <TouchableOpacity
                  onPress={() => inv.creator?.id && navigate('communityProfile', { communityId: inv.creator.id })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eventInviteTitle}>
                    {(inv.creator?.pseudo || 'Quelqu\'un')} {fr ? 't\'invite à' : 'invites you to'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.eventInviteEvent}>{inv.event?.title || 'Événement'}</Text>
                {inv.event?.date && (
                  <Text style={styles.eventInviteDate}>
                    {new Date(inv.event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} • {inv.event?.time || ''}
                  </Text>
                )}
                <View style={styles.eventInviteActions}>
                  <TouchableOpacity
                    style={[styles.eventInviteJoinBtn, respondingInvite === inv.id && styles.btnDisabled]}
                    onPress={() => handleRespondEventInvite(inv.id, inv.groupId, 'join')}
                    disabled={respondingInvite === inv.id}
                  >
                    {respondingInvite === inv.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.eventInviteJoinBtnText}>{fr ? 'Rejoindre' : 'Join'}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.eventInviteDeclineBtn, respondingInvite === inv.id && styles.btnDisabled]}
                    onPress={() => handleRespondEventInvite(inv.id, inv.groupId, 'decline')}
                    disabled={respondingInvite === inv.id}
                  >
                    <Text style={styles.eventInviteDeclineBtnText}>{fr ? 'Refuser' : 'Decline'}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.eventInviteLink}
                  onPress={() => openEventPreview(navigate, user?.activeProfileType, inv.event?.id)}
                >
                  <Text style={styles.eventInviteLinkText}>{fr ? 'Voir l\'événement →' : 'View event →'}</Text>
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
                <TouchableOpacity
                  style={styles.requestRowTouch}
                  onPress={() => r.communityId && navigate('communityProfile', { communityId: r.communityId })}
                  activeOpacity={0.7}
                >
                  {r.profileImage ? (
                    <Image source={{ uri: normalizeMediaUrl(r.profileImage) }} style={styles.avatarSmall} />
                  ) : (
                    <View style={[styles.avatarSmall, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarInitial}>{r.pseudo?.charAt(0)?.toUpperCase() || '?'}</Text>
                    </View>
                  )}
                  <Text style={styles.requestPseudo}>{r.pseudo}</Text>
                </TouchableOpacity>
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

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  backBtn: { position: 'absolute', left: 16, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8 },
  backBtnText: { color: '#fff', fontSize: 16 },
  header: { alignItems: 'center', paddingBottom: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 },
  addFriendSection: { paddingHorizontal: 20, marginBottom: 16, paddingVertical: 12, backgroundColor: 'rgba(77,163,255,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(77,163,255,0.25)' },
  addFriendTitle: { color: Colors.primary, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  addFriendHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 10 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 16 },
  searchBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  searchBtnDisabled: { opacity: 0.5 },
  searchingText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, paddingHorizontal: 20, marginBottom: 8 },
  emptySearchBox: { padding: 24, marginHorizontal: 20, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, alignItems: 'center', gap: 8 },
  emptySearchText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  emptySearchHint: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  searchResults: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#141419', borderRadius: 12, marginBottom: 8, gap: 12 },
  resultRowTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultPseudo: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', gap: 6 },
  tabActive: { backgroundColor: 'rgba(77,163,255,0.3)', borderWidth: 1, borderColor: Colors.primary },
  tabText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  badge: { backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loader: { marginTop: 40 },
  emptyText: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 40, fontSize: 16 },
  friendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#141419', borderRadius: 12, marginBottom: 8, gap: 12 },
  friendRowTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  friendPseudo: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  requestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#141419', borderRadius: 12, marginBottom: 8, gap: 12 },
  requestRowTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestPseudo: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  requestActions: { flexDirection: 'row', gap: 8 },
  avatarSmall: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { backgroundColor: 'rgba(77,163,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 18, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
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
  eventInviteCard: { padding: 16, backgroundColor: '#141419', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(77,163,255,0.2)' },
  eventInviteTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 },
  eventInviteEvent: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  eventInviteDate: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 12 },
  eventInviteActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  eventInviteJoinBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  eventInviteJoinBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  eventInviteDeclineBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  eventInviteDeclineBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  eventInviteLink: { alignSelf: 'flex-start', paddingVertical: 4 },
  eventInviteLinkText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
