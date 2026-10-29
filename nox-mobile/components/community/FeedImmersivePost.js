import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalizeMediaUrl } from '../../api/config';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/theme';
import { NoxText } from '../nox';

const BADGES = {
  DJ: { icon: 'musical-notes', label: 'DJ' },
  VENUE: { icon: 'business', label: 'Lieu' },
  BOOKER: { icon: 'calendar', label: 'Org.' },
};

/** Auteur d’un post d’origine (repost). */
export function originalAuthorMeta(original) {
  if (!original) return null;
  const type = original.profileType || (original.dj ? 'DJ' : original.venue ? 'VENUE' : 'BOOKER');
  if (type === 'DJ') {
    return { name: original.dj?.artistName, image: normalizeMediaUrl(original.dj?.profileImage), type };
  }
  if (type === 'VENUE') {
    return { name: original.venue?.venueName, image: normalizeMediaUrl(original.venue?.profileImage), type };
  }
  return {
    name: original.booker?.name || original.author?.username,
    image: normalizeMediaUrl(original.booker?.profileImage),
    type,
  };
}

function Avatar({ uri, name, size }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.fill} />
      ) : (
        <NoxText style={styles.avatarLetter}>{name?.charAt(0)?.toUpperCase() || '?'}</NoxText>
      )}
    </View>
  );
}

function RoleBadge({ type }) {
  const badge = BADGES[type] || BADGES.BOOKER;
  return (
    <View style={styles.badge}>
      <Ionicons name={badge.icon} size={10} color={Colors.primaryLight} />
      <NoxText style={styles.badgeText}>{badge.label}</NoxText>
    </View>
  );
}

/**
 * Publication du fil au format visuel NOX.
 * - `variant="card"` : carte plein cadre du fil (maquette 15).
 * - `variant="page"` : page plein écran du mode scroll (maquette 18), `height` obligatoire.
 * Photo en fond si le post (ou le post d’origine d’un repost) en a une ; sinon fond NOX et texte mis en avant.
 */
