import { StyleSheet } from 'react-native';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Radius, Spacing } from '../../constants/theme';

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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  backText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.primary,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  header: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  title: {
    fontFamily: FontFamily.black,
    fontSize: 28,
    lineHeight: 34,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  card: {
    width: '47%',
    minHeight: 152,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: primaryAlpha(0.25),
    backgroundColor: Colors.backgroundCard,
  },
  cardWide: {
    width: '100%',
  },
  cardAccent: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: primaryAlpha(0.06),
  },
  cardInner: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'flex-end',
  },
  cardEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
});
