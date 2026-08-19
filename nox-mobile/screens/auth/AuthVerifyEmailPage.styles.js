import { StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Spacing, Radius } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
  codeInput: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    letterSpacing: 12,
    textAlign: 'center',
    color: Colors.text,
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  debug: {
    marginTop: Spacing.lg,
    textAlign: 'center',
    color: Colors.primary,
  },
  loadingRow: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  skipHint: {
    marginTop: Spacing.sm,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
  },
  emailEditBlock: {
    marginTop: Spacing.lg,
  },
  emailInput: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
});
