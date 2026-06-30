import { StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xxxl,
  },
  slideBody: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headline: {
    fontFamily: FontFamily.black,
    fontSize: 26,
    lineHeight: 34,
    color: Colors.text,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.xxl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 22,
  },
  footer: {
    gap: Spacing.md,
  },
  skipLink: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
  },
  skipText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textTertiary,
  },
  backRow: {
    position: 'absolute',
    top: Spacing.xxxl + 8,
    left: Layout.screenPaddingHorizontal,
    zIndex: 2,
  },
  backText: {
    fontFamily: FontFamily.medium,
    fontSize: 22,
    color: Colors.textSecondary,
  },
});
