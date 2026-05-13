/**
 * Routes pour l'authentification
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @route POST /api/auth/register
 * @desc Inscription d'un nouvel utilisateur
 * @access Public
 */
router.post('/register', authController.register);

/**
 * @route POST /api/auth/login
 * @desc Connexion d'un utilisateur (email ou username)
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /api/auth/google
 * @desc Connexion / inscription OAuth Google (corps JSON : idToken + champs inscription si nouveau compte)
 */
router.post('/google', authController.googleAuth);

/**
 * @route POST /api/auth/forgot-password
 * @desc Envoie un code de réinitialisation par email
 * @access Public
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route POST /api/auth/reset-password
 * @desc Réinitialise le mot de passe avec code
 * @access Public
 */
router.post('/reset-password', authController.resetPassword);

module.exports = router;

