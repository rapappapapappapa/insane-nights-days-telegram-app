import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import Colors from '../../constants/colors';
import EmptyState from '../../components/EmptyState';

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
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return language === 'fr' ? 'À l’instant' : 'Just now';
  if (diffMins < 60) return language === 'fr' ? `Il y a ${diffMins} min` : `${diffMins}m ago`;
  if (diffHours < 24) return language === 'fr' ? `Il y a ${diffHours}h` : `${diffHours}h ago`;
  if (diffDays < 7) return language === 'fr' ? `Il y a ${diffDays}j` : `${diffDays}d ago`;
  return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
}

function actorEmoji(profileType) {
  switch (profileType) {
    case 'DJ':
      return '🎧';
    case 'BOOKER':
      return '📋';
    case 'VENUE':
      return '📍';
    case 'COMMUNITY':
      return '👥';
    default:
      return '👤';
  }
}

function notifIcon(type) {
  const t = (type || '').toLowerCase();
  if (t === 'like') return 'heart';
  if (t === 'comment' || t === 'reply') return 'chatbubble-ellipses';
  if (t === 'follow_post' || t === 'new_post') return 'sparkles';
  return 'notifications';
}

function notifLabel(type, language) {
  const t = (type || '').toLowerCase();
  if (t === 'like') return language === 'fr' ? 'Like' : 'Like';
  if (t === 'comment' || t === 'reply') return language === 'fr' ? 'Commentaire' : 'Comment';
  if (t === 'follow_post' || t === 'new_post') return language === 'fr' ? 'Nouveau post' : 'New post';
  return language === 'fr' ? 'Notification' : 'Notification';
}

export default function NotificationsPage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
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
          // Optimiste: on met aussi la liste en "read"
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
    [user?.token]
  );

  useEffect(() => {
    fetchNotifications({ markRead: true });
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications({ markRead: false });
  }, [fetchNotifications]);

  const hasItems = useMemo(() => items.length > 0, [items.length]);

  const handlePress = async (notif) => {
    // Best-effort: marquer l'item lu (si jamais mark-all-read a été désactivé plus tard)
    try {
      if (user?.token && notif?.id && notif?.read === false) {
        await api.markFeedNotificationRead(user.token, notif.id);
      }
    } catch (e) {
      // ignore
    }

    // Aller au feed (pour l'instant, on ouvre juste le feed)
    navigate('feed', { highlightPostId: notif?.post?.id || null });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.topBar, { paddingTop: Math.max(12, (insets?.top ?? 0) + 10) }]}>
        <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.8}>
          <Text style={styles.backText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{language === 'fr' ? 'Notifications' : 'Notifications'}</Text>

        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>{language === 'fr' ? 'Chargement…' : 'Loading…'}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {!hasItems ? (
            <EmptyState
              icon="notifications-outline"
              title={language === 'fr' ? 'Aucune notification' : 'No notifications'}
              message={language === 'fr' ? 'Tes interactions apparaîtront ici.' : 'Your interactions will show up here.'}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {items.map((n) => {
                const type = (n?.type || '').toLowerCase();
                const icon = notifIcon(type);
                const iconColor = type === 'like' ? '#ff4d6d' : Colors.primary;
                const actorName = cleanText(n?.actor?.username) || (language === 'fr' ? 'Quelqu’un' : 'Someone');
                const aEmoji = actorEmoji(n?.actor?.profileType);
                const postExcerpt = cleanText(n?.post?.content).slice(0, 120);
                const time = formatRelativeDate(n?.createdAt, language);

                return (
                  <TouchableOpacity
                    key={n.id}
                    style={[styles.card, n.read ? styles.cardRead : styles.cardUnread]}
                    onPress={() => handlePress(n)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.cardLeft}>
                      <View style={[styles.iconBubble, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                        <Ionicons name={icon} size={18} color={iconColor} />
                      </View>
                    </View>

                    <View style={styles.cardBody}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {aEmoji} {actorName} • {notifLabel(type, language)}
                        </Text>
                        <Text style={styles.cardTime}>{time}</Text>
                      </View>

                      <Text style={styles.cardSubtitle} numberOfLines={2}>
                        {postExcerpt ? `“${postExcerpt}”` : (language === 'fr' ? 'Post' : 'Post')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: { paddingVertical: 8, paddingHorizontal: 8 },
  backText: { color: Colors.primary, fontSize: 16, fontWeight: '800' },
  title: { color: '#fff', fontSize: 18, fontWeight: '900' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: 'rgba(255,255,255,0.7)' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  cardUnread: {
    backgroundColor: 'rgba(255, 23, 68, 0.10)',
    borderColor: 'rgba(255, 23, 68, 0.30)',
  },
  cardRead: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardLeft: { width: 34, alignItems: 'center', paddingTop: 2 },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '900' },
  cardTime: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '700' },
  cardSubtitle: { marginTop: 6, color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 18 },
});

