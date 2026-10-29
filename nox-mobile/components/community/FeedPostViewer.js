import React from 'react';
import { Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/theme';
import { NoxText } from '../nox';

const BADGE = {
  DJ: { icon: 'musical-notes', label: 'DJ' },
  VENUE: { icon: 'business', label: 'Lieu' },
  BOOKER: { icon: 'calendar', label: 'Org.' },
};

/** Publication plein écran (maquette 18) : photo, auteur, texte, barre like / commentaire / repost. */
export default function FeedPostViewer({
  visible,
  onClose,
  imageUri,
  content,
  profileName,
  profileImage,
  profileType,
  metaLine,
  liked,
  likesCount,
  commentsCount,
  repostsCount,
  repostedByMe,
  canRepost,
  onToggleLike,
  onComment,
  onRepost,
  onPressProfile,
  onMore,
}) {
  const insets = useSafeAreaInsets();
  const badge = BADGE[profileType] || BADGE.BOOKER;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar style="light" />
      <View style={styles.container}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : null}
        <View style={[styles.topShade, { height: insets.top + 170 }]} pointerEvents="none" />
        <View style={styles.bottomShade} pointerEvents="none" />

        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.sideBtn}>
              <Ionicons name="chevron-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.author} activeOpacity={0.8} onPress={onPressProfile}>
              <View style={styles.avatar}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <NoxText style={styles.avatarLetter}>
                    {profileName?.charAt(0)?.toUpperCase() || '?'}
                  </NoxText>
                )}
              </View>
              <View>
                <View style={styles.nameRow}>
                  <NoxText style={styles.name} numberOfLines={1}>
                    {profileName}
                  </NoxText>
                  <View style={styles.badge}>
                    <Ionicons name={badge.icon} size={10} color={Colors.primaryLight} />
                    <NoxText style={styles.badgeText}>{badge.label}</NoxText>
                  </View>
                </View>
                {metaLine ? <NoxText style={styles.meta}>{metaLine}</NoxText> : null}
              </View>
            </TouchableOpacity>
            {onMore ? (
              <TouchableOpacity onPress={onMore} hitSlop={12} style={styles.sideBtn}>
                <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.sideBtn} />
            )}
          </View>
          {content?.trim() ? (
            <NoxText style={styles.content} numberOfLines={imageUri ? 4 : undefined}>
              {content}
            </NoxText>
          ) : null}
        </View>

        <View style={[styles.actionsWrap, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.action} onPress={onToggleLike}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={20}
                color={liked ? '#ff4d6d' : Colors.text}
              />
              <NoxText style={styles.count}>{likesCount ?? 0}</NoxText>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.action} onPress={onComment}>
              <Ionicons name="chatbubble-outline" size={19} color={Colors.text} />
              <NoxText style={styles.count}>{commentsCount ?? 0}</NoxText>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={[styles.action, !canRepost && !repostedByMe && styles.actionDisabled]}
              onPress={onRepost}
              disabled={!canRepost}
            >
              <Ionicons
                name="repeat"
                size={20}
                color={repostedByMe ? Colors.primaryLight : Colors.text}
              />
              <NoxText style={styles.count}>{repostsCount ?? 0}</NoxText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'space-between' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(10,10,9,0.55)' },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundColor: 'rgba(10,10,9,0.35)' },
  header: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  sideBtn: { width: 36, alignItems: 'center' },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarLetter: { fontFamily: FontFamily.bold, color: Colors.text },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { fontFamily: FontFamily.bold, fontSize: 17, color: Colors.text, maxWidth: 180 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: primaryAlpha(0.7),
    backgroundColor: primaryAlpha(0.15),
  },
  badgeText: { fontSize: 11, color: Colors.primaryLight, fontFamily: FontFamily.bold },
  meta: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  content: { fontSize: 15, lineHeight: 21, color: Colors.text, textAlign: 'center' },
  actionsWrap: { alignItems: 'center' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: primaryAlpha(0.5),
    backgroundColor: 'rgba(10,10,9,0.7)',
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md },
  actionDisabled: { opacity: 0.5 },
  count: { fontSize: 13, color: Colors.text },
  divider: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: Colors.borderSubtle },
});
