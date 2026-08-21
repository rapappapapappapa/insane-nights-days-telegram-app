import { StyleSheet } from 'react-native';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  cardHighlighted: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: primaryAlpha(0.06),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: primaryAlpha(0.35),
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDj: {
    backgroundColor: Colors.primary,
  },
  avatarBooker: {
    backgroundColor: '#3DD6A8',
  },
  avatarText: {
    color: Colors.text,
    fontSize: 17,
    fontFamily: FontFamily.bold,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  authorName: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  badgeDj: {
    backgroundColor: primaryAlpha(0.18),
    borderWidth: 1,
    borderColor: primaryAlpha(0.35),
  },
  badgeBooker: {
    backgroundColor: 'rgba(61, 214, 168, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(61, 214, 168, 0.35)',
  },
  badgeText: {
    color: Colors.text,
    fontSize: 10,
    fontFamily: FontFamily.bold,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  meta: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  metaDot: {
    color: Colors.textMuted,
    marginHorizontal: 4,
  },
  repostLabel: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: FontFamily.medium,
    marginLeft: 4,
  },
  embeddedPost: {
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: Radius.md,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundInput,
  },
  embeddedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  embeddedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  embeddedAvatarText: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
  embeddedHeaderInfo: {
    flex: 1,
  },
  embeddedAuthor: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 6,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  content: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FontFamily.regular,
  },
  imageWrap: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundInput,
  },
  image: {
    width: '100%',
    height: 220,
  },
  imageFallback: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  imageFallbackText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    gap: Spacing.lg,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  actionText: {
    color: Colors.textTertiary,
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  actionTextActive: {
    color: Colors.primary,
  },
  actionSpacer: {
    flex: 1,
  },
  commentsSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  commentsList: {
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  commentItem: {
    paddingVertical: Spacing.xs,
  },
  commentAuthor: {
    color: Colors.primary,
    fontSize: 13,
    fontFamily: FontFamily.bold,
    marginBottom: 2,
  },
  commentContent: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.regular,
  },
  commentDate: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: Colors.backgroundInput,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontFamily: FontFamily.regular,
    fontSize: 14,
  },
  commentSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: primaryAlpha(0.15),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: primaryAlpha(0.35),
  },
});
