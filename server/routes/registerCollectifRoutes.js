/**
 * Collectifs : réglages d’adhésion (booker `Collectif`), adhésion des profils Communauté via HelloAsso.
 * Les adhésions gratuites s’activent directement ; les payantes exigent HelloAsso configuré côté serveur.
 */
const prisma = require('../lib/prisma');
const { isHelloAssoConfigured, createCheckoutIntent, getCheckoutIntent } = require('../utils/helloAsso');
const { notifyUsers } = require('../utils/appNotifications');

const MEMBERSHIP_DAYS = 365;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,99}$/;
const APP_SCHEME = process.env.APP_URL_SCHEME || 'com.insanenightsdays.mobile';

function isCollectif(booker) {
  return String(booker?.bookerType || '').toLowerCase() === 'collectif';
}

function collectifName(booker) {
  return booker.companyName || booker.pseudo || `${booker.prenom || ''} ${booker.nom || ''}`.trim() || 'Collectif';
}

/** Statut effectif : une adhésion active dont la date est passée est expirée. */
function effectiveMembership(m) {
  if (!m) return null;
  const expired = m.status === 'ACTIVE' && m.validUntil && new Date(m.validUntil).getTime() < Date.now();
  return {
    id: m.id,
    status: expired ? 'EXPIRED' : m.status,
    amountCents: m.amountCents,
    validUntil: m.validUntil,
  };
}

function adhesionInfo(booker) {
  const priceCents = booker.helloAssoAdhesionPriceCents ?? 0;
  const enabled = isCollectif(booker) && booker.helloAssoAdhesionEnabled;
  const payable = priceCents === 0 || (!!booker.helloAssoOrganizationSlug && isHelloAssoConfigured());
  return {
    enabled,
    available: enabled && payable,
    label: booker.helloAssoAdhesionLabel || 'Adhésion annuelle',
    priceCents,
  };
}

