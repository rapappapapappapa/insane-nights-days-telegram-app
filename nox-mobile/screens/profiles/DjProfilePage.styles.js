import { StyleSheet, Dimensions } from 'react-native';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.text,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  profileHero: {
    marginBottom: Spacing.lg,
  },
  banner: {
    height: 120,
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.card,
    backgroundColor: primaryAlpha(0.1),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  avatarWrap: {
    alignItems: 'center',
    marginTop: -40,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: Colors.background,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: primaryAlpha(0.2),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  identityBlock: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  djName: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.md,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    alignSelf: 'stretch',
  },
  quickStatPill: {
    flex: 1,
    backgroundColor: Colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  quickStatPillMuted: {
    opacity: 0.7,
  },
  quickStatLabel: {
    textTransform: 'uppercase',
    fontSize: 11,
    marginBottom: Spacing.xs,
  },
  quickStatValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  quickStatValue: {
    color: Colors.primary,
  },
  quickStatValueSmall: {
    color: Colors.text,
  },
  headerBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  badge: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: primaryAlpha(0.16),
    borderWidth: 1,
    borderColor: primaryAlpha(0.28),
  },
  badgeText: {
    color: Colors.text,
  },
  badgeSecondary: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  badgeSecondaryText: {
    color: Colors.text,
  },
  unavailableHint: {
    marginTop: Spacing.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  card: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    fontSize: 13,
  },
  streamSectionIntro: {
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  bioText: {
    lineHeight: 20,
  },
  bioTextEmpty: {
    fontStyle: 'italic',
    opacity: 0.75,
  },
  streamBlock: {},
  streamProviderBlock: {},
  streamProviderBlockSpaced: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  streamProviderLabel: {
    marginBottom: Spacing.sm,
    letterSpacing: 0.6,
  },
  emptyHint: {
    fontStyle: 'italic',
  },
  mediaSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  mediaButton: {
    backgroundColor: Colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  mediaButtonActive: {
    borderColor: primaryAlpha(0.35),
    backgroundColor: primaryAlpha(0.08),
  },
  mediaButtonText: {
    marginBottom: 4,
  },
  mediaButtonSub: {},
  mediaContent: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  mediaSubtitle: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  noMedia: {
    textAlign: 'center',
    paddingVertical: Spacing.xxxl,
    fontStyle: 'italic',
  },
  videoRow: {
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  videoCard: {
    width: 190,
    backgroundColor: Colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
  },
  videoItemUnavailable: {
    opacity: 0.6,
  },
  videoThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: Radius.sm,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnailImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: primaryAlpha(0.15),
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    position: 'absolute',
  },
  videoPlaceholderIcon: {
    fontSize: 28,
    marginBottom: Spacing.sm,
    color: Colors.primary,
  },
  videoPlaceholderText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.9,
  },
  playButtonOverlay: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: primaryAlpha(0.9),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  playIconWhite: {
    color: Colors.text,
    fontSize: 18,
    marginLeft: 2,
    fontWeight: '700',
  },
  videoTitle: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  videoTitleUnavailable: {
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  photoItem: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    borderRadius: Radius.sm,
    backgroundColor: Colors.backgroundElevated,
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  photoModalImage: {
    width: '100%',
    height: '80%',
    borderRadius: Radius.lg,
  },
  photoModalClose: {
    position: 'absolute',
    top: 50,
    right: Spacing.xl,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoModalCloseText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  bottomSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  reviewsColumn: {
    flex: 1,
  },
  equipmentColumn: {
    flex: 1,
  },
  reviewItem: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: primaryAlpha(0.25),
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  reviewerName: {
    color: Colors.primary,
  },
  reviewComment: {
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  noReviews: {
    fontStyle: 'italic',
  },
  seeAllReviews: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  equipmentList: {
    gap: Spacing.sm,
  },
  equipmentItem: {
    color: Colors.textSecondary,
  },
  equipmentText: {
    lineHeight: 20,
  },
  calendarSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  calendarTitle: {
    color: Colors.text,
  },
  eventBox: {
    backgroundColor: primaryAlpha(0.1),
    borderWidth: 1,
    borderColor: primaryAlpha(0.28),
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  eventDate: {
    color: Colors.primary,
    marginBottom: 4,
  },
  eventName: {
    color: Colors.text,
  },
  eventVenue: {
    color: Colors.textSecondary,
    marginTop: 4,
  },
  pastEventsTitle: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  pastEventBox: {
    backgroundColor: Colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  pastEventDate: {
    color: Colors.textSecondary,
  },
  pastEventName: {
    color: Colors.text,
    marginTop: 4,
  },
});