export default function FeedImmersivePost({
  variant = 'card',
  height,
  item,
  fr,
  profileName,
  profileImage,
  profileType,
  profileLocation,
  imageUri,
  isBrokenImage,
  dateLabel,
  originalDateLabel,
  liked,
  likesCount,
  commentsCount,
  repostsCount,
  canRepost,
  repostedByMe,
  highlighted,
  topInset = 0,
  bottomInset = 0,
  onPress,
  onPressProfile,
  onPressOriginalProfile,
  onMore,
  moreIcon = 'ellipsis-horizontal',
  onToggleLike,
  onOpenComments,
  onRepost,
  onImageError,
}) {
  const isPage = variant === 'page';
  const isRepost = !!(item.isRepost && item.originalPost);
  const original = isRepost ? originalAuthorMeta(item.originalPost) : null;
  const content = (isRepost ? item.originalPost.content : item.content)?.trim() || '';
  const hasImage = !!imageUri && !isBrokenImage;

  const metaParts = [profileLocation, dateLabel].filter(Boolean);

  const header = (
    <View style={[styles.header, isPage && styles.headerPage, { paddingTop: topInset + Spacing.md }]}>
      <TouchableOpacity
        style={[styles.headerAuthor, isPage && styles.headerAuthorPage]}
        activeOpacity={0.8}
        onPress={onPressProfile}
      >
        <Avatar uri={profileImage} name={profileName} size={isPage ? 46 : 42} />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <NoxText style={styles.name} numberOfLines={1}>
              {profileName || (fr ? 'Utilisateur' : 'User')}
            </NoxText>
            <RoleBadge type={profileType} />
          </View>
          <View style={styles.metaRow}>
            {isRepost ? (
              <>
                <Ionicons name="repeat" size={12} color={Colors.textTertiary} />
                <NoxText style={styles.meta}>Repost</NoxText>
                {metaParts.length ? <NoxText style={styles.meta}>•</NoxText> : null}
              </>
            ) : null}
            <NoxText style={styles.meta} numberOfLines={1}>
              {metaParts.join(' • ')}
            </NoxText>
          </View>
        </View>
      </TouchableOpacity>
      {onMore ? (
        <TouchableOpacity onPress={onMore} hitSlop={12} style={styles.moreBtn}>
          <Ionicons name={moreIcon} size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const originalRow = original ? (
    <TouchableOpacity style={styles.originalRow} activeOpacity={0.8} onPress={onPressOriginalProfile}>
      <Avatar uri={original.image} name={original.name} size={34} />
      <View style={{ flex: 1 }}>
        <NoxText style={styles.originalName} numberOfLines={1}>
          {original.name}
        </NoxText>
        {originalDateLabel ? <NoxText style={styles.meta}>{originalDateLabel}</NoxText> : null}
      </View>
    </TouchableOpacity>
  ) : null;

  const count = (n) => (n > 0 ? <NoxText style={styles.count}>{n}</NoxText> : null);

  const likeBtn = (
    <TouchableOpacity style={styles.action} onPress={onToggleLike} hitSlop={6}>
      <Ionicons
        name={liked ? 'heart' : 'heart-outline'}
        size={21}
        color={liked ? Colors.primaryLight : Colors.text}
      />
      {count(likesCount)}
    </TouchableOpacity>
  );
  const commentBtn = (
    <TouchableOpacity style={styles.action} onPress={onOpenComments} hitSlop={6}>
      <Ionicons name="chatbubble-outline" size={19} color={Colors.text} />
      {count(commentsCount)}
    </TouchableOpacity>
  );
  const repostBtn =
    canRepost || repostedByMe || isPage ? (
      <TouchableOpacity
        style={[styles.action, !canRepost && styles.actionMuted]}
        onPress={onRepost}
        disabled={!canRepost}
        hitSlop={6}
      >
        <Ionicons name="repeat" size={21} color={repostedByMe ? Colors.primaryLight : Colors.text} />
        {count(repostsCount)}
      </TouchableOpacity>
    ) : null;

  const background = hasImage ? (
    <Image source={{ uri: imageUri }} style={styles.fill} resizeMode="cover" onError={onImageError} />
  ) : (
    <View style={[styles.fill, styles.textBackground]}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <Ionicons name="chatbubble-ellipses-outline" size={isPage ? 64 : 44} color={primaryAlpha(0.18)} style={styles.quoteIcon} />
    </View>
  );

  if (isPage) {
    return (
      <TouchableOpacity activeOpacity={1} onPress={onPress} style={[styles.page, { height }]}>
        {background}
        <View style={styles.pageShadeTop} pointerEvents="none" />
        {header}
        {originalRow ? <View style={styles.pageOriginal}>{originalRow}</View> : null}
        {hasImage && content ? (
          <NoxText style={styles.pageCaption} numberOfLines={4}>
            {content}
          </NoxText>
        ) : null}
        {!hasImage && content ? (
          <View style={styles.pageTextWrap}>
            <NoxText style={styles.pageText}>{content}</NoxText>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View style={[styles.pageBarWrap, { paddingBottom: bottomInset + Spacing.lg }]}>
          <View style={styles.pageBar}>
            {likeBtn}
            <View style={styles.barDivider} />
            {commentBtn}
            <View style={styles.barDivider} />
            {repostBtn}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      style={[styles.card, hasImage ? styles.cardImage : styles.cardText, highlighted && styles.cardHighlighted]}
    >
      {background}
      <View style={styles.cardShadeTop} pointerEvents="none" />
      {header}
      {!hasImage && content ? (
        <View style={styles.cardTextWrap}>
          <NoxText style={styles.cardText} numberOfLines={8}>
            {content}
          </NoxText>
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={styles.infoBox}>
        {originalRow}
        {hasImage && content ? (
          <NoxText style={styles.caption} numberOfLines={3}>
            {content}
          </NoxText>
        ) : null}
        <View style={styles.cardActions}>
          {likeBtn}
          {commentBtn}
          {repostBtn}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  textBackground: { backgroundColor: '#0E1220', overflow: 'hidden' },
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: primaryAlpha(0.22),
  },
  glowBottom: {
    position: 'absolute',
    bottom: -140,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: primaryAlpha(0.12),
  },
  quoteIcon: { position: 'absolute', top: '38%', alignSelf: 'center' },
  avatar: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLetter: { fontFamily: FontFamily.bold, color: Colors.text },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: primaryAlpha(0.8),
    backgroundColor: primaryAlpha(0.18),
  },
  badgeText: { fontSize: 10, color: Colors.primaryLight, fontFamily: FontFamily.bold },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg },
  headerPage: { paddingHorizontal: Spacing.md },
  headerAuthor: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerAuthorPage: { justifyContent: 'center', paddingLeft: 36 },
  headerText: { flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.text, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  meta: { fontSize: 11, color: Colors.textTertiary },
  moreBtn: { width: 36, alignItems: 'center' },
  originalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  originalName: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.text },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionMuted: { opacity: 0.45 },
  count: { fontSize: 13, color: Colors.text },

  card: {
    marginTop: Spacing.md,
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundElevated,
    overflow: 'hidden',
  },
  cardImage: { height: 460 },
  cardText: { minHeight: 300 },
  cardHighlighted: { borderTopWidth: 2, borderBottomWidth: 2, borderColor: Colors.primary },
  cardShadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: 'rgba(10,10,9,0.35)',
  },
  cardTextWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  cardText: { fontFamily: FontFamily.medium, fontSize: 20, lineHeight: 28, color: Colors.text },
  infoBox: {
    gap: Spacing.sm,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: primaryAlpha(0.8),
    backgroundColor: 'rgba(10,10,9,0.45)',
  },
  caption: { fontSize: 14, lineHeight: 20, color: Colors.text },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },

  page: { width: '100%', backgroundColor: Colors.background, overflow: 'hidden' },
  pageShadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'rgba(10,10,9,0.4)',
  },
  pageOriginal: { alignSelf: 'center', marginTop: Spacing.md },
  pageCaption: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.text,
    textAlign: 'center',
  },
  pageTextWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xxl },
  pageText: { fontFamily: FontFamily.medium, fontSize: 24, lineHeight: 33, color: Colors.text, textAlign: 'center' },
  pageBarWrap: { alignItems: 'center' },
  pageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: primaryAlpha(0.6),
    backgroundColor: 'rgba(10,10,9,0.7)',
  },
  barDivider: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: Colors.borderSubtle },
});
