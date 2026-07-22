import React, { useCallback, useMemo, useState } from 'react';
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
import { useLieuxData } from '../../hooks/useLieuxData';
import Colors from '../../constants/colors';
import { NoxText, NoxCard, NoxScreenHeader, NoxLieuxBottomNav } from '../../components/nox';
import {
  buildVenueNotifications,
  groupVenueNotifications,
  venueNotifIcon,
  formatVenueNotifDate,
} from '../../utils/lieuxNotificationsUtils';
import { styles } from '../notifications/NotificationsPage.styles';

export default function LieuxNotificationsPage() {
  const { goBack, navigate } = useNavigation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const fr = language === 'fr';

  const { loading, refreshing, bookings, refresh } = useLieuxData(user?.token, language);
  const [readIds, setReadIds] = useState(new Set());

  const items = useMemo(() => {
    const built = buildVenueNotifications(bookings, language);
    return built.map((n) => ({
      ...n,
      read: n.read || readIds.has(n.id),
    }));
  }, [bookings, language, readIds]);

  const grouped = useMemo(() => groupVenueNotifications(items), [items]);

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

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handlePress = (notif) => {
    setReadIds((prev) => new Set(prev).add(notif.id));
    const screen = notif.action || 'lieuxRequestDetail';
    navigate(screen, { eventVenueId: notif.eventVenueId });
  };

  const renderNotif = (n) => {
    const icon = venueNotifIcon(n.type);
    const time = formatVenueNotifDate(n.createdAt, language);
    const unread = n.read === false;

    return (
      <TouchableOpacity key={n.id} activeOpacity={0.85} onPress={() => handlePress(n)}>
        <NoxCard style={[styles.notifCard, unread && styles.notifUnread]} padded={false}>
          <View style={styles.avatar}>
            <Ionicons name={icon} size={18} color={Colors.primary} />
          </View>
          <View style={styles.notifBody}>
            <View style={styles.notifTopRow}>
              <NoxText variant="form" style={styles.notifTitle} numberOfLines={2}>
                {n.title}
              </NoxText>
              {unread ? <View style={styles.unreadDot} /> : null}
            </View>
            {n.body ? (
              <NoxText variant="secondary" style={styles.notifExcerpt} numberOfLines={2}>
                {n.body}
              </NoxText>
            ) : null}
            {n.subtitle ? (
              <NoxText variant="secondary" style={styles.notifExcerpt} numberOfLines={1}>
                {n.subtitle}
              </NoxText>
            ) : null}
            <NoxText variant="secondary" style={styles.notifTime}>
              {time}
            </NoxText>
          </View>
          <View style={styles.thumb}>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </View>
        </NoxCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <NoxScreenHeader
        title={fr ? 'Notifications lieu' : 'Venue notifications'}
        subtitle={fr ? 'Demandes et événements confirmés' : 'Requests and confirmed events'}
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
          contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
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
                {fr
                  ? 'Les demandes de collaboration apparaîtront ici.'
                  : 'Collaboration requests will show up here.'}
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

      <NoxLieuxBottomNav active={null} navigate={navigate} />
    </SafeAreaView>
  );
}
