import { StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  title: {
    color: Colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontFamily: FontFamily.black,
    marginBottom: Spacing.sm,
    textAlign: 'left',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FontFamily.regular,
    textAlign: 'left',
  },
  form: {
    gap: 0,
  },
  noxButtonSpacing: {
    marginTop: Spacing.lg,
  },
  socialDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  socialDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderSubtle,
  },
  socialDividerText: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: FontFamily.medium,
    textTransform: 'lowercase',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  forgotLinkText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  modeSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: Spacing.lg,
    gap: 4,
  },
  modeSwitchText: {
    color: Colors.textTertiary,
    fontSize: 14,
    fontFamily: FontFamily.regular,
  },
  modeSwitchLink: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
  cguRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  cguTextWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  cguText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  cguLink: {
    color: Colors.primary,
    fontSize: 12,
    fontFamily: FontFamily.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.screenPaddingHorizontal,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
  modalLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    fontFamily: FontFamily.medium,
  },
  modalInput: {
    backgroundColor: Colors.backgroundInput,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 12,
    color: Colors.text,
    fontSize: 16,
    fontFamily: FontFamily.regular,
    padding: Spacing.md,
  },
  modalPrimaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  modalPrimaryButtonText: {
    color: '#000',
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  modalBackLink: {
    alignSelf: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  modalBackLinkText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: FontFamily.medium,
    textDecorationLine: 'underline',
  },
});
