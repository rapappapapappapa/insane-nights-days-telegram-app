import { StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { Layout, Radius, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
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
  contentContainer: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.xxxl * 2,
  },
  inputContainer: {
    marginBottom: Spacing.sm,
  },
  contentInput: {
    minHeight: 180,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  charCount: {
    textAlign: 'right',
    marginTop: -Spacing.md,
    marginBottom: Spacing.xl,
    fontSize: 12,
  },
  imageSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  selectImageButton: {
    marginBottom: Spacing.md,
  },
  imageUrlInput: {
    marginBottom: Spacing.md,
  },
  imagePreview: {
    position: 'relative',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  removeImageButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radius.md,
    padding: 2,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.lg,
  },
  uploadingText: {
    marginTop: Spacing.md,
  },
  publishButton: {
    marginTop: Spacing.md,
  },
  errorGuard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
    gap: Spacing.xl,
  },
  errorGuardText: {
    textAlign: 'center',
  },
  errorGuardButton: {
    minWidth: 160,
  },
  disabledFieldHint: {
    opacity: 0.55,
  },
});
