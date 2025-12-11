/**
 * Palette de couleurs Cyberpunk pour Insane Nights & Days
 * 
 * Stratégie : Rouge utilisé avec modération pour éviter l'effet "alerte"
 * - Rouge principal : accent énergique mais contrôlé
 * - Cyan : couleur secondaire cyberpunk classique
 * - Noir : fond principal
 */

export const Colors = {
  // === COULEURS PRINCIPALES ===
  
  // Option 1 : Rouge Cyberpunk Moderne (recommandé - moins agressif)
  primary: '#FF1744',        // Rouge plus vif et visible (#E63946 était trop sombre)
  primaryDark: '#C41E3A',     // Rouge sombre pour les états hover/pressed
  primaryLight: '#FF6B7A',   // Rouge clair pour les accents subtils
  
  // Option 2 : Rouge Magenta Cyberpunk (alternative)
  // primary: '#FF006E',      // Rose cyberpunk très énergique
  // primaryDark: '#C41E3A',
  // primaryLight: '#FF4D8A',
  
  // Option 3 : Rouge Bordeaux (plus sobre)
  // primary: '#B91C1C',      // Rouge bordeaux, plus discret
  // primaryDark: '#991B1B',
  // primaryLight: '#DC2626',
  
  // === COULEURS CYBERPUNK ===
  cyan: '#00F5FF',           // Cyan cyberpunk classique
  cyanDark: '#00CED1',       // Cyan sombre
  cyanLight: '#7FFFD4',      // Cyan clair
  
  // === FONDS ===
  background: '#0b0b0e',     // Noir principal (inchangé)
  backgroundCard: '#1a1a1f', // Gris foncé pour cartes (inchangé)
  backgroundElevated: '#25252a', // Gris plus clair pour éléments élevés
  
  // === TEXTES ===
  text: '#ffffff',           // Blanc principal
  textSecondary: 'rgba(255,255,255,0.7)', // Gris clair
  textTertiary: 'rgba(255,255,255,0.5)',  // Gris moyen
  textMuted: 'rgba(255,255,255,0.3)',     // Gris foncé
  
  // === BORDURES ===
  border: 'rgba(255,23,68,0.5)',      // Bordure avec rouge principal (plus visible)
  borderActive: 'rgba(255,23,68,0.7)', // Bordure active (encore plus visible)
  borderCyan: 'rgba(0,245,255,0.3)',   // Bordure cyan optionnelle
  
  // === ÉTATS ===
  success: '#10b981',        // Vert (inchangé)
  warning: '#f59e0b',       // Orange/jaune (pour warnings)
  error: '#EF4444',         // Rouge d'erreur (différent du primary)
  info: '#00F5FF',          // Cyan pour infos
  
  // === OMBRES ET EFFETS ===
  shadow: 'rgba(255,23,68,0.3)',       // Ombre rouge subtile
  glow: 'rgba(255,23,68,0.6)',         // Glow cyberpunk (plus visible)
  glowCyan: 'rgba(0,245,255,0.3)',     // Glow cyan optionnel
};

/**
 * Fonction helper pour obtenir une couleur avec opacité
 */
export const withOpacity = (color, opacity) => {
  // Si c'est déjà rgba, extraire le RGB
  if (color.startsWith('rgba')) {
    const rgb = color.match(/\d+/g).slice(0, 3).join(',');
    return `rgba(${rgb},${opacity})`;
  }
  // Si c'est hex, convertir en rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
};

/**
 * Palette alternative : si tu veux tester différentes options
 */
export const ColorPalettes = {
  // Palette actuelle (orange)
  orange: {
    primary: '#FF1744',
    primaryDark: '#C41E3A',
    primaryLight: '#FF6B7A',
  },
  
  // Palette cyberpunk rouge (recommandée)
  cyberpunkRed: {
    primary: '#E63946',
    primaryDark: '#C41E3A',
    primaryLight: '#FF6B7A',
  },
  
  // Palette cyberpunk magenta
  cyberpunkMagenta: {
    primary: '#FF006E',
    primaryDark: '#C41E3A',
    primaryLight: '#FF4D8A',
  },
  
  // Palette cyberpunk bordeaux (plus sobre)
  cyberpunkBordeaux: {
    primary: '#B91C1C',
    primaryDark: '#991B1B',
    primaryLight: '#DC2626',
  },
};

export default Colors;

