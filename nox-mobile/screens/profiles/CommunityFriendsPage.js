/**
 * Page Amis Communauté
 * Recherche par pseudo (unique), demande d'ajout, liste d'amis, demandes reçues
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
import Colors, { primaryAlpha } from '../../constants/colors';
import { Layout, Radius, Spacing } from '../../constants/theme';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { openEventPreview } from '../../utils/noxNavigation';
import {
  NoxText,
  NoxButton,
  NoxCard,
  NoxScreenHeader,
  NoxSearchBar,
  NoxTabs,
} from '../../components/nox';

function Avatar({ uri, initial }) {
  if (uri) {
    return <Image source={{ uri: normalizeMediaUrl(uri) }} style={styles.avatarSmall} />;
  }
  return (
    <View style={[styles.avatarSmall, styles.avatarPlaceholder]}>
      <NoxText style={styles.avatarInitial}>{initial || '?'}</NoxText>
    </View>
  );
}

export default function CommunityFriendsPage() {
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

  const tabs = [
    {
      id: 'friends',
      label: friends.length > 0 ? `${fr ? 'Amis' : 'Friends'} (${friends.length})` : (fr ? 'Amis' : 'Friends'),
    },
    {
      id: 'requests',
      label: requests.length > 0 ? `${fr ? 'Demandes' : 'Requests'} (${requests.length})` : (fr ? 'Demandes' : 'Requests'),
    },
    {
      id: 'eventInvites',
      label: eventInvites.length > 0
        ? `${fr ? 'Événements' : 'Events'} (${eventInvites.length})`
        : (fr ? 'Événements' : 'Events'),
    },
    {
      id: 'bookerRequests',
      label: bookerRequests.length > 0 ? `Orga (${bookerRequests.length})` : 'Orga',
    },
  ];

  if (!user?.token) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <NoxScreenHeader title={fr ? 'Mes amis' : 'My friends'} onBack={goBack} />
        <View style={styles.centered}>
          <NoxText variant="form">
            {fr ? 'Connecte-toi pour accéder aux amis.' : 'Log in to access friends.'}
          </NoxText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <NoxScreenHeader
        title={fr ? 'Mes amis' : 'My friends'}
        subtitle={fr ? 'Recherche et gère tes amis Communauté' : 'Search and manage your Community friends'}
        onBack={goBack}
      />

      <View style={styles.searchSection}>
        <NoxText variant="form" style={styles.addTitle}>
          {fr ? 'Ajouter un ami' : 'Add a friend'}
        </NoxText>
        <NoxText variant="secondary" style={styles.addHint}>
          {fr ? 'Recherche par pseudo (unique)' : 'Search by pseudo (unique)'}
        </NoxText>
        <View style={styles.searchRow}>
          <NoxSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={fr ? 'Pseudo de ton ami…' : "Your friend's pseudo…"}
            style={styles.searchBar}
          />
          <TouchableOpacity
            style={[styles.searchBtn, (searching || searchQuery.trim().length < 2) && styles.searchBtnDisabled]}
            onPress={handleSearch}
            disabled={searching || searchQuery.trim().length < 2}
            accessibilityRole="button"
            accessibilityLabel={fr ? 'Rechercher' : 'Search'}
          >
            {searching ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <Ionicons name="person-add" size={20} color={Colors.text} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {searching ? (
        <NoxText variant="secondary" style={styles.searchingText}>
          {fr ? 'Recherche en cours…' : 'Searching…'}
        </NoxText>
      ) : null}

      {hasSearched && !searching && searchResults.length === 0 ? (
        <View style={styles.emptySearchBox}>
          <Ionicons name="search" size={28} color={Colors.textTertiary} />
          <NoxText variant="form" style={styles.emptySearchText}>
            {fr ? 'Aucun profil trouvé avec ce pseudo.' : 'No profile found with this pseudo.'}
          </NoxText>
          <NoxText variant="secondary" style={styles.emptySearchHint}>
            {fr
              ? 'La personne doit avoir un pseudo Communauté défini (Mes Profils → Éditer profil Communauté).'
              : 'The person must have a Community pseudo set (My Profiles → Edit Community profile).'}
          </NoxText>
        </View>
      ) : null}

      {searchResults.length > 0 ? (
        <View style={styles.searchResults}>
          <NoxText variant="secondary" style={styles.sectionTitle}>
            {fr ? 'Résultats — Clique sur + pour envoyer une demande' : 'Results — Tap + to send a request'}
          </NoxText>
          {searchResults.map((r) => (
            <View key={r.id} style={styles.resultRow}>
              <TouchableOpacity
                style={styles.rowTouch}
                onPress={() => navigate('communityProfile', { communityId: r.id })}
                activeOpacity={0.7}
              >
                <Avatar uri={r.profileImage} initial={r.pseudo?.charAt(0)?.toUpperCase()} />
                <NoxText variant="form" style={styles.rowLabel}>{r.pseudo}</NoxText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, styles.iconBtnPrimary, sendingRequest === r.id && styles.btnDisabled]}
                onPress={() => handleSendRequest(r.id)}
                disabled={sendingRequest === r.id}
              >
                {sendingRequest === r.id ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : (
                  <Ionicons name="add" size={22} color={Colors.text} />
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      <NoxTabs
        tabs={tabs}
        activeId={activeTab}
        onChange={setActiveTab}
        variant="subtle"
        style={styles.tabs}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading || loadingInvites ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : activeTab === 'friends' ? (
          friends.length === 0 ? (
            <NoxText variant="secondary" style={styles.emptyText}>
              {fr ? 'Aucun ami pour le moment.' : 'No friends yet.'}
            </NoxText>
          ) : (
            friends.map((f) => (
              <View key={f.id} style={styles.listRow}>
                <TouchableOpacity
                  style={styles.rowTouch}
                  onPress={() => navigate('communityProfile', { communityId: f.communityId })}
                  activeOpacity={0.7}
                >
                  <Avatar uri={f.profileImage} initial={f.pseudo?.charAt(0)?.toUpperCase()} />
                  <NoxText variant="form" style={styles.rowLabel}>{f.pseudo}</NoxText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, removingFriend === f.id && styles.btnDisabled]}
                  onPress={() => handleRemoveFriend(f.id)}
                  disabled={removingFriend === f.id}
                >
                  {removingFriend === f.id ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Ionicons name="person-remove" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
            ))
          )
        ) : activeTab === 'bookerRequests' ? (
          bookerRequests.length === 0 ? (
            <NoxText variant="secondary" style={styles.emptyText}>
              {fr ? "Aucune demande d'organisateur." : 'No organizer requests.'}
            </NoxText>
          ) : (
            bookerRequests.map((r) => (
              <View key={r.id} style={styles.listRow}>
                <TouchableOpacity
                  style={styles.rowTouch}
                  onPress={() => r.bookerId && navigate('bookerProfile', { bookerId: r.bookerId })}
                  activeOpacity={0.7}
                >
                  <Avatar uri={r.profileImage} initial={r.pseudo?.charAt(0)?.toUpperCase()} />
                  <NoxText variant="form" style={styles.rowLabel}>
                    {r.pseudo} {fr ? '(organisateur)' : '(organizer)'}
                  </NoxText>
                </TouchableOpacity>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.iconBtn, styles.iconBtnSuccess, respondingBookerRequest === r.id && styles.btnDisabled]}
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
                    {respondingBookerRequest === r.id ? (
                      <ActivityIndicator size="small" color={Colors.text} />
                    ) : (
                      <Ionicons name="checkmark" size={20} color={Colors.text} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconBtn, respondingBookerRequest === r.id && styles.btnDisabled]}
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
                    <Ionicons name="close" size={20} color={Colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : activeTab === 'eventInvites' ? (
          eventInvites.length === 0 ? (
            <NoxText variant="secondary" style={styles.emptyText}>
              {fr ? 'Aucune invitation à un événement.' : 'No event invitations.'}
            </NoxText>
          ) : (
            eventInvites.map((inv) => (
              <NoxCard key={inv.id} style={styles.inviteCard}>
                <TouchableOpacity
                  onPress={() => inv.creator?.id && navigate('communityProfile', { communityId: inv.creator.id })}
                  activeOpacity={0.7}
                >
                  <NoxText variant="secondary" style={styles.inviteTitle}>
                    {(inv.creator?.pseudo || "Quelqu'un")} {fr ? "t'invite à" : 'invites you to'}
                  </NoxText>
                </TouchableOpacity>
                <NoxText variant="form" style={styles.inviteEvent}>
                  {inv.event?.title || 'Événement'}
                </NoxText>
                {inv.event?.date ? (
                  <NoxText variant="secondary" style={styles.inviteDate}>
                    {new Date(inv.event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} • {inv.event?.time || ''}
                  </NoxText>
                ) : null}
                <View style={styles.inviteActions}>
                  <NoxButton
                    label={fr ? 'Rejoindre' : 'Join'}
                    onPress={() => handleRespondEventInvite(inv.id, inv.groupId, 'join')}
                    loading={respondingInvite === inv.id}
                    disabled={respondingInvite === inv.id}
                    style={styles.inviteBtn}
                  />
                  <NoxButton
                    label={fr ? 'Refuser' : 'Decline'}
                    variant="secondary"
                    onPress={() => handleRespondEventInvite(inv.id, inv.groupId, 'decline')}
                    disabled={respondingInvite === inv.id}
                    style={styles.inviteBtn}
                  />
                </View>
                <TouchableOpacity
                  style={styles.eventLink}
                  onPress={() => openEventPreview(navigate, user?.activeProfileType, inv.event?.id)}
                >
                  <NoxText style={styles.eventLinkText}>
                    {fr ? "Voir l'événement →" : 'View event →'}
                  </NoxText>
                </TouchableOpacity>
              </NoxCard>
            ))
          )
        ) : (
          requests.length === 0 ? (
            <NoxText variant="secondary" style={styles.emptyText}>
              {fr ? 'Aucune demande en attente.' : 'No pending requests.'}
            </NoxText>
          ) : (
            requests.map((r) => (
              <View key={r.id} style={styles.listRow}>
                <TouchableOpacity
                  style={styles.rowTouch}
                  onPress={() => r.communityId && navigate('communityProfile', { communityId: r.communityId })}
                  activeOpacity={0.7}
                >
                  <Avatar uri={r.profileImage} initial={r.pseudo?.charAt(0)?.toUpperCase()} />
                  <NoxText variant="form" style={styles.rowLabel}>{r.pseudo}</NoxText>
                </TouchableOpacity>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.iconBtn, styles.iconBtnSuccess, respondingRequest === r.id && styles.btnDisabled]}
                    onPress={() => handleRespondRequest(r.id, 'accept')}
                    disabled={respondingRequest === r.id}
                  >
                    {respondingRequest === r.id ? (
                      <ActivityIndicator size="small" color={Colors.text} />
                    ) : (
                      <Ionicons name="checkmark" size={20} color={Colors.text} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconBtn, respondingRequest === r.id && styles.btnDisabled]}
                    onPress={() => handleRespondRequest(r.id, 'decline')}
                    disabled={respondingRequest === r.id}
                  >
                    <Ionicons name="close" size={20} color={Colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPaddingHorizontal,
  },
  searchSection: {
    marginHorizontal: Layout.screenPaddingHorizontal,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: primaryAlpha(0.08),
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: primaryAlpha(0.25),
  },
  addTitle: { color: Colors.primary, marginBottom: Spacing.xs },
  addHint: { fontSize: 12, marginBottom: Spacing.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  searchBar: { flex: 1 },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: { opacity: 0.5 },
  searchingText: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    marginBottom: Spacing.sm,
    fontSize: 13,
  },
  emptySearchBox: {
    marginHorizontal: Layout.screenPaddingHorizontal,
    marginBottom: Spacing.md,
    padding: Spacing.xxl,
    backgroundColor: Colors.backgroundInput,
    borderRadius: Radius.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  emptySearchText: { textAlign: 'center' },
  emptySearchHint: { textAlign: 'center', fontSize: 13 },
  searchResults: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 13, marginBottom: Spacing.sm },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  tabs: { marginBottom: Spacing.sm },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.xxxl,
  },
  loader: { marginTop: Spacing.xxxl },
  emptyText: { textAlign: 'center', marginTop: Spacing.xxxl, fontSize: 15 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  rowTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rowLabel: { flex: 1 },
  requestActions: { flexDirection: 'row', gap: Spacing.sm },
  avatarSmall: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    backgroundColor: primaryAlpha(0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPrimary: { backgroundColor: Colors.primary },
  iconBtnSuccess: { backgroundColor: Colors.success },
  btnDisabled: { opacity: 0.6 },
  inviteCard: { marginBottom: Spacing.md, gap: Spacing.xs },
  inviteTitle: { fontSize: 13, marginBottom: Spacing.xs },
  inviteEvent: { fontSize: 16, fontWeight: '700' },
  inviteDate: { fontSize: 13, marginBottom: Spacing.sm },
  inviteActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  inviteBtn: { flex: 1, minHeight: 44 },
  eventLink: { alignSelf: 'flex-start', paddingVertical: Spacing.xs, marginTop: Spacing.xs },
  eventLinkText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
