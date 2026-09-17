import { StyleSheet } from 'react-native';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Radius, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBlock: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.sm,
    gap: Spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: 120,
    gap: Spacing.md,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: primaryAlpha(0.18),
  },
  segmentText: {
    color: Colors.textTertiary,
  },
  segmentTextActive: {
    color: Colors.text,
    fontFamily: FontFamily.bold,
  },
  filtersRow: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundCard,
    marginRight: Spacing.sm,
  },
  chipActive: {
    backgroundColor: primaryAlpha(0.15),
    borderColor: primaryAlpha(0.45),
  },
  chipText: {
    color: Colors.textTertiary,
  },
  chipTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  eventThumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  eventThumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  djThumb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontFamily: FontFamily.bold,
  },
  itemPrice: {
    color: Colors.primary,
    marginTop: 2,
  },
  itemGenre: {
    color: Colors.primary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: Colors.text,
  },
  statusDot: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  statusDotText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContent: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  skeletonCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: primaryAlpha(0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
  },
});
