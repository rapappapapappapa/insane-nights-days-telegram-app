import { StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Spacing } from '../../constants/theme';

export const ROLE_THEMES = {
  dj: '#7B5CFF',
  booker: '#FF8A4C',
  venue: '#3DD6A8',
  community: '#4DA3FF',
  prestataire: '#9CA3AF',
};

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
    paddingTop: Spacing.md,
    minHeight: 44,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  title: {
    fontFamily: FontFamily.black,
    fontSize: 32,
    lineHeight: 38,
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
    rowGap: Spacing.md,
  },
});
