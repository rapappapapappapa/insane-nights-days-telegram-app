/**
 * Ajout d’un billet à Apple Wallet / Google Wallet.
 * L’app demande des liens (authentifiée), puis ouvre le .pkpass dans Safari (lien signé 10 min)
 * ou le lien Google Wallet : aucun module natif nécessaire.
 */
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { JWT_SECRET } = require('../utils/jwtConfig');
const { tierLabelForTicket } = require('../utils/ticketTierDisplay');
const {
  isAppleWalletConfigured,
  isGoogleWalletConfigured,
  buildApplePass,
  buildGoogleSaveUrl,
} = require('../utils/walletPass');

const LINK_TTL = '10m';

async function loadWalletTicket(ticketId, userId) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          time: true,
          status: true,
          location: true,
          ticketTiers: true,
          venue: { select: { venueName: true, address: true, city: true } },
        },
      },
      user: { select: { communities: { select: { pseudo: true, prenom: true, nom: true }, take: 1 } } },
    },
  });
  if (!ticket || ticket.userId !== userId) return { error: 404, message: 'Billet introuvable.' };
  if (ticket.status !== 'valid' && ticket.status !== 'used') {
    return { error: 400, message: 'Ce billet est en revente : il ne peut pas être ajouté au Wallet.' };
  }
  if (!ticket.event || ticket.event.status === 'FINISHED') {
    return { error: 400, message: 'L’événement est terminé.' };
  }
  const c = ticket.user?.communities?.[0];
  return {
    data: {
      id: ticket.id,
      qrCode: ticket.qrCode,
      eventId: ticket.eventId,
      title: ticket.event.title,
      ymd: ticket.event.date.toISOString().split('T')[0],
      time: ticket.event.time,
      venueName: ticket.event.venue?.venueName || null,
      address:
        [ticket.event.venue?.address, ticket.event.venue?.city].filter(Boolean).join(', ') || ticket.event.location || null,
      tierLabel: tierLabelForTicket(ticket.event.ticketTiers, ticket.tierId),
      holderName: c?.pseudo || [c?.prenom, c?.nom].filter(Boolean).join(' ') || null,
    },
  };
}

module.exports = function registerWalletRoutes(app, deps) {
  const { authenticateToken } = deps;

  /** @route GET /api/tickets/:ticketId/wallet → { apple: { available, url }, google: { available, url } } */
  app.get('/api/tickets/:ticketId/wallet', authenticateToken, async (req, res) => {
    try {
      const { data, error, message } = await loadWalletTicket(req.params.ticketId, req.user.id);
      if (error) return res.status(error).json({ success: false, message });

      let appleUrl = null;
      const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
      if (isAppleWalletConfigured() && publicUrl) {
        const t = jwt.sign({ purpose: 'wallet', ticketId: data.id, userId: req.user.id }, JWT_SECRET, { expiresIn: LINK_TTL });
        appleUrl = `${publicUrl}/api/wallet/apple/${data.id}.pkpass?t=${encodeURIComponent(t)}`;
      }
      const googleUrl = isGoogleWalletConfigured() ? buildGoogleSaveUrl(data) : null;
      return res.json({
        success: true,
        apple: { available: !!appleUrl, url: appleUrl },
        google: { available: !!googleUrl, url: googleUrl },
      });
    } catch (error) {
      console.error('Erreur liens wallet:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /** Téléchargement du .pkpass (lien signé, ouvert dans Safari). */
  app.get('/api/wallet/apple/:ticketId.pkpass', async (req, res) => {
    try {
      if (!isAppleWalletConfigured()) return res.status(503).send('Apple Wallet indisponible.');
      let claims;
      try {
        claims = jwt.verify(String(req.query.t || ''), JWT_SECRET);
      } catch {
        return res.status(401).send('Lien expiré : relance « Ajouter à Apple Wallet » depuis l’app.');
      }
      if (claims.purpose !== 'wallet' || claims.ticketId !== req.params.ticketId) {
        return res.status(401).send('Lien invalide.');
      }
      const { data, error, message } = await loadWalletTicket(req.params.ticketId, claims.userId);
      if (error) return res.status(error).send(message);
      const buffer = await buildApplePass(data);
      res.set({
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="nox-${data.id.slice(0, 8)}.pkpass"`,
        'Cache-Control': 'no-store',
      });
      return res.send(buffer);
    } catch (error) {
      console.error('Erreur pkpass:', error?.message || error);
      return res.status(500).send('Erreur lors de la création du pass.');
    }
  });
};
