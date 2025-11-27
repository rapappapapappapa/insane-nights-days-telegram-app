/**
 * Fonctions utilitaires pour le backend
 */

/**
 * Nettoie les données utilisateur pour éviter d'exposer des informations sensibles
 * @param {Object} user - L'objet utilisateur à nettoyer
 * @returns {Object|null} L'utilisateur nettoyé ou null si l'utilisateur est invalide
 */
const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    score: user.score ?? 0,
    level: user.level ?? 1,
    activeProfileType: user.activeProfileType ?? null,
    createdAt: user.createdAt,
  };
};

/**
 * Gère les erreurs de manière standardisée
 * @param {Error} error - L'erreur à gérer
 * @param {Object} res - L'objet response Express
 * @param {string} defaultMessage - Message d'erreur par défaut
 * @param {number} defaultStatus - Code de statut HTTP par défaut (500)
 */
const handleError = (error, res, defaultMessage = 'Erreur serveur', defaultStatus = 500) => {
  console.error('Erreur:', error);
  res.status(defaultStatus).json({
    success: false,
    message: error.message || defaultMessage,
  });
};

/**
 * Réponse JSON standardisée pour succès
 * @param {Object} res - L'objet response Express
 * @param {Object} data - Les données à renvoyer
 * @param {number} status - Code de statut HTTP (défaut: 200)
 */
const sendSuccess = (res, data, status = 200) => {
  res.status(status).json({
    success: true,
    ...data,
  });
};

/**
 * Réponse JSON standardisée pour erreur
 * @param {Object} res - L'objet response Express
 * @param {string} message - Message d'erreur
 * @param {number} status - Code de statut HTTP (défaut: 400)
 */
const sendError = (res, message, status = 400) => {
  res.status(status).json({
    success: false,
    message,
  });
};

module.exports = {
  sanitizeUser,
  handleError,
  sendSuccess,
  sendError,
};