async function activateMembership(membership, booker, { orderId = null } = {}) {
  const activated = await prisma.collectifMembership.updateMany({
    where: { id: membership.id, status: { not: 'ACTIVE' } },
    data: {
      status: 'ACTIVE',
      helloAssoOrderId: orderId,
      validUntil: new Date(Date.now() + MEMBERSHIP_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  if (activated.count > 0) {
    const community = await prisma.userCommunity.findUnique({
      where: { id: membership.communityId },
      select: { userId: true },
    });
    notifyUsers([community?.userId], {
      category: 'system',
      type: 'collectif_joined',
      title: `Tu es membre de ${collectifName(booker)}`,
      body: 'Ton adhésion est active pour un an.',
      imageUrl: booker.profileImage,
      dedupeKey: `collectif-joined:${membership.id}:${new Date().getFullYear()}`,
    });
  }
}

/** Vérifie auprès de HelloAsso qu’un checkout est payé (les webhooks HA ne sont pas signés). */
async function syncMembership(membershipId) {
  const membership = await prisma.collectifMembership.findUnique({
    where: { id: membershipId },
    include: { booker: true },
  });
  if (!membership || membership.status === 'ACTIVE' || !membership.checkoutIntentId) return membership;
  if (!isHelloAssoConfigured() || !membership.booker.helloAssoOrganizationSlug) return membership;
  const intent = await getCheckoutIntent(membership.booker.helloAssoOrganizationSlug, membership.checkoutIntentId);
  if (intent?.order?.id) {
    await activateMembership(membership, membership.booker, { orderId: String(intent.order.id) });
  }
  return prisma.collectifMembership.findUnique({ where: { id: membershipId } });
}

module.exports = function registerCollectifRoutes(app, deps) {
  const { authenticateToken } = deps;

  const publicBase = () => (process.env.PUBLIC_URL || '').replace(/\/$/, '');

  /** @route GET /api/booker/me/collectif-settings */
  app.get('/api/booker/me/collectif-settings', authenticateToken, async (req, res) => {
    try {
      const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
      if (!booker) return res.status(404).json({ success: false, message: 'Profil organisateur introuvable.' });
      const membersCount = await prisma.collectifMembership.count({
        where: { bookerId: booker.id, status: 'ACTIVE', validUntil: { gt: new Date() } },
      });
      return res.json({
        success: true,
        isCollectif: isCollectif(booker),
        helloAssoConfigured: isHelloAssoConfigured(),
        settings: {
          organizationSlug: booker.helloAssoOrganizationSlug || '',
          enabled: booker.helloAssoAdhesionEnabled,
          label: booker.helloAssoAdhesionLabel || '',
          priceCents: booker.helloAssoAdhesionPriceCents ?? 0,
        },
        membersCount,
      });
    } catch (error) {
      console.error('Erreur réglages collectif:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /** @route PUT /api/booker/me/collectif-settings body: { organizationSlug, enabled, label, priceEuros } */
  app.put('/api/booker/me/collectif-settings', authenticateToken, async (req, res) => {
    try {
      const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
      if (!booker) return res.status(404).json({ success: false, message: 'Profil organisateur introuvable.' });
      if (!isCollectif(booker)) {
        return res.status(403).json({ success: false, message: 'Réservé aux organisateurs de type Collectif.' });
      }
      const { organizationSlug, enabled, label, priceEuros } = req.body ?? {};
      const slug = String(organizationSlug || '').trim().toLowerCase();
      if (slug && !SLUG_RE.test(slug)) {
        return res.status(400).json({
          success: false,
          message: 'Slug HelloAsso invalide (minuscules, chiffres et tirets, comme dans l’adresse de ta page HelloAsso).',
        });
      }
      const price = Number(String(priceEuros ?? 0).replace(',', '.'));
      if (!Number.isFinite(price) || price < 0 || price > 1000) {
        return res.status(400).json({ success: false, message: 'Prix d’adhésion invalide (0 à 1000 €).' });
      }
      const priceCents = Math.round(price * 100);
      if (priceCents > 0 && priceCents < 50) {
        return res.status(400).json({ success: false, message: 'Adhésion payante : 0,50 € minimum (ou 0 € pour gratuite).' });
      }
      if (enabled && priceCents > 0 && !slug) {
        return res.status(400).json({ success: false, message: 'Renseigne le slug HelloAsso pour une adhésion payante.' });
      }
      await prisma.userBooker.update({
        where: { id: booker.id },
        data: {
          helloAssoOrganizationSlug: slug || null,
          helloAssoAdhesionEnabled: !!enabled,
          helloAssoAdhesionLabel: String(label || '').trim().slice(0, 80) || null,
          helloAssoAdhesionPriceCents: priceCents,
        },
      });
      return res.json({ success: true, message: 'Réglages enregistrés.' });
    } catch (error) {
      console.error('Erreur maj réglages collectif:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /** Adhérents actifs du collectif connecté. @route GET /api/booker/me/collectif-members */
  app.get('/api/booker/me/collectif-members', authenticateToken, async (req, res) => {
    try {
      const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id }, select: { id: true } });
      if (!booker) return res.status(404).json({ success: false, message: 'Profil organisateur introuvable.' });
      const rows = await prisma.collectifMembership.findMany({
        where: { bookerId: booker.id, status: 'ACTIVE', validUntil: { gt: new Date() } },
        orderBy: { updatedAt: 'desc' },
        take: 200,
        include: { community: { select: { id: true, pseudo: true, profileImage: true } } },
      });
      return res.json({
        success: true,
        members: rows.map((m) => ({
          id: m.id,
          communityId: m.community.id,
          pseudo: m.community.pseudo || 'Membre',
          profileImage: m.community.profileImage,
          validUntil: m.validUntil,
        })),
      });
    } catch (error) {
      console.error('Erreur adhérents collectif:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /** Offre d’adhésion d’un collectif + mon adhésion. @route GET /api/collectifs/:bookerId/membership */
  app.get('/api/collectifs/:bookerId/membership', authenticateToken, async (req, res) => {
    try {
      const booker = await prisma.userBooker.findUnique({ where: { id: req.params.bookerId } });
      if (!booker) return res.status(404).json({ success: false, message: 'Collectif introuvable.' });
      const community = await prisma.userCommunity.findFirst({ where: { userId: req.user.id }, select: { id: true } });
      const membership = community
        ? await prisma.collectifMembership.findUnique({
            where: { communityId_bookerId: { communityId: community.id, bookerId: booker.id } },
          })
        : null;
      return res.json({ success: true, adhesion: adhesionInfo(booker), membership: effectiveMembership(membership) });
    } catch (error) {
      console.error('Erreur adhésion collectif:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /**
   * Rejoindre un collectif. Gratuit → actif tout de suite. Payant → `redirectUrl` HelloAsso.
   * @route POST /api/collectifs/:bookerId/join
   */
  app.post('/api/collectifs/:bookerId/join', authenticateToken, async (req, res) => {
    try {
      const booker = await prisma.userBooker.findUnique({ where: { id: req.params.bookerId } });
      if (!booker) return res.status(404).json({ success: false, message: 'Collectif introuvable.' });
      const adhesion = adhesionInfo(booker);
      if (!adhesion.enabled) {
        return res.status(400).json({ success: false, message: 'Ce collectif ne propose pas d’adhésion via NOX.' });
      }
      if (!adhesion.available) {
        return res.status(503).json({
          success: false,
          code: 'HELLOASSO_NOT_READY',
          message: 'Les adhésions payantes arrivent bientôt sur NOX.',
        });
      }
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { email: true, communities: { select: { id: true, prenom: true, nom: true }, take: 1 } },
      });
      const community = user?.communities?.[0];
      if (!community) {
        return res.status(403).json({ success: false, message: 'Crée ton profil Communauté pour rejoindre un collectif.' });
      }

      const existing = await prisma.collectifMembership.findUnique({
        where: { communityId_bookerId: { communityId: community.id, bookerId: booker.id } },
      });
      if (effectiveMembership(existing)?.status === 'ACTIVE') {
        return res.status(400).json({ success: false, message: 'Tu es déjà membre de ce collectif.' });
      }
      const membership = await prisma.collectifMembership.upsert({
        where: { communityId_bookerId: { communityId: community.id, bookerId: booker.id } },
        create: { communityId: community.id, bookerId: booker.id, amountCents: adhesion.priceCents },
        update: { status: 'PENDING', amountCents: adhesion.priceCents, checkoutIntentId: null, helloAssoOrderId: null },
      });

      if (adhesion.priceCents === 0) {
        await activateMembership(membership, booker);
        return res.json({ success: true, status: 'ACTIVE', message: `Bienvenue chez ${collectifName(booker)} !` });
      }

      if (!publicBase()) {
        return res.status(500).json({ success: false, message: 'PUBLIC_URL manquante côté serveur.' });
      }
      const back = `${publicBase()}/api/collectifs/helloasso/return?membershipId=${membership.id}`;
      const intent = await createCheckoutIntent(booker.helloAssoOrganizationSlug, {
        amountCents: adhesion.priceCents,
        itemName: `${adhesion.label} — ${collectifName(booker)}`,
        backUrl: `${back}&result=back`,
        errorUrl: `${back}&result=error`,
        returnUrl: `${back}&result=return`,
        payer: { firstName: community.prenom, lastName: community.nom, email: user.email },
        metadata: { membershipId: membership.id, source: 'nox' },
      });
      await prisma.collectifMembership.update({
        where: { id: membership.id },
        data: { checkoutIntentId: String(intent.id) },
      });
      return res.json({
        success: true,
        status: 'PENDING',
        membershipId: membership.id,
        redirectUrl: intent.redirectUrl,
        returnUrlPrefix: `${APP_SCHEME}://collectif-return`,
      });
    } catch (error) {
      console.error('Erreur adhésion collectif (join):', error?.message || error, error?.details || '');
      return res.status(500).json({ success: false, message: 'Impossible de démarrer l’adhésion.' });
    }
  });

  /** Vérifie le paiement au retour dans l’app. @route POST /api/collectifs/memberships/:membershipId/sync */
  app.post('/api/collectifs/memberships/:membershipId/sync', authenticateToken, async (req, res) => {
    try {
      const community = await prisma.userCommunity.findFirst({ where: { userId: req.user.id }, select: { id: true } });
      const membership = await prisma.collectifMembership.findUnique({ where: { id: req.params.membershipId } });
      if (!membership || membership.communityId !== community?.id) {
        return res.status(404).json({ success: false, message: 'Adhésion introuvable.' });
      }
      const synced = await syncMembership(membership.id);
      return res.json({ success: true, membership: effectiveMembership(synced) });
    } catch (error) {
      console.error('Erreur sync adhésion:', error?.message || error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /** Retour navigateur HelloAsso → vérification puis redirection vers l’app. */
  app.get('/api/collectifs/helloasso/return', async (req, res) => {
    const membershipId = String(req.query.membershipId || '');
    let status = 'PENDING';
    try {
      if (membershipId) status = (await syncMembership(membershipId))?.status || 'PENDING';
    } catch (error) {
      console.error('Erreur retour HelloAsso:', error?.message || error);
    }
    res.redirect(
      302,
      `${APP_SCHEME}://collectif-return?membershipId=${encodeURIComponent(membershipId)}&status=${status}&result=${encodeURIComponent(String(req.query.result || ''))}`,
    );
  });

  /** Notifications HelloAsso (Order / Payment). Le statut est revérifié via l’API avant activation. */
  app.post('/api/webhooks/helloasso', async (req, res) => {
    try {
      const membershipId = req.body?.metadata?.membershipId || req.body?.data?.meta?.membershipId;
      if (membershipId) await syncMembership(String(membershipId));
    } catch (error) {
      console.error('[HELLOASSO WEBHOOK]', error?.message || error);
    }
    res.json({ received: true });
  });

  /** Mes adhésions (profil Communauté). @route GET /api/user/me/collectif-memberships */
  app.get('/api/user/me/collectif-memberships', authenticateToken, async (req, res) => {
    try {
      const community = await prisma.userCommunity.findFirst({ where: { userId: req.user.id }, select: { id: true } });
      if (!community) return res.json({ success: true, memberships: [] });
      const rows = await prisma.collectifMembership.findMany({
        where: { communityId: community.id, status: { in: ['ACTIVE', 'EXPIRED'] } },
        include: { booker: { select: { id: true, companyName: true, pseudo: true, nom: true, prenom: true, profileImage: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      return res.json({
        success: true,
        memberships: rows.map((m) => ({
          ...effectiveMembership(m),
          bookerId: m.booker.id,
          collectifName: collectifName(m.booker),
          profileImage: m.booker.profileImage,
        })),
      });
    } catch (error) {
      console.error('Erreur mes adhésions:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });
};

module.exports.effectiveMembership = effectiveMembership;
module.exports.adhesionInfo = adhesionInfo;
