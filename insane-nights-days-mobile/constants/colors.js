/**
 * Palette NOX — alignée Figma (bleu accent, fond noir, typo blanche).
 * Les clés legacy (cyan, glow…) restent pour compatibilité ; primary = bleu Figma.
 */

export const Colors = {
  // === ACCENT PRINCIPAL (bleu Figma) ===
  primary: '#4DA3FF',
  primaryDark: '#2E7FD4',
  primaryLight: '#7BB8FF',

  /** RGB sans alpha — pour rgba(${Colors.primaryRgb}, 0.5) dans les styles */
  primaryRgb: '77, 163, 255',

  // Legacy cyberpunk (cyan) — conservé pour quelques accents optionnels
  cyan: '#4DA3FF',
  cyanDark: '#2E7FD4',
  cyanLight: '#7BB8FF',

  // === FONDS ===
  background: '#000000',
  backgroundCard: '#14141a',
  backgroundElevated: '#1c1c22',
  backgroundInput: 'rgba(255,255,255,0.08)',

  // === TEXTES ===
  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.72)',
  textTertiary: 'rgba(255,255,255,0.5)',
  textMuted: 'rgba(255,255,255,0.35)',

  // === BORDURES ===
  border: 'rgba(77,163,255,0.35)',
  borderActive: 'rgba(77,163,255,0.55)',
  borderSubtle: 'rgba(255,255,255,0.12)',
  borderCyan: 'rgba(77,163,255,0.35)',

  // === ÉTATS ===
  success: '#10b981',
  warning: '#f59e0b',
  error: '#EF4444',
  info: '#4DA3FF',

  // === OMBRES / GLOW ===
  shadow: 'rgba(77,163,255,0.25)',
  glow: 'rgba(77,163,255,0.45)',
  glowCyan: 'rgba(77,163,255,0.35)',
};

export const withOpacity = (color, opacity) => {
  if (color.startsWith('rgba')) {
    const rgb = color.match(/\d+/g).slice(0, 3).join(',');
    return `rgba(${rgb},${opacity})`;
  }
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
};

/** rgba(primary, alpha) — pratique dans StyleSheet */
export const primaryAlpha = (alpha) => `rgba(${Colors.primaryRgb},${alpha})`;

export const ColorPalettes = {
  noxBlue: {
    primary: Colors.primary,
    primaryDark: Colors.primaryDark,
    primaryLight: Colors.primaryLight,
  },
};

export default Colors;
