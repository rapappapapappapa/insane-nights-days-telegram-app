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

module.exports = router;

