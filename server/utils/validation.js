/**
 * Utilitaires de validation pour les données utilisateur
 */

/**
 * Supprime les caractères invisibles (zero-width, RTL, etc.) pouvant venir du clavier mobile
 * @param {string} str - Chaîne à nettoyer
 * @returns {string}
 */
const sanitizeInvisibleChars = (str = '') =>
  String(str).replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2060]/g, '');

/**
 * Normalise un email en minuscules, supprime espaces et caractères invisibles
 * @param {string} email - L'email à normaliser
 * @returns {string} L'email normalisé
 */
const normalizeEmail = (email = '') => sanitizeInvisibleChars(email).trim().toLowerCase();

/**
 * Vérifie si une chaîne est un email valide
 * @param {string} email - L'email à valider
 * @returns {boolean} True si l'email est valide
 */
const isValidEmail = (email = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizeInvisibleChars(email).trim());

/**
 * Valide un mot de passe
 * @param {string} password - Le mot de passe à valider
 * @param {number} minLength - Longueur minimale (défaut: 6)
 * @returns {{valid: boolean, message?: string}} Résultat de la validation
 */
const validatePassword = (password, minLength = 6) => {
  if (!password) {
    return { valid: false, message: 'Le mot de passe est requis.' };
  }
  if (password.length < minLength) {
    return { valid: false, message: `Le mot de passe doit contenir au moins ${minLength} caractères.` };
  }
  return { valid: true };
};

/**
 * Valide les données d'inscription
 * @param {Object} data - Les données à valider
 * @param {string} data.email - L'email
 * @param {string} data.username - Le nom d'utilisateur
 * @param {string} data.password - Le mot de passe
 * @returns {{valid: boolean, message?: string, normalizedData?: Object}} Résultat de la validation
 */
const validateRegistration = (data) => {
  const { email, username, password } = data ?? {};

  if (!email || !username || !password) {
    return { valid: false, message: 'Email, pseudo et mot de passe sont requis.' };
  }

  let finalEmail = sanitizeInvisibleChars(email).trim();
  const finalUsername = sanitizeInvisibleChars(username).trim();

  // Si c'est un email (contient @), valider le format
  if (finalEmail.includes('@')) {
    if (!isValidEmail(finalEmail)) {
      return { valid: false, message: 'Email invalide.' };
    }
    finalEmail = normalizeEmail(finalEmail);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return passwordValidation;
  }

  return {
    valid: true,
    normalizedData: {
      email: finalEmail,
      username: finalUsername,
      password,
    },
  };
};

/**
 * Valide les données de connexion
 * @param {Object} data - Les données à valider
 * @param {string} data.email - L'email ou username
 * @param {string} data.password - Le mot de passe
 * @returns {{valid: boolean, message?: string}} Résultat de la validation
 */
const validateLogin = (data) => {
  const { email, password } = data ?? {};

  if (!email || !password) {
    return { valid: false, message: 'Email et mot de passe sont requis.' };
  }

  return { valid: true };
};

module.exports = {
  sanitizeInvisibleChars,
  normalizeEmail,
  isValidEmail,
  validatePassword,
  validateRegistration,
  validateLogin,
};

