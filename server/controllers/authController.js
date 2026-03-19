/**
 * Contrôleur pour l'authentification (inscription, connexion, wallet)
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { validateRegistration, validateLogin, normalizeEmail, validatePassword, isValidEmail, parseBirthDate, validateAge } = require('../utils/validation');
const { sanitizeUser, handleError, sendError, sendSuccess } = require('../utils/helpers');

const prisma = new PrismaClient();
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../utils/jwtConfig');

/**
 * Inscription d'un nouvel utilisateur
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
const register = async (req, res) => {
  try {
    const { email, username, password, birthDate: birthDateStr, certifiedMajor } = req.body ?? {};

    // Log pour diagnostic (email masqué, domaine visible)
    const domain = (email && typeof email === 'string' && email.includes('@')) ? email.split('@')[1] : '?';
    const masked = email ? `${String(email).slice(0, 2)}***@${domain}` : '?';
    console.log('[register] Tentative inscription:', { emailMasked: masked, username: username?.slice(0, 8) + '***' });

    // Valider les données d'inscription
    const validation = validateRegistration({ email, username, password });
    if (!validation.valid) {
      console.log('[register] Validation échouée:', validation.message);
      return sendError(res, validation.message, 400);
    }

    // Valider date de naissance et majorité
    if (!birthDateStr || !birthDateStr.trim()) {
      return sendError(res, 'La date de naissance est requise.', 400);
    }
    const parsed = parseBirthDate(birthDateStr.trim());
    if (!parsed.valid) {
      return sendError(res, parsed.message, 400);
    }
    const ageCheck = validateAge(parsed.date);
    if (!ageCheck.valid) {
      return sendError(res, ageCheck.message, 403);
    }
    if (!certifiedMajor) {
      return sendError(res, 'Vous devez certifier avoir 18 ans ou plus.', 400);
    }

    const { normalizedData } = validation;

    // Vérifier si l'email existe déjà
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: normalizedData.email },
    });

    if (existingUserByEmail) {
      console.log('[register] Email déjà utilisé:', masked);
      return sendError(res, 'Cet email ou pseudo est déjà utilisé.', 409);
    }

    // Vérifier si le pseudo existe déjà
    const existingUserByUsername = await prisma.user.findFirst({
      where: { username: normalizedData.username },
    });

    if (existingUserByUsername) {
      console.log('[register] Pseudo déjà utilisé');
      return sendError(res, 'Ce pseudo est déjà utilisé.', 409);
    }

    // Hasher le mot de passe et créer l'utilisateur
    const hashedPassword = await bcrypt.hash(normalizedData.password, 10);
    const newUser = await prisma.user.create({
      data: {
        email: normalizedData.email,
        username: normalizedData.username,
        password: hashedPassword,
        birthDate: parsed.date,
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

    console.log('[register] Compte créé:', masked);
    return sendSuccess(res, {
      message: 'Compte créé avec succès.',
      user: sanitizeUser(newUser),
      token: token,
    }, 201);
  } catch (error) {
    console.error('[register] Erreur:', error.message, error.code);
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
      // Sinon, chercher par pseudo (username) - insensible à la casse (PostgreSQL)
      const usernameSearch = email.trim();
      user = await prisma.user.findFirst({
        where: {
          username: { equals: usernameSearch, mode: 'insensitive' },
        },
      });
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
 * Mot de passe oublié: envoie un code par email
 * @route POST /api/auth/forgot-password
 * body: { email }
 */
const forgotPassword = async (req, res) => {
  try {
    const emailRaw = req.body?.email;
    const email = typeof emailRaw === 'string' ? normalizeEmail(emailRaw) : '';
    // Ne jamais révéler si l'email existe ou non
    const genericOk = () =>
      sendSuccess(res, { message: 'Si un compte existe, un code de réinitialisation a été envoyé.' });

    if (!email || !isValidEmail(email)) {
      return genericOk();
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) return genericOk();

    const crypto = require('crypto');
    const { sendMail } = require('../utils/mailer');
    const salt = (process.env.AUTH_CODE_SALT || '').trim();
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const codeHash = crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCodeHash: codeHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    const subject = 'Nox — Réinitialisation du mot de passe';
    const text = `Ton code de réinitialisation est: ${code}\n\nIl expire dans 15 minutes.`;
    const html = `<p>Ton code de réinitialisation est:</p><h2>${code}</h2><p>Il expire dans 15 minutes.</p>`;

    try {
      await sendMail({ to: user.email, subject, text, html });
    } catch (e) {
      if (process.env.NODE_ENV === 'production') {
        return sendError(res, 'Impossible d\'envoyer l\'email. Vérifie la config serveur.', 500);
      }
      const debugCode = process.env.DEBUG_LOGS === 'true' ? code : undefined;
      return sendSuccess(res, { message: 'Code généré (email non envoyé).', debugCode });
    }

    return genericOk();
  } catch (e) {
    handleError(e, res, 'Erreur lors du mot de passe oublié.');
  }
};

/**
 * Réinitialiser le mot de passe avec code
 * @route POST /api/auth/reset-password
 * body: { email, code, newPassword, confirmPassword? }
 */
const resetPassword = async (req, res) => {
  try {
    const emailRaw = req.body?.email;
    const codeRaw = req.body?.code;
    const newPassword = req.body?.newPassword;
    const confirmPassword = req.body?.confirmPassword ?? newPassword;

    const email = typeof emailRaw === 'string' ? normalizeEmail(emailRaw) : '';
    const code = typeof codeRaw === 'string' ? codeRaw.trim() : '';

    if (!email || !isValidEmail(email)) {
      return sendError(res, 'Email invalide.', 400);
    }
    if (!/^\d{6}$/.test(code)) {
      return sendError(res, 'Code invalide (6 chiffres).', 400);
    }
    if (newPassword !== confirmPassword) {
      return sendError(res, 'La confirmation ne correspond pas.', 400);
    }
    const pwd = validatePassword(newPassword);
    if (!pwd.valid) return sendError(res, pwd.message, 400);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordResetCodeHash: true,
        passwordResetExpiresAt: true,
      },
    });
    if (!user || !user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
      return sendError(res, 'Code invalide ou expiré.', 400);
    }
    const expiresAt = new Date(user.passwordResetExpiresAt);
    if (expiresAt.getTime() < Date.now()) {
      return sendError(res, 'Code expiré.', 400);
    }

    const crypto = require('crypto');
    const salt = (process.env.AUTH_CODE_SALT || '').trim();
    const codeHash = crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
    if (codeHash !== user.passwordResetCodeHash) {
      return sendError(res, 'Code invalide.', 400);
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return sendSuccess(res, { message: 'Mot de passe réinitialisé.' });
  } catch (e) {
    handleError(e, res, 'Erreur reset password.');
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
  forgotPassword,
  resetPassword,
};

