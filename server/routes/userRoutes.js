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
 * @route GET /api/user/community/profile
 * @desc Récupère le profil Communauté de l'utilisateur connecté
 * @access Private
 */
router.get('/community/profile', authenticateToken, userController.getCommunityProfile);

/**
 * @route PUT /api/user/community/profile
 * @desc Met à jour le profil Communauté (pseudo, genres)
 * @access Private
 */
router.put('/community/profile', authenticateToken, userController.updateCommunityProfile);

/**
 * @route GET /api/user/community/friends
 * @desc Liste des amis (Communauté)
 * @access Private
 */
router.get('/community/friends', authenticateToken, userController.getCommunityFriends);

/**
 * @route GET /api/user/community/friends/requests
 * @desc Demandes d'amis reçues
 * @access Private
 */
router.get('/community/friends/requests', authenticateToken, userController.getCommunityFriendRequests);

/**
 * @route POST /api/user/community/friends/request
 * @desc Envoyer une demande d'ami (body: { requestedCommunityId })
 * @access Private
 */
router.post('/community/friends/request', authenticateToken, userController.sendCommunityFriendRequest);

/**
 * @route PUT /api/user/community/friends/requests/:id
 * @desc Accepter/refuser une demande (body: { action: 'accept'|'decline' })
 * @access Private
 */
router.put('/community/friends/requests/:id', authenticateToken, userController.respondToCommunityFriendRequest);

/**
 * @route DELETE /api/user/community/friends/:id
 * @desc Retirer un ami
 * @access Private
 */
router.delete('/community/friends/:id', authenticateToken, userController.removeCommunityFriend);

/**
 * @route GET /api/user/venue/profile
 * @desc Récupère le profil Venue de l'utilisateur connecté
 * @access Private
 */
router.get('/venue/profile', authenticateToken, userController.getVenueProfile);

/**
 * @route PUT /api/user/venue/profile
 * @desc Met à jour le profil Venue (venueName, address)
 * @access Private
 */
router.put('/venue/profile', authenticateToken, userController.updateVenueProfile);

/**
 * @route GET /api/user/community/search
 * @desc Rechercher des profils Communauté par pseudo (?q=...)
 * @access Private
 */
router.get('/community/search', authenticateToken, userController.searchCommunities);

/**
 * @route GET /api/user/:userId
 * @desc Récupère les informations d'un utilisateur par son ID
 * @access Public
 * IMPORTANT: Cette route doit être EN DERNIER pour éviter de matcher /dj/profile
 * Note: Express matche les routes dans l'ordre, donc /dj/profile doit être avant /:userId
 */
router.get('/:userId', (req, res, next) => {
  // Éviter de matcher /dj comme userId (pour laisser passer /dj/profile)
  if (['dj', 'profiles', 'me', 'community', 'venue'].includes(req.params.userId)) {
    return res.status(404).json({ success: false, message: 'Route non trouvée' });
  }
  userController.getUserById(req, res, next);
});

module.exports = router;

