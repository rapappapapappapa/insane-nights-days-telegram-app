/**
 * Tokens layout NOX (Figma) — espacements, rayons, hauteurs composants.
 */

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
  // Figma : Bouton-Principal entièrement arrondi (h40 / r40)
  button: 999,
  // Figma : barre de recherche / inputs r25
  input: 25,
  // Figma : cartes r25 (bordure 0.5 #FEFEFD + ombre bleutée)
  card: 25,
};

export const Layout = {
  screenPaddingHorizontal: 20,
  buttonHeight: 52,
  inputHeight: 52,
  headerHeight: 56,
};

export default { Spacing, Radius, Layout };
