/**
 * Palette NOX — alignée Figma (bleu accent, fond noir, typo blanche).
 * Les clés legacy (cyan, glow…) restent pour compatibilité ; primary = bleu Figma.
 */

export const Colors = {
  // === ACCENT PRINCIPAL (variables Figma : Primaire / Hover / Ombre) ===
  primary: '#2852E8',
  primaryDark: '#206ED1',
  primaryLight: '#81B9FF',

  /** RGB sans alpha — pour rgba(${Colors.primaryRgb}, 0.5) dans les styles */
  primaryRgb: '40, 82, 232',

  // Legacy cyberpunk (cyan) — conservé pour quelques accents optionnels
  cyan: '#2852E8',
  cyanDark: '#206ED1',
  cyanLight: '#81B9FF',

  // === FONDS (Figma : Background #0A0A09, Menu-Back #20201E) ===
  background: '#0A0A09',
  backgroundCard: 'rgba(32,32,30,0.55)',
  backgroundElevated: '#20201E',
  backgroundInput: 'rgba(255,255,255,0.08)',

  // === TEXTES (Figma : Secondaire #FEFEFD, Secondaire-2 #D9D9D9) ===
  text: '#FEFEFD',
  textSecondary: '#D9D9D9',
  textTertiary: 'rgba(217,217,217,0.5)',
  textMuted: 'rgba(217,217,217,0.35)',

  // === BORDURES ===
  border: 'rgba(40,82,232,0.35)',
  borderActive: 'rgba(40,82,232,0.55)',
  borderSubtle: 'rgba(254,254,253,0.16)',
  borderCyan: 'rgba(40,82,232,0.35)',
  /** Bordure de carte Figma : #FEFEFD à 0.5px */
  borderCard: '#FEFEFD',

  // === ÉTATS ===
  success: '#10b981',
  warning: '#f59e0b',
  error: '#EF4444',
  info: '#2852E8',

  // === OMBRES / GLOW (Figma : Ombre #206ED1, ombre carte #72C2F4) ===
  shadow: 'rgba(32,110,209,0.25)',
  glow: 'rgba(32,110,209,0.45)',
  glowCyan: 'rgba(32,110,209,0.35)',
  /** Ombre portée des cartes Figma : 2px 5px 8px rgba(114,194,244,0.5) */
  cardShadow: 'rgba(114,194,244,0.5)',
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
