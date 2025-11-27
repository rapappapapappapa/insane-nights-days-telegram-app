/**
 * Contrôleur pour l'authentification (inscription, connexion, wallet)
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { validateRegistration, validateLogin, normalizeEmail } = require('../utils/validation');
const { sanitizeUser, handleError, sendError, sendSuccess } = require('../utils/helpers');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'insane-nights-days-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Inscription d'un nouvel utilisateur
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
const register = async (req, res) => {
  try {
    const { email, username, password } = req.body ?? {};

    // Valider les données d'inscription
    const validation = validateRegistration({ email, username, password });
    if (!validation.valid) {
      return sendError(res, validation.message, 400);
    }

    const { normalizedData } = validation;

    // Vérifier si l'email existe déjà
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: normalizedData.email },
    });

    if (existingUserByEmail) {
      return sendError(res, 'Cet email ou pseudo est déjà utilisé.', 409);
    }

    // Vérifier si le pseudo existe déjà
    const existingUserByUsername = await prisma.user.findFirst({
      where: { username: normalizedData.username },
    });

    if (existingUserByUsername) {
      return sendError(res, 'Ce pseudo est déjà utilisé.', 409);
    }

    // Hasher le mot de passe et créer l'utilisateur
    const hashedPassword = await bcrypt.hash(normalizedData.password, 10);
    const newUser = await prisma.user.create({
      data: {
        email: normalizedData.email,
        username: normalizedData.username,
        password: hashedPassword,
        score: 100,
        level: 1,
      },
    });

    // Générer un JWT
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return sendSuccess(res, {
      message: 'Compte créé avec succès.',
      user: sanitizeUser(newUser),
      token: token,
    }, 201);
  } catch (error) {
    handleError(error, res, "Erreur lors de l'inscription.");
  }
};

/**
 * Connexion d'un utilisateur (par email ou username)
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    // Valider les données de connexion
    const validation = validateLogin({ email, password });
    if (!validation.valid) {
      return sendError(res, 'Email/pseudo et mot de passe sont requis.', 400);
    }

    let user = null;

    // Si c'est un email (contient @), chercher par email
    if (email.includes('@')) {
      const normalizedEmail = normalizeEmail(email);
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    } else {
      // Sinon, chercher par pseudo (username)
      const usernameSearch = email.trim();
      
      // Chercher d'abord avec la casse exacte
      user = await prisma.user.findFirst({
        where: { username: usernameSearch },
      });
      
      // Si pas trouvé, essayer avec une recherche insensible à la casse
      if (!user) {
        try {
          const users = await prisma.$queryRaw`
            SELECT * FROM User WHERE LOWER(username) = LOWER(${usernameSearch})
          `;
          if (users && users.length > 0) {
            user = users[0];
          }
        } catch (queryError) {
          console.error('[LOGIN] Erreur requête brute:', queryError);
        }
      }
    }

    if (!user) {
      return sendError(res, 'Identifiants invalides.', 401);
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return sendError(res, 'Identifiants invalides.', 401);
    }

    // Générer un JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return sendSuccess(res, {
      message: 'Connexion réussie.',
      user: sanitizeUser(user),
      token: token,
    });
  } catch (error) {
    handleError(error, res, 'Erreur lors de la connexion.');
  }
};

/**
 * Connexion via wallet TON (mock pour l'instant)
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
const connectWallet = async (req, res) => {
  try {
    const { walletAddress, username } = req.body;

    if (!walletAddress) {
      return sendError(res, 'Adresse wallet requise.', 400);
    }

    // Pour l'instant, on simule une connexion wallet
    // Dans une vraie implémentation, on vérifierait la signature du wallet
    let user = await prisma.user.findFirst({
      where: { email: walletAddress },
    });

    if (!user) {
      // Créer un utilisateur avec l'adresse wallet comme email
      user = await prisma.user.create({
        data: {
          email: walletAddress,
          username: username || `Wallet_${walletAddress.slice(0, 8)}`,
          password: '', // Pas de mot de passe pour les wallets
          score: 100,
          level: 1,
        },
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return sendSuccess(res, {
      message: 'Wallet connecté avec succès.',
      user: sanitizeUser(user),
      token: token,
    });
  } catch (error) {
    handleError(error, res, 'Erreur lors de la connexion wallet.');
  }
};

module.exports = {
  register,
  login,
  connectWallet,
};

