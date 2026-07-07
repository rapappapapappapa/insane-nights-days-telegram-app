import { StyleSheet } from 'react-native';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Radius, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Layout.screenPaddingHorizontal,
  },
  loadingText: {
    marginTop: Spacing.sm,
  },
  hero: {
    position: 'relative',
    height: 280,
    backgroundColor: primaryAlpha(0.1),
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBtnDisabled: {
    opacity: 0.5,
  },
  heroBadges: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'flex-end',
  },
  priceBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  priceText: {
    color: '#000000',
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  genreBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  genreText: {
    color: Colors.text,
    fontFamily: FontFamily.bold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.xxxl,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
  },
  heroDate: {
    color: Colors.primary,
    marginTop: 4,
  },
  heroTime: {
    marginTop: 2,
  },
  content: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingTop: Spacing.xl,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  infoLabel: {
    flex: 1,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: FontFamily.bold,
  },
  infoLink: {
    flex: 1,
    textAlign: 'right',
    color: Colors.primary,
    fontFamily: FontFamily.bold,
  },
  description: {
    lineHeight: 24,
  },
  errorText: {
    color: Colors.warning,
    marginBottom: Spacing.sm,
  },
  lineupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  lineupName: {
    fontFamily: FontFamily.bold,
  },
  orgCard: {
    gap: Spacing.md,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  orgAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: primaryAlpha(0.1),
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgName: {
    fontFamily: FontFamily.bold,
  },
  profileBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xxl,
    minHeight: 44,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  calendarBtn: {
    marginTop: Spacing.lg,
    minHeight: 44,
  },
  friendsSection: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: primaryAlpha(0.08),
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: primaryAlpha(0.25),
    gap: Spacing.sm,
  },
  friendsSectionTitle: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
  },
  groupCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupName: {
    fontFamily: FontFamily.bold,
    flex: 1,
  },
  inviteMoreBtn: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    backgroundColor: primaryAlpha(0.2),
    borderRadius: Radius.sm,
  },
  inviteMoreText: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  groupMembers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  memberChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  friendsBtn: {
    marginTop: Spacing.sm,
    minHeight: 44,
  },
  warningCard: {
    marginTop: Spacing.xl,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  warningText: {
    color: Colors.warning,
    lineHeight: 20,
  },
  tierSection: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  tierChip: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundElevated,
  },
  tierChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: primaryAlpha(0.18),
  },
  tierChipDisabled: {
    opacity: 0.45,
  },
  tierChipLabel: {
    fontFamily: FontFamily.medium,
  },
  tierChipLabelSelected: {
    color: Colors.text,
  },
  tierChipLabelDisabled: {
    color: Colors.textTertiary,
  },
  helperTextTier: {
    color: Colors.warning,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  cgvRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  cgvCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: primaryAlpha(0.6),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cgvCheckboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  cgvCheckmark: {
    color: '#000000',
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
  cgvTextWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  cgvLink: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
  },
  purchaseSection: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  buyBtn: {
    minHeight: Layout.buttonHeight,
  },
  pastEventSection: {
    marginTop: Spacing.xxxl,
    gap: Spacing.md,
    alignItems: 'center',
  },
  pastEventText: {
    textAlign: 'center',
  },
  rateBtn: {
    alignSelf: 'stretch',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.screenPaddingHorizontal,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: primaryAlpha(0.25),
    gap: Spacing.md,
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
  },
  friendsList: {
    maxHeight: 220,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  friendItemSelected: {
    backgroundColor: primaryAlpha(0.15),
    borderColor: primaryAlpha(0.45),
  },
  friendItemText: {
    fontFamily: FontFamily.bold,
  },
  friendItemCheck: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalActionBtn: {
    flex: 1,
    minHeight: 44,
  },
});
