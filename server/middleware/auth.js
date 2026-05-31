/**
 * Middleware d'authentification JWT
 */

const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { JWT_SECRET } = require('../utils/jwtConfig');

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

    // ✅ Modération: bloquer les comptes suspendus / bannis
    const status = user.status || 'ACTIVE';
    if (status === 'BANNED') {
      return res.status(403).json({ success: false, message: 'Compte banni.' });
    }
    if (status === 'SUSPENDED') {
      const until = user.suspendedUntil ? new Date(user.suspendedUntil) : null;
      if (until && until.getTime() > Date.now()) {
        return res.status(403).json({
          success: false,
          message: `Compte suspendu jusqu'au ${until.toISOString()}`,
          suspendedUntil: until.toISOString(),
        });
      }
      // Suspension expirée -> repasser actif (best-effort)
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { status: 'ACTIVE', suspendedUntil: null },
        });
      } catch (e) {
        // ignore
      }
    }

    // Ajouter les infos utilisateur à la requête pour utilisation dans les routes
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role || 'USER',
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expiré.' });
    }
    return res.status(403).json({ success: false, message: 'Token invalide.' });
  }
};

/**
 * Middleware admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Non authentifié.' });
  }
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Accès admin requis.' });
  }
  return next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
};

