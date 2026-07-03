/**
 * Typographie NOX — Satoshi (Figma).
 * Utiliser NoxText ou ces presets dans les StyleSheet.
 */

export const FontFamily = {
  regular: 'Satoshi-Regular',
  medium: 'Satoshi-Medium',
  bold: 'Satoshi-Bold',
  black: 'Satoshi-Black',
  variable: 'Satoshi-Variable',
};

/** Presets Figma : Titre, Titre secondaire, Description, Bouton… */
export const Typography = {
  title: {
    fontFamily: FontFamily.black,
    fontSize: 28,
    lineHeight: 34,
    color: '#ffffff',
  },
  titleSecondary: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
    color: '#ffffff',
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.85)',
  },
  secondary: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.55)',
  },
  button: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#000000',
  },
  buttonSecondary: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    lineHeight: 18,
    color: '#ffffff',
  },
  form: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: '#ffffff',
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.7)',
  },
};

/** Fusionne une variante typo avec un style custom */
export function textStyle(variant, extra = {}) {
  return { ...Typography[variant], ...extra };
}

export default Typography;
