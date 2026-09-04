/**
 * Booker : amis Communauté, staff événement, scan QR billets.
 */
const prisma = require('../../lib/prisma');

module.exports = function registerBookerStaffRoutes(app, deps) {
  const { authenticateToken } = deps;

/** GET /api/booker/friends - Liste des amis Communauté du booker (status ACCEPTED) */
app.get('/api/booker/friends', authenticateToken, async (req, res) => {
  try {
    const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
    if (!booker) return res.status(404).json({ success: false, message: 'Profil Booker requis.' });
    const friends = await prisma.bookerCommunityFriend.findMany({
      where: { bookerId: booker.id, status: 'ACCEPTED' },
      include: { community: { select: { id: true, pseudo: true, profileImage: true } } },
    });
    res.json({
      success: true,
      friends: friends.map((f) => ({
        id: f.id,
        communityId: f.community.id,
        pseudo: f.community.pseudo || 'Anonyme',
        profileImage: f.community.profileImage,
      })),
    });
  } catch (e) {
    console.error('Erreur liste amis booker:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** POST /api/booker/friends - Envoyer une demande d'ami (body: { communityId }) */
app.post('/api/booker/friends', authenticateToken, async (req, res) => {
  try {
    const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
    if (!booker) return res.status(404).json({ success: false, message: 'Profil Booker requis.' });
    const { communityId } = req.body ?? {};
    if (!communityId) return res.status(400).json({ success: false, message: 'communityId requis.' });
    const existing = await prisma.bookerCommunityFriend.findUnique({
      where: { bookerId_communityId: { bookerId: booker.id, communityId } },
    });
    if (existing) {
      if (existing.status === 'ACCEPTED') return res.status(400).json({ success: false, message: 'Déjà amis.' });
      if (existing.status === 'PENDING') return res.status(400).json({ success: false, message: 'Demande déjà envoyée.' });
      return res.status(400).json({ success: false, message: 'Demande précédemment refusée.' });
    }
    const community = await prisma.userCommunity.findUnique({ where: { id: communityId } });
    if (!community) return res.status(404).json({ success: false, message: 'Profil Communauté introuvable.' });
    await prisma.bookerCommunityFriend.create({
      data: { bookerId: booker.id, communityId, status: 'PENDING' },
    });
    res.json({ success: true, message: 'Demande envoyée.' });
  } catch (e) {
    console.error('Erreur envoi demande ami booker:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** GET /api/community/staff-events - Événements où l'utilisateur (Communauté) est staff */
app.get('/api/community/staff-events', authenticateToken, async (req, res) => {
  try {
    const community = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    if (!community) return res.json({ success: true, events: [] });
    const staffAssignments = await prisma.eventStaff.findMany({
      where: { communityId: community.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            location: true,
            image: true,
            status: true,
            sold: true,
            capacity: true,
          },
        },
      },
    });
    const events = staffAssignments
      .filter((s) => s.event)
      .map((s) => ({ ...s.event, date: s.event.date?.toISOString?.() ?? s.event.date }));
    res.json({ success: true, events });
  } catch (e) {
    console.error('Erreur staff-events:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** GET /api/community/booker-friend-requests - Demandes reçues (côté Communauté) */
app.get('/api/community/booker-friend-requests', authenticateToken, async (req, res) => {
  try {
    const community = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    if (!community) return res.status(404).json({ success: false, message: 'Profil Communauté requis.' });
    const requests = await prisma.bookerCommunityFriend.findMany({
      where: { communityId: community.id, status: 'PENDING' },
      include: { booker: { select: { id: true, pseudo: true, profileImage: true } } },
    });
    res.json({
      success: true,
      requests: requests.map((r) => ({
        id: r.id,
        bookerId: r.booker.id,
        pseudo: r.booker.pseudo || 'Organisateur',
        profileImage: r.booker.profileImage,
      })),
    });
  } catch (e) {
    console.error('Erreur demandes amis booker:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** PUT /api/booker/friends/:id/respond - Accepter ou refuser (body: { accept: true|false }) */
app.put('/api/booker/friends/:id/respond', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { accept } = req.body ?? {};
    const community = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    if (!community) return res.status(404).json({ success: false, message: 'Profil Communauté requis.' });
    const link = await prisma.bookerCommunityFriend.findUnique({ where: { id } });
    if (!link || link.communityId !== community.id) return res.status(404).json({ success: false, message: 'Demande introuvable.' });
    if (link.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Demande déjà traitée.' });
    await prisma.bookerCommunityFriend.update({
      where: { id },
      data: { status: accept ? 'ACCEPTED' : 'DECLINED' },
    });
    res.json({ success: true, message: accept ? 'Demande acceptée.' : 'Demande refusée.' });
  } catch (e) {
    console.error('Erreur réponse demande ami:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** GET /api/events/:eventId/staff - Liste du staff (booker ou staff) */
app.get('/api/events/:eventId/staff', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { booker: true, eventStaff: { include: { community: { select: { id: true, pseudo: true, profileImage: true } } } } },
    });
    if (!event) return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    const isBooker = event.booker?.userId === req.user.id;
    const myCommunity = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    const isStaff = myCommunity && event.eventStaff.some((s) => s.communityId === myCommunity.id);
    if (!isBooker && !isStaff) return res.status(403).json({ success: false, message: 'Accès refusé.' });
    res.json({
      success: true,
      staff: event.eventStaff.map((s) => ({
        communityId: s.community.id,
        pseudo: s.community.pseudo || 'Staff',
        profileImage: s.community.profileImage,
        role: s.role,
      })),
    });
  } catch (e) {
    console.error('Erreur liste staff:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** POST /api/events/:eventId/staff - Ajouter un staff (booker uniquement, community doit être ami) */
app.post('/api/events/:eventId/staff', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { communityId, role = 'STAFF_SCAN' } = req.body ?? {};
    if (!communityId) return res.status(400).json({ success: false, message: 'communityId requis.' });
    const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
    if (!booker) return res.status(404).json({ success: false, message: 'Profil Booker requis.' });
    const event = await prisma.event.findFirst({ where: { id: eventId, bookerId: booker.id } });
    if (!event) return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    const isFriend = await prisma.bookerCommunityFriend.findUnique({
      where: { bookerId_communityId: { bookerId: booker.id, communityId } },
    });
    if (!isFriend || isFriend.status !== 'ACCEPTED') {
      return res.status(400).json({ success: false, message: 'Seuls vos amis Communauté peuvent être ajoutés comme staff.' });
    }
    await prisma.eventStaff.upsert({
      where: { eventId_communityId: { eventId, communityId } },
      create: { eventId, communityId, role, addedByBookerId: booker.id },
      update: { role },
    });
    res.json({ success: true, message: 'Staff ajouté.' });
  } catch (e) {
    console.error('Erreur ajout staff:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** DELETE /api/events/:eventId/staff/:communityId */
app.delete('/api/events/:eventId/staff/:communityId', authenticateToken, async (req, res) => {
  try {
    const { eventId, communityId } = req.params;
    const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
    if (!booker) return res.status(404).json({ success: false, message: 'Profil Booker requis.' });
    const event = await prisma.event.findFirst({ where: { id: eventId, bookerId: booker.id } });
    if (!event) return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    await prisma.eventStaff.deleteMany({ where: { eventId, communityId } });
    res.json({ success: true, message: 'Staff retiré.' });
  } catch (e) {
    console.error('Erreur retrait staff:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** POST /api/events/:eventId/scan-ticket - Scanner un billet (body: { qrCode } ou { data } du QR) */
app.post('/api/events/:eventId/scan-ticket', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    let qrCode = req.body?.qrCode ?? req.body?.data;
    if (!qrCode && typeof req.body === 'string') qrCode = req.body;
    if (!qrCode) return res.status(400).json({ success: false, message: 'qrCode requis.' });
    // Si le QR contient du JSON (format mobile), extraire qrCode
    if (typeof qrCode === 'object' && qrCode.qrCode) qrCode = qrCode.qrCode;
    if (typeof qrCode === 'string' && qrCode.startsWith('{')) {
      try {
        const parsed = JSON.parse(qrCode);
        qrCode = parsed.qrCode || parsed.data || qrCode;
      } catch {}
    }
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { booker: true, eventStaff: true },
    });
    if (!event) return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    const isBooker = event.booker?.userId === req.user.id;
    const myCommunity = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    const isStaff = myCommunity && event.eventStaff.some((s) => s.communityId === myCommunity.id && s.role === 'STAFF_SCAN');
    if (!isBooker && !isStaff) return res.status(403).json({ success: false, message: 'Seul l\'organisateur ou le staff peut scanner.' });
    // Fenêtre de scan : même jour UTC, OU ONGOING, OU SCAN_TICKET_ALLOW_ANY_DAY (explicite), OU défaut Railway si var absente, OU scanTestSecret
    const eventDate = new Date(event.date);
    const now = new Date();
    const sameDay =
      eventDate.getUTCFullYear() === now.getUTCFullYear() &&
      eventDate.getUTCMonth() === now.getUTCMonth() &&
      eventDate.getUTCDate() === now.getUTCDate();
    const rawAllowAnyDay = process.env.SCAN_TICKET_ALLOW_ANY_DAY;
    const deployedOnRailway = Boolean(
      process.env.RAILWAY_PUBLIC_DOMAIN ||
        process.env.RAILWAY_ENVIRONMENT ||
        process.env.RAILWAY_SERVICE_NAME,
    );
    const scanTicketAllowAnyDay =
      rawAllowAnyDay !== undefined && String(rawAllowAnyDay).trim() !== ''
        ? String(rawAllowAnyDay).toLowerCase() === 'true'
        : deployedOnRailway;
    // Phase de test : même effet que ALLOW_ANY_DAY si le client envoie scanTestSecret identique à SCAN_TICKET_TEST_SECRET (≥ 8 car.).
    const serverTestSecret = process.env.SCAN_TICKET_TEST_SECRET;
    const clientTestSecret = req.body?.scanTestSecret;
    const allowByTestSecret =
      typeof serverTestSecret === 'string' &&
      serverTestSecret.length >= 8 &&
      typeof clientTestSecret === 'string' &&
      clientTestSecret === serverTestSecret;
    const allowScanByWindow =
      scanTicketAllowAnyDay || allowByTestSecret || event.status === 'ONGOING' || sameDay;
    if (!allowScanByWindow) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Le scan des billets n\'est autorisé que le jour de l\'événement (ou pendant l\'événement une fois commencé).',
      });
    }
    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        event: { select: { id: true, title: true } },
        user: {
          select: {
            username: true,
            communities: { select: { pseudo: true, prenom: true, nom: true }, take: 1 },
          },
        },
      },
    });
    if (!ticket) return res.json({ success: false, valid: false, message: 'Billet introuvable.' });
    if (ticket.eventId !== eventId) return res.json({ success: false, valid: false, message: 'Ce billet n\'est pas pour cet événement.' });
    if (ticket.status === 'used') return res.json({ success: false, valid: false, message: 'Billet déjà utilisé.' });
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'used', scannedAt: new Date() },
    });
    const c = ticket.user?.communities?.[0];
    let holderDisplayName = c?.pseudo || '';
    if (!holderDisplayName) {
      const full = [c?.prenom, c?.nom].filter(Boolean).join(' ').trim();
      holderDisplayName = full || '';
    }
    if (!holderDisplayName) holderDisplayName = ticket.user?.username || 'Participant';
    res.json({
      success: true,
      valid: true,
      message: 'Billet validé.',
      ticket: {
        id: ticket.id,
        eventTitle: ticket.event.title,
        holderDisplayName,
        entered: true,
      },
    });
  } catch (e) {
    console.error('Erreur scan ticket:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
};
