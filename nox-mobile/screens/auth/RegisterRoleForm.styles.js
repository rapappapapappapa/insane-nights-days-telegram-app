import { StyleSheet } from 'react-native';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Radius, Spacing } from '../../constants/theme';

export const registerRoleStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.xxxl * 2,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: 'left',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: 'left',
    lineHeight: 22,
  },
  form: {
    marginBottom: Spacing.lg,
  },
  submitBtn: {
    marginTop: Spacing.md,
    minHeight: Layout.buttonHeight,
  },
  hint: {
    marginTop: -Spacing.md,
    marginBottom: Spacing.md,
    fontSize: 12,
    lineHeight: 18,
  },
  legalBlock: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  legalTitle: {
    marginBottom: Spacing.xs,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Layout.inputHeight,
    backgroundColor: Colors.backgroundInput,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  selectValue: {
    flex: 1,
  },
  selectPlaceholder: {
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '70%',
    borderTopWidth: 1,
    borderTopColor: primaryAlpha(0.35),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: primaryAlpha(0.15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptions: {
    padding: Spacing.md,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  modalOptionSelected: {
    backgroundColor: primaryAlpha(0.18),
    borderColor: Colors.primary,
  },
  suggestions: {
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: Radius.input,
    marginTop: -Spacing.md,
    marginBottom: Spacing.lg,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  suggestionText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
});
