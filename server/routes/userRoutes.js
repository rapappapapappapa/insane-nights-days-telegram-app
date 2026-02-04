/**
 * Routes pour la gestion des utilisateurs
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const userController = require('../controllers/userController');

// Middleware de débogage pour tracer les requêtes
router.use((req, res, next) => {
  if (process.env.DEBUG_LOGS === 'true') {
    console.log(`[userRoutes] ${req.method} ${req.path}`);
  }
  next();
});

/**
 * @route GET /api/user/profiles
 * @desc Récupère tous les profils d'un utilisateur
 * @access Private (nécessite authentification)
 */
router.get('/profiles', authenticateToken, userController.getUserProfiles);

/**
 * @route POST /api/user/switch-profile
 * @desc Bascule le profil actif d'un utilisateur
 * @access Private (nécessite authentification)
 */
router.post('/switch-profile', authenticateToken, userController.switchProfile);

/**
 * @route POST /api/user/change-password
 * @desc Change le mot de passe d'un utilisateur
 * @access Private (nécessite authentification)
 */
router.post('/change-password', authenticateToken, userController.changePassword);

/**
 * @route GET /api/user/me
 * @desc Récupère les informations de l'utilisateur connecté avec son dernier ticket
 * @access Private (nécessite authentification)
 */
router.get('/me', authenticateToken, userController.getCurrentUser);

/**
 * @route POST /api/user/me/email/verification/send
 * @desc Envoie un code de vérification email
 * @access Private
 */
router.post('/me/email/verification/send', authenticateToken, userController.sendEmailVerification);

/**
 * @route POST /api/user/me/email/verification/confirm
 * @desc Confirme la vérification email (code)
 * @access Private
 */
router.post('/me/email/verification/confirm', authenticateToken, userController.confirmEmailVerification);

/**
 * @route GET /api/user/dj/profile
 * @desc Récupère le profil DJ actif de l'utilisateur connecté
 * @access Private (nécessite authentification)
 * IMPORTANT: Cette route doit être AVANT /:userId pour éviter les conflits
 */
router.get('/dj/profile', authenticateToken, userController.getCurrentDjProfile);

/**
 * @route PUT /api/user/dj/profile
 * @desc Met à jour le profil DJ de l'utilisateur connecté
 * @access Private (nécessite authentification)
 * IMPORTANT: Cette route doit être AVANT /:userId pour éviter les conflits
 */
router.put('/dj/profile', authenticateToken, userController.updateDjProfile);

/**
 * @route GET /api/user/:userId
 * @desc Récupère les informations d'un utilisateur par son ID
 * @access Public
 * IMPORTANT: Cette route doit être EN DERNIER pour éviter de matcher /dj/profile
 * Note: Express matche les routes dans l'ordre, donc /dj/profile doit être avant /:userId
 */
router.get('/:userId', (req, res, next) => {
  // Éviter de matcher /dj comme userId (pour laisser passer /dj/profile)
  if (req.params.userId === 'dj' || req.params.userId === 'profiles' || req.params.userId === 'me') {
    return res.status(404).json({ success: false, message: 'Route non trouvée' });
  }
  userController.getUserById(req, res, next);
});

module.exports = router;

