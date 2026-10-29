import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { resolveFeedNotificationNavigation } from '../../utils/communityNotificationRouting';
import { api, normalizeMediaUrl } from '../../api/config';
import Colors from '../../constants/colors';
import { NoxText, NoxScreenHeader } from '../../components/nox';
import { styles } from './NotificationsPage.styles';

function cleanText(s) {
  if (!s) return '';
  return String(s).replace(/\s+/g, ' ').trim();
}

function formatRelativeDate(dateString, language) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return language === 'fr' ? 'À l’instant' : 'Just now';
  if (diffMins < 60) return language === 'fr' ? `Il y a ${diffMins} min` : `${diffMins}m ago`;
  if (diffHours < 24) return language === 'fr' ? `Il y a ${diffHours}h` : `${diffHours}h ago`;

  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  const day = date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return language === 'fr' ? `${day} à ${time}` : `${day}, ${time}`;
}

const INTERACTION_TYPES = new Set(['like', 'repost', 'comment', 'reply', 'mention', 'follow', 'follow_post', 'new_post']);

function notifCategory(type) {
  const t = (type || '').toLowerCase();
  if (INTERACTION_TYPES.has(t)) return 'interactions';
  if (t.startsWith('event') || t.startsWith('ticket')) return 'events';
  return 'system';
}

function notifIcon(type) {
  const t = (type || '').toLowerCase();
  if (t === 'like') return 'heart';
  if (t === 'repost') return 'repeat';
  if (t === 'comment' || t === 'reply') return 'chatbubble-ellipses';
  if (t === 'follow' || t === 'follow_post' || t === 'new_post') return 'person-add';
  if (t === 'mention') return 'at';
  return 'notifications';
}

function notifLabel(type, language) {
  const t = (type || '').toLowerCase();
  if (t === 'like') return language === 'fr' ? 'a aimé ton post' : 'liked your post';
  if (t === 'repost') return language === 'fr' ? 'a reposté ta publication' : 'reposted your post';
  if (t === 'comment') return language === 'fr' ? 'a commenté ton post' : 'commented on your post';
  if (t === 'reply') return language === 'fr' ? 'a répondu à ton commentaire' : 'replied to your comment';
  if (t === 'follow') return language === 'fr' ? 'a commencé à te suivre' : 'started following you';
  if (t === 'follow_post' || t === 'new_post') return language === 'fr' ? 'a publié un post' : 'published a post';
  if (t === 'mention') return language === 'fr' ? 'a mentionné ton profil' : 'mentioned your profile';
  return language === 'fr' ? 'a interagi avec toi' : 'interacted with you';
}

function groupNotifications(items) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const groups = { today: [], yesterday: [], week: [], older: [] };
  items.forEach((n) => {
    const d = new Date(n.createdAt);
    if (Number.isNaN(d.getTime())) {
      groups.older.push(n);
      return;
    }
    if (d >= todayStart) groups.today.push(n);
    else if (d >= yesterdayStart) groups.yesterday.push(n);
    else if (d >= weekStart) groups.week.push(n);
    else groups.older.push(n);
  });
  return groups;
}

