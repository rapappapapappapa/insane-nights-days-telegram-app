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
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    minHeight: 44,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textTertiary,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: Spacing.xxl,
  },
  logoWrap: {
    marginBottom: Spacing.xxxl,
  },
  headline: {
    fontFamily: FontFamily.black,
    fontSize: 32,
    lineHeight: 40,
    color: Colors.text,
    textAlign: 'left',
  },
  bottomDock: {
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  skipLink: {
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
  },
  skipText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textTertiary,
  },
});
