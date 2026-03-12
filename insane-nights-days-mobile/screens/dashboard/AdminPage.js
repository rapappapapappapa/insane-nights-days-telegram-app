import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { api } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function AdminPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();

  const isAdmin = (user?.role || 'USER') === 'ADMIN';
  const token = user?.token;

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);

  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState('');

  const [postsLoading, setPostsLoading] = useState(false);
  const [posts, setPosts] = useState([]);

  const [reportsLoading, setReportsLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportsFilter, setReportsFilter] = useState('OPEN');

  const [eventsLoading, setEventsLoading] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (!token) return;
        setLoading(true);
        const res = await api.adminMe(token);
        if (mounted) setMe(res?.admin || null);
      } catch (e) {
        if (__DEV__) console.warn('[AdminPage] adminMe failed:', e?.message ?? e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const hay = `${u.username || ''} ${u.email || ''} ${u.role || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, userQuery]);

  const loadUsers = async () => {
    if (!token || usersLoading) return;
    setUsersLoading(true);
    try {
      const res = await api.adminListUsers(token);
      if (res?.success && Array.isArray(res.users)) setUsers(res.users);
      else setUsers([]);
    } catch (e) {
      showError(language === 'fr' ? 'Impossible de charger les utilisateurs.' : 'Unable to load users.');
    } finally {
      setUsersLoading(false);
    }
  };

  const setRole = async (targetUserId, role) => {
    if (!token) return;
    try {
      const res = await api.adminSetUserRole(token, targetUserId, role);
      if (res?.success && res.user) {
        setUsers((prev) => prev.map((u) => (u.id === res.user.id ? { ...u, ...res.user } : u)));
      } else {
        throw new Error(res?.message || 'Role update failed');
      }
    } catch (e) {
      showError(e?.message || (language === 'fr' ? 'Action impossible.' : 'Action failed.'));
    }
  };

  const loadPosts = async () => {
    if (!token || postsLoading) return;
    setPostsLoading(true);
    try {
      const res = await api.adminListFeedPosts(token, 50, 0);
      if (res?.success && Array.isArray(res.posts)) setPosts(res.posts);
      else setPosts([]);
    } catch (e) {
      showError(language === 'fr' ? 'Impossible de charger les posts.' : 'Unable to load posts.');
    } finally {
      setPostsLoading(false);
    }
  };

  const deletePost = async (postId) => {
    if (!token) return;
    showConfirm(
      language === 'fr' ? 'Supprimer' : 'Delete',
      language === 'fr' ? 'Supprimer ce post ?' : 'Delete this post?',
      [
        { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: language === 'fr' ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.adminDeleteFeedPost(token, postId);
              if (res?.success) {
                setPosts((prev) => prev.filter((p) => p.id !== postId));
                showSuccess(language === 'fr' ? 'Post supprimé.' : 'Post deleted.');
              } else throw new Error(res?.message || 'Delete failed');
            } catch (e) {
              showError(e?.message || (language === 'fr' ? 'Suppression impossible.' : 'Delete failed.'));
            }
          },
        },
      ]
    );
  };

  const loadReports = async () => {
    if (!token || reportsLoading) return;
    setReportsLoading(true);
    try {
      const res = await api.adminListReports(token, reportsFilter);
      if (res?.success && Array.isArray(res.reports)) setReports(res.reports);
      else setReports([]);
    } catch (e) {
      showError(language === 'fr' ? 'Impossible de charger les signalements.' : 'Unable to load reports.');
    } finally {
      setReportsLoading(false);
    }
  };

  const updateReport = async (reportId, updates) => {
    if (!token) return;
    try {
      const res = await api.adminUpdateReport(token, reportId, updates);
      if (res?.success && res.report) {
        setReports((prev) => prev.map((r) => (r.id === res.report.id ? { ...r, ...res.report } : r)));
      } else {
        throw new Error(res?.message || 'Update failed');
      }
    } catch (e) {
      showError(e?.message || (language === 'fr' ? 'Action impossible.' : 'Action failed.'));
    }
  };

  const loadEvents = async () => {
    if (!token || eventsLoading) return;
    setEventsLoading(true);
    try {
      const res = await api.adminListEvents(token, 50, 0);
      if (res?.success && Array.isArray(res.events)) setEvents(res.events);
      else setEvents([]);
    } catch (e) {
      showError(language === 'fr' ? 'Impossible de charger les événements.' : 'Unable to load events.');
    } finally {
      setEventsLoading(false);
    }
  };

  const deleteEvent = async (eventId) => {
    if (!token) return;
    showConfirm(
      language === 'fr' ? 'Supprimer' : 'Delete',
      language === 'fr' ? 'Supprimer cet événement ?' : 'Delete this event?',
      [
        { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: language === 'fr' ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.adminDeleteEvent(token, eventId);
              if (res?.success) {
                setEvents((prev) => prev.filter((e) => e.id !== eventId));
                showSuccess(language === 'fr' ? 'Événement supprimé.' : 'Event deleted.');
              } else throw new Error(res?.message || 'Delete failed');
            } catch (e) {
              showError(e?.message || (language === 'fr' ? 'Suppression impossible.' : 'Delete failed.'));
            }
          },
        },
      ]
    );
  };

  if (!user?.isAuthenticated) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{language === 'fr' ? 'Connexion requise' : 'Login required'}</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{language === 'fr' ? 'Accès refusé' : 'Access denied'}</Text>
        <Text style={styles.subtle}>{language === 'fr' ? 'Cette page est réservée aux admins.' : 'This page is for admins only.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>{language === 'fr' ? 'Admin' : 'Admin'}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{language === 'fr' ? 'Compte' : 'Account'}</Text>
        {loading ? (
          <ActivityIndicator color="#FF1744" />
        ) : (
          <>
            <Text style={styles.line}>ID: {me?.id || user?.id}</Text>
            <Text style={styles.line}>Email: {me?.email || user?.email}</Text>
            <Text style={styles.line}>Pseudo: {me?.username || user?.username}</Text>
            <Text style={styles.line}>Role: {user?.role || 'USER'}</Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{language === 'fr' ? 'Utilisateurs' : 'Users'}</Text>
          <TouchableOpacity style={styles.btn} onPress={loadUsers} activeOpacity={0.85}>
            <Text style={styles.btnText}>{usersLoading ? (language === 'fr' ? '...' : '...') : (language === 'fr' ? 'Charger' : 'Load')}</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          value={userQuery}
          onChangeText={setUserQuery}
          placeholder={language === 'fr' ? 'Rechercher (email/pseudo/role)' : 'Search (email/username/role)'}
          placeholderTextColor="rgba(255,255,255,0.45)"
        />

        {filteredUsers.slice(0, 50).map((u) => (
          <View key={u.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle} numberOfLines={1}>{u.username || '—'} <Text style={styles.badge}>{u.role || 'USER'}</Text></Text>
              <Text style={styles.itemSub} numberOfLines={1}>{u.email}</Text>
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity
                style={[styles.smallBtn, u.role === 'ADMIN' && styles.smallBtnActive]}
                onPress={() => setRole(u.id, 'ADMIN')}
                activeOpacity={0.85}
              >
                <Text style={styles.smallBtnText}>ADMIN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, u.role !== 'ADMIN' && styles.smallBtnActive]}
                onPress={() => setRole(u.id, 'USER')}
                activeOpacity={0.85}
              >
                <Text style={styles.smallBtnText}>USER</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{language === 'fr' ? 'Feed (modération)' : 'Feed (moderation)'}</Text>
          <TouchableOpacity style={styles.btn} onPress={loadPosts} activeOpacity={0.85}>
            <Text style={styles.btnText}>{postsLoading ? (language === 'fr' ? '...' : '...') : (language === 'fr' ? 'Charger' : 'Load')}</Text>
          </TouchableOpacity>
        </View>

        {posts.map((p) => (
          <View key={p.id} style={styles.postRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {p.author?.username ? `${p.author.username}: ` : ''}
                {p.content}
              </Text>
              <Text style={styles.itemSub} numberOfLines={1}>
                {new Date(p.createdAt).toLocaleString()}
                {p.imageUrl ? ' • image' : ''}
              </Text>
            </View>
            <TouchableOpacity style={[styles.smallBtn, styles.smallBtnDanger]} onPress={() => deletePost(p.id)} activeOpacity={0.85}>
              <Text style={styles.smallBtnText}>{language === 'fr' ? 'Suppr.' : 'Del'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{language === 'fr' ? 'Signalements' : 'Reports'}</Text>
          <TouchableOpacity style={styles.btn} onPress={loadReports} activeOpacity={0.85}>
            <Text style={styles.btnText}>{reportsLoading ? (language === 'fr' ? '...' : '...') : (language === 'fr' ? 'Charger' : 'Load')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          {['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, reportsFilter === s && styles.filterChipActive]}
              onPress={() => setReportsFilter(s)}
              activeOpacity={0.85}
            >
              <Text style={styles.filterChipText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {reports.map((r) => (
          <View key={r.id} style={styles.postRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {r.targetType} • {r.reason} • {r.status}
              </Text>
              <Text style={styles.itemSub} numberOfLines={2}>
                {r.reporter?.username ? `${r.reporter.username}: ` : ''}
                {r.details || (language === 'fr' ? '—' : '—')}
              </Text>
              <Text style={styles.itemSub} numberOfLines={1}>{new Date(r.createdAt).toLocaleString()}</Text>
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity style={styles.smallBtn} onPress={() => updateReport(r.id, { status: 'IN_REVIEW' })} activeOpacity={0.85}>
                <Text style={styles.smallBtnText}>REVIEW</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={() => updateReport(r.id, { status: 'RESOLVED' })} activeOpacity={0.85}>
                <Text style={styles.smallBtnText}>OK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, styles.smallBtnDanger]} onPress={() => updateReport(r.id, { status: 'REJECTED' })} activeOpacity={0.85}>
                <Text style={styles.smallBtnText}>NO</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{language === 'fr' ? 'Événements (modération)' : 'Events (moderation)'}</Text>
          <TouchableOpacity style={styles.btn} onPress={loadEvents} activeOpacity={0.85}>
            <Text style={styles.btnText}>{eventsLoading ? (language === 'fr' ? '...' : '...') : (language === 'fr' ? 'Charger' : 'Load')}</Text>
          </TouchableOpacity>
        </View>

        {events.map((ev) => (
          <View key={ev.id} style={styles.postRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle} numberOfLines={2}>{ev.title} <Text style={styles.badge}>{ev.status}</Text></Text>
              <Text style={styles.itemSub} numberOfLines={1}>{new Date(ev.date).toLocaleDateString()} • {ev.location}</Text>
              <Text style={styles.itemSub} numberOfLines={1}>
                {ev.booker?.user?.username ? `@${ev.booker.user.username}` : ''}
                {ev.venue?.venueName ? ` • ${ev.venue.venueName}` : ''}
              </Text>
            </View>
            <TouchableOpacity style={[styles.smallBtn, styles.smallBtnDanger]} onPress={() => deleteEvent(ev.id)} activeOpacity={0.85}>
              <Text style={styles.smallBtnText}>{language === 'fr' ? 'Suppr.' : 'Del'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      
      {/* Toast pour les notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0e' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b0e', padding: 16 },
  header: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 12 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  subtle: { color: 'rgba(255,255,255,0.65)' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  line: { color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  btn: {
    backgroundColor: 'rgba(255, 23, 68, 0.92)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  btnText: { color: '#0b0b0e', fontWeight: '900' },
  input: {
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  postRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  itemTitle: { color: '#fff', fontWeight: '800' },
  itemSub: { color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  badge: { color: '#FF1744', fontWeight: '900' },
  itemActions: { flexDirection: 'row', gap: 8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filterChipActive: {
    borderColor: 'rgba(255, 23, 68, 0.35)',
    backgroundColor: 'rgba(255, 23, 68, 0.18)',
  },
  filterChipText: { color: 'rgba(255,255,255,0.85)', fontWeight: '900', fontSize: 12 },
  smallBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  smallBtnActive: {
    backgroundColor: 'rgba(255, 23, 68, 0.22)',
    borderColor: 'rgba(255, 23, 68, 0.35)',
  },
  smallBtnDanger: {
    backgroundColor: 'rgba(255, 23, 68, 0.18)',
    borderColor: 'rgba(255, 23, 68, 0.35)',
  },
  smallBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
});

