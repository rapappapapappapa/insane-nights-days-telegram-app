import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NoxText from './NoxText';
import NotificationBadge from '../NotificationBadge';
import Colors from '../../constants/colors';
import { Layout, Spacing } from '../../constants/theme';

/** En-tête NOX pour dashboards pro (Phase E). */
export default function NoxProDashboardHeader({
  title,
  subtitle,
  onBack,
  showBack = true,
  onMessagesPress,
  unreadCount = 0,
  onMarkMessagesRead,
  rightSlot,
}) {
  return (
    <View style={styles.header}>
      <View style={styles.side}>
        {showBack && onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.iconBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <View style={styles.center}>
        <NoxText variant="titleSecondary" style={styles.title} numberOfLines={2}>
          {title}
        </NoxText>
        {subtitle ? (
          <NoxText variant="secondary" style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </NoxText>
        ) : null}
      </View>

      <View style={styles.side}>
        {rightSlot ?? (
          onMessagesPress ? (
            <TouchableOpacity onPress={onMessagesPress} style={styles.iconBtn}>
              <Ionicons name="chatbubbles-outline" size={22} color={Colors.text} />
              {unreadCount > 0 ? (
                <NotificationBadge count={unreadCount} onPress={onMarkMessagesRead} />
              ) : null}
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Layout.headerHeight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
  },
  side: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  title: {
    fontSize: 17,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 2,
    textAlign: 'center',
    fontSize: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundInput,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    position: 'relative',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
});