export default function NotificationsPage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { goBack, navigate } = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = useCallback(
    async (opts = { markRead: true }) => {
      if (!user?.token) {
        setItems([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const res = await api.getFeedNotifications(user.token, 40, 0);
        const notifications = Array.isArray(res?.notifications) ? res.notifications : [];
        setItems(notifications);

        if (opts?.markRead) {
          await api.markAllFeedNotificationsRead(user.token);
        }
      } catch (e) {
        console.error('[NotificationsPage] fetchNotifications error:', e);
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.token],
  );

  useEffect(() => {
    fetchNotifications({ markRead: true });
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications({ markRead: false });
  }, [fetchNotifications]);

  const filteredItems = useMemo(
    () => (filter === 'all' ? items : items.filter((n) => notifCategory(n?.type) === filter)),
    [items, filter],
  );

  const grouped = useMemo(() => groupNotifications(filteredItems), [filteredItems]);

  const sections = useMemo(
    () =>
      [
        { key: 'today', label: fr ? "Aujourd'hui" : 'Today', data: grouped.today },
        { key: 'yesterday', label: fr ? 'Hier' : 'Yesterday', data: grouped.yesterday },
        { key: 'week', label: fr ? 'Cette semaine' : 'This week', data: grouped.week },
        { key: 'older', label: fr ? 'Plus ancien' : 'Older', data: grouped.older },
      ].filter((s) => s.data.length > 0),
    [grouped, fr],
  );

  const filters = [
    { id: 'all', icon: 'aperture-outline', label: fr ? 'Toutes' : 'All' },
    { id: 'interactions', icon: 'heart-outline', label: 'Interactions' },
    { id: 'events', icon: 'calendar-outline', label: fr ? 'Événements' : 'Events' },
    { id: 'system', icon: 'notifications-outline', label: fr ? 'Système' : 'System' },
  ];

  const handlePress = async (notif) => {
    try {
      if (user?.token && notif?.id && notif?.read === false) {
        await api.markFeedNotificationRead(user.token, notif.id);
      }
    } catch {
      // ignore
    }
    const { screen, params } = resolveFeedNotificationNavigation(notif, user?.activeProfileType);
    navigate(screen, params);
  };

  const renderNotif = (n) => {
    const type = (n?.type || '').toLowerCase();
    const icon = notifIcon(type);
    const iconColor = type === 'like' ? '#ff4d6d' : Colors.primary;
    const actorName =
      cleanText(n?.actor?.displayName) || cleanText(n?.actor?.username) || (fr ? 'Quelqu’un' : 'Someone');
    const avatar = normalizeMediaUrl(n?.actor?.avatar);
    const postImage = normalizeMediaUrl(n?.post?.imageUrl);
    const postExcerpt = cleanText(n?.post?.content).slice(0, 120);
    const time = formatRelativeDate(n?.createdAt, language);
    const unread = n.read === false;

    return (
      <TouchableOpacity
        key={n.id}
        activeOpacity={0.85}
        onPress={() => handlePress(n)}
        style={[styles.row, unread && styles.rowUnread]}
      >
        {postImage ? (
          <View style={styles.rowBackdrop} pointerEvents="none">
            <Image source={{ uri: postImage }} style={styles.rowBackdropImage} />
            <View style={styles.rowBackdropShade} />
          </View>
        ) : null}
        <View style={styles.avatar}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : (
            <NoxText style={styles.avatarLetter}>{actorName.charAt(0).toUpperCase()}</NoxText>
          )}
        </View>
        <View style={styles.notifBody}>
          <NoxText style={styles.notifTitle} numberOfLines={2}>
            <NoxText style={styles.notifActor}>{actorName}</NoxText> {notifLabel(type, language)}
          </NoxText>
          {postExcerpt && type !== 'follow' ? (
            <NoxText style={styles.notifExcerpt} numberOfLines={2}>
              « {postExcerpt} »
            </NoxText>
          ) : null}
          <NoxText style={styles.notifTime}>{time}</NoxText>
        </View>
        <View style={styles.typeBubble}>
          <Ionicons name={icon} size={20} color={iconColor} />
          {unread ? <View style={styles.unreadDot} /> : null}
        </View>
      </TouchableOpacity>
    );
  };

  const emptyLabel =
    filter === 'events'
      ? fr ? 'Les rappels et nouveautés de tes soirées arriveront ici.' : 'Event reminders will show up here.'
      : filter === 'system'
        ? fr ? 'Aucun message système pour le moment.' : 'No system messages yet.'
        : fr ? 'Tes interactions apparaîtront ici.' : 'Your interactions will show up here.';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <NoxScreenHeader title="Notifications" onBack={goBack} />

      <View style={styles.filterBar}>
        {filters.map((f, i) => {
          const active = filter === f.id;
          return (
            <React.Fragment key={f.id}>
              {i > 0 ? <View style={styles.filterDivider} /> : null}
              <TouchableOpacity
                style={[styles.filterItem, active && styles.filterItemActive]}
                onPress={() => setFilter(f.id)}
                activeOpacity={0.8}
              >
                <Ionicons name={f.icon} size={15} color={active ? Colors.primaryLight : Colors.textSecondary} />
                <NoxText style={[styles.filterText, active && styles.filterTextActive]} numberOfLines={1}>
                  {f.label}
                </NoxText>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <NoxText variant="secondary">{fr ? 'Chargement…' : 'Loading…'}</NoxText>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {sections.length === 0 ? (
            <View style={styles.emptyBlock}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-outline" size={32} color={Colors.primary} />
              </View>
              <NoxText variant="titleSecondary" style={{ textAlign: 'center' }}>
                {fr ? 'Aucune notification' : 'No notifications'}
              </NoxText>
              <NoxText variant="secondary" style={{ textAlign: 'center' }}>
                {emptyLabel}
              </NoxText>
            </View>
          ) : (
            sections.map((section) => (
              <View key={section.key} style={styles.section}>
                <NoxText style={styles.sectionTitle}>{section.label}</NoxText>
                {section.data.map(renderNotif)}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
