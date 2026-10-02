const prisma = require('../lib/prisma');
const { isLikelyExpoPushToken } = require('../utils/expoPush');

module.exports = function registerPushRoutes(app, deps) {
  const { authenticateToken } = deps;

  /**
   * Enregistrer ou mettre à jour le token Expo Push pour l’utilisateur courant.
   * Body: { token: string, platform?: string }
   */
  app.post('/api/push/register', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { token, platform } = req.body || {};
      const t = typeof token === 'string' ? token.trim() : '';
      if (!t || !isLikelyExpoPushToken(t)) {
        return res.status(400).json({ success: false, message: 'Token Expo push invalide.' });
      }
      await prisma.pushDevice.upsert({
        where: { expoPushToken: t },
        create: {
          userId,
          expoPushToken: t,
          platform: typeof platform === 'string' ? platform.slice(0, 32) : null,
        },
        update: {
          userId,
          platform: typeof platform === 'string' ? platform.slice(0, 32) : null,
        },
      });
      res.json({ success: true });
    } catch (e) {
      console.error('[push/register]', e);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /**
   * Retirer un token (déconnexion ou désactivation des notifications sur l’appareil).
   * Body: { token: string }
   */
  app.post('/api/push/unregister', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const t = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
      if (!t) {
        return res.status(400).json({ success: false, message: 'token requis.' });
      }
      await prisma.pushDevice.deleteMany({
        where: { userId, expoPushToken: t },
      });
      res.json({ success: true });
    } catch (e) {
      console.error('[push/unregister]', e);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });
};
