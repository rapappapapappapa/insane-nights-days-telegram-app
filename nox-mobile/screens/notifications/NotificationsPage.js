import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { api } from '../../api/config';
import Colors from '../../constants/colors';
import { NoxText, NoxCard, NoxScreenHeader } from '../../components/nox';
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

  return date.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function notifIcon(type) {
  const t = (type || '').toLowerCase();
  if (t === 'like') return 'heart';
  if (t === 'comment' || t === 'reply') return 'chatbubble-ellipses';
  if (t === 'follow' || t === 'follow_post' || t === 'new_post') return 'person-add';
  if (t === 'mention') return 'at';
  return 'notifications';
}

function notifLabel(type, language) {
  const t = (type || '').toLowerCase();
  if (t === 'like') return language === 'fr' ? 'A aimé ton post' : 'Liked your post';
  if (t === 'comment') return language === 'fr' ? 'A commenté ton post' : 'Commented on your post';
  if (t === 'reply') return language === 'fr' ? 'A répondu à ton commentaire' : 'Replied to your comment';
  if (t === 'follow') return language === 'fr' ? 'T’a suivi' : 'Followed you';
  if (t === 'follow_post' || t === 'new_post') return language === 'fr' ? 'Nouveau post' : 'New post';
  if (t === 'mention') return language === 'fr' ? 'T’a mentionné' : 'Mentioned you';
  return language === 'fr' ? 'Interaction' : 'Interaction';
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
          setItems((prev) => prev.map((n) => ({ ...n, read: true })));
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

  const grouped = useMemo(() => groupNotifications(items), [items]);

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
    const actorName = cleanText(n?.actor?.username) || (fr ? 'Quelqu’un' : 'Someone');
    const postExcerpt = cleanText(n?.post?.content).slice(0, 120);
    const time = formatRelativeDate(n?.createdAt, language);
    const unread = n.read === false;

    return (
      <TouchableOpacity key={n.id} activeOpacity={0.85} onPress={() => handlePress(n)}>
        <NoxCard style={[styles.notifCard, unread && styles.notifUnread]} padded={false}>
          {unread ? <View style={styles.unreadDot} /> : <View style={styles.unreadDotSpacer} />}
          <View style={styles.avatar}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <View style={styles.notifBody}>
            <NoxText variant="form" style={styles.notifTitle} numberOfLines={2}>
              {actorName} {notifLabel(type, language)}
            </NoxText>
            {postExcerpt ? (
              <NoxText variant="secondary" style={styles.notifExcerpt} numberOfLines={2}>
                « {postExcerpt} »
              </NoxText>
            ) : null}
            <NoxText variant="secondary" style={styles.notifTime}>
              {time}
            </NoxText>
          </View>
          <View style={styles.thumb}>
            <Ionicons name="image-outline" size={16} color={Colors.textTertiary} />
          </View>
        </NoxCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <NoxScreenHeader
        title={fr ? 'Notifications' : 'Notifications'}
        onBack={goBack}
      />

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
                {fr ? 'Tes interactions apparaîtront ici.' : 'Your interactions will show up here.'}
              </NoxText>
            </View>
          ) : (
            sections.map((section) => (
              <View key={section.key}>
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
