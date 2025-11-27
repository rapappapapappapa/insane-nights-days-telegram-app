/**
 * Middleware d'authentification JWT
 */

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'insane-nights-days-secret-key-change-in-production';

/**
 * Middleware pour vérifier le token JWT dans les requêtes
 * Ajoute les informations de l'utilisateur à req.user si le token est valide
 * 
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next() Express
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token d\'authentification requis.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Vérifier que l'utilisateur existe toujours dans la base de données
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    // Ajouter les infos utilisateur à la requête pour utilisation dans les routes
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expiré.' });
    }
    return res.status(403).json({ success: false, message: 'Token invalide.' });
  }
};

module.exports = {
  authenticateToken,
};

