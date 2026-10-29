import { StyleSheet } from 'react-native';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Radius, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: primaryAlpha(0.15),
    borderWidth: 2,
    borderColor: primaryAlpha(0.35),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarText: {
    color: Colors.primary,
    fontSize: 40,
    fontFamily: FontFamily.black,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  hubSection: {
    gap: Spacing.sm,
  },
  hubSectionTitle: {
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  hubCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  hubRowLast: {
    borderBottomWidth: 0,
  },
  hubRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubRowText: {
    flex: 1,
  },
  hubRowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
  },
  editLink: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  info: {
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  infoLabel: {},
  infoValue: {
    fontFamily: FontFamily.bold,
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },
  success: {
    color: Colors.success,
  },
  warning: {
    color: Colors.error,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  editActionBtn: {
    flex: 1,
    minHeight: 44,
  },
  emailVerifyBox: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: Spacing.sm,
  },
  codeInputWrap: {
    marginBottom: 0,
  },
  rgpdDescription: {
    lineHeight: 20,
  },
  rgpdButtons: {
    gap: Spacing.sm,
  },
  rgpdBtn: {
    minHeight: 44,
  },
  profileActiveLabel: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
    marginBottom: Spacing.sm,
  },
  profileSection: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  profileSectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  profileItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  profileItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  profileItemActive: {
    borderColor: primaryAlpha(0.55),
    backgroundColor: primaryAlpha(0.1),
  },
  profileItemText: {
    flex: 1,
    fontFamily: FontFamily.medium,
  },
  profileItemActiveBadge: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
    fontSize: 12,
  },
  profileEditBtn: {
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
  },
  noProfilesBox: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  statValue: {
    color: Colors.primary,
    fontFamily: FontFamily.black,
    fontSize: 24,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.screenPaddingHorizontal,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    gap: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalActionBtn: {
    flex: 1,
    minHeight: 44,
  },
});
