/**
 * Collectifs : adhésions gérées sur HelloAsso (booker `Collectif`).
 * Le collectif crée ses formules et tarifs sur HelloAsso ; NOX lit le formulaire, l’affiche,
 * ouvre la page HelloAsso pour payer, puis retrouve l’adhésion par l’email du membre.
 */
const prisma = require('../lib/prisma');
const {
  isHelloAssoConfigured,
  membershipFormUrl,
  parseMembershipFormUrl,
  getMembershipForm,
  listMembershipOrders,
  findOrderForEmail,
  membershipValidUntil,
} = require('../utils/helloAsso');
const { notifyUsers } = require('../utils/appNotifications');

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,149}$/;
const ORDERS_LOOKBACK_MS = 400 * 24 * 60 * 60 * 1000;

function isCollectif(booker) {
  return String(booker?.bookerType || '').toLowerCase() === 'collectif';
}

function collectifName(booker) {
  return booker.companyName || booker.pseudo || `${booker.prenom || ''} ${booker.nom || ''}`.trim() || 'Collectif';
}

/** Adhésion en cours de validité (sans date de fin = illimitée). */
const activeMembershipWhere = () => ({
  status: 'ACTIVE',
  OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
});

/** Statut effectif : une adhésion active dont la date est passée est expirée. */
function effectiveMembership(m) {
  if (!m) return null;
  const expired = m.status === 'ACTIVE' && m.validUntil && new Date(m.validUntil).getTime() < Date.now();
  return {
    id: m.id,
    status: expired ? 'EXPIRED' : m.status,
    amountCents: m.amountCents,
    tierLabel: m.tierLabel || null,
    validUntil: m.validUntil,
  };
}

/**
 * `enabled` : le collectif a ouvert ses adhésions sur NOX.
 * `tracked` : NOX peut lire les commandes HelloAsso et afficher le badge « Membre ».
 */
function adhesionInfo(booker) {
  const hasForm = !!booker.helloAssoOrganizationSlug && !!booker.helloAssoAdhesionFormSlug;
  const enabled = isCollectif(booker) && !!booker.helloAssoAdhesionEnabled && hasForm;
  return {
    enabled,
    tracked: enabled && isHelloAssoConfigured(),
    url: hasForm ? membershipFormUrl(booker.helloAssoOrganizationSlug, booker.helloAssoAdhesionFormSlug) : null,
  };
}

/** Formules lues sur HelloAsso ; liste vide si l’API n’est pas disponible. */
async function loadForm(booker, options) {
  if (!isHelloAssoConfigured() || !booker.helloAssoOrganizationSlug || !booker.helloAssoAdhesionFormSlug) return null;
  try {
    return await getMembershipForm(booker.helloAssoOrganizationSlug, booker.helloAssoAdhesionFormSlug, options);
  } catch (error) {
    console.error('[HelloAsso] formulaire illisible', booker.id, error?.message || error);
    return null;
  }
}

async function activateMembership(membership, booker, { orderId, amountCents, tierLabel, validUntil }) {
  const activated = await prisma.collectifMembership.updateMany({
    where: {
      id: membership.id,
      OR: [{ status: { not: 'ACTIVE' } }, { helloAssoOrderId: null }, { helloAssoOrderId: { not: orderId } }],
    },
    data: { status: 'ACTIVE', helloAssoOrderId: orderId, amountCents, tierLabel, validUntil },
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
      body: tierLabel ? `Ton adhésion « ${tierLabel} » est active.` : 'Ton adhésion est active.',
      imageUrl: booker.profileImage,
      dedupeKey: `collectif-joined:${membership.id}:${orderId}`,
    });
  }
}

/**
 * Cherche sur HelloAsso une adhésion payée avec l’email du compte NOX et l’enregistre.
 * @returns {Promise<object|null>} l’adhésion NOX à jour
 */
async function syncMembershipFromHelloAsso({ booker, communityId, email }) {
  if (!isHelloAssoConfigured() || !booker.helloAssoOrganizationSlug || !booker.helloAssoAdhesionFormSlug) return null;
  const orders = await listMembershipOrders(booker.helloAssoOrganizationSlug, booker.helloAssoAdhesionFormSlug, {
    from: Date.now() - ORDERS_LOOKBACK_MS,
  });
  const found = findOrderForEmail(orders, email);
  const where = { communityId_bookerId: { communityId, bookerId: booker.id } };
  if (!found) return prisma.collectifMembership.findUnique({ where });
  const form = await loadForm(booker);
  const membership = await prisma.collectifMembership.upsert({
    where,
    create: { communityId, bookerId: booker.id, amountCents: found.amountCents },
    update: {},
  });
  await activateMembership(membership, booker, {
    orderId: found.orderId,
    amountCents: found.amountCents,
    tierLabel: found.tierLabel,
    validUntil: membershipValidUntil(form, found.date),
  });
  return prisma.collectifMembership.findUnique({ where });
}

module.exports = function registerCollectifRoutes(app, deps) {
  const { authenticateToken } = deps;

  /** @route GET /api/booker/me/collectif-settings */
  app.get('/api/booker/me/collectif-settings', authenticateToken, async (req, res) => {
    try {
      const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
      if (!booker) return res.status(404).json({ success: false, message: 'Profil organisateur introuvable.' });
      const membersCount = await prisma.collectifMembership.count({
        where: { bookerId: booker.id, ...activeMembershipWhere() },
      });
      const form = await loadForm(booker, { fresh: true });
      return res.json({
        success: true,
        isCollectif: isCollectif(booker),
        helloAssoConfigured: isHelloAssoConfigured(),
        settings: {
          organizationSlug: booker.helloAssoOrganizationSlug || '',
          formSlug: booker.helloAssoAdhesionFormSlug || '',
          formUrl: adhesionInfo(booker).url || '',
          enabled: booker.helloAssoAdhesionEnabled,
        },
        form,
        membersCount,
      });
    } catch (error) {
      console.error('Erreur réglages collectif:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /** @route PUT /api/booker/me/collectif-settings body: { formUrl, enabled } */
  app.put('/api/booker/me/collectif-settings', authenticateToken, async (req, res) => {
    try {
      const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
      if (!booker) return res.status(404).json({ success: false, message: 'Profil organisateur introuvable.' });
      if (!isCollectif(booker)) {
        return res.status(403).json({ success: false, message: 'Réservé aux organisateurs de type Collectif.' });
      }
      const { formUrl, enabled } = req.body ?? {};
      const raw = String(formUrl || '').trim();
      const parsed = raw ? parseMembershipFormUrl(raw) : null;
      if (raw && (!parsed || !SLUG_RE.test(parsed.organizationSlug) || !SLUG_RE.test(parsed.formSlug))) {
        return res.status(400).json({
          success: false,
          message:
            'Lien invalide. Copie l’adresse de ta page d’adhésion HelloAsso, du type helloasso.com/associations/mon-collectif/adhesions/adhesion-2026.',
        });
      }
      if (enabled && !parsed) {
        return res.status(400).json({ success: false, message: 'Colle le lien de ton formulaire d’adhésion HelloAsso.' });
      }
      if (parsed && isHelloAssoConfigured()) {
        try {
          await getMembershipForm(parsed.organizationSlug, parsed.formSlug, { fresh: true });
        } catch (error) {
          if (error?.status === 404) {
            return res.status(400).json({ success: false, message: 'Formulaire introuvable sur HelloAsso. Vérifie le lien.' });
          }
          console.error('[HelloAsso] vérification formulaire', error?.message || error);
        }
      }
      await prisma.userBooker.update({
        where: { id: booker.id },
        data: {
          helloAssoOrganizationSlug: parsed?.organizationSlug || null,
          helloAssoAdhesionFormSlug: parsed?.formSlug || null,
          helloAssoAdhesionEnabled: !!enabled,
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
        where: { bookerId: booker.id, ...activeMembershipWhere() },
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
          tierLabel: m.tierLabel || null,
          validUntil: m.validUntil,
        })),
      });
    } catch (error) {
      console.error('Erreur adhérents collectif:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /** Formules HelloAsso d’un collectif + mon adhésion. @route GET /api/collectifs/:bookerId/membership */
  app.get('/api/collectifs/:bookerId/membership', authenticateToken, async (req, res) => {
    try {
      const booker = await prisma.userBooker.findUnique({ where: { id: req.params.bookerId } });
      if (!booker) return res.status(404).json({ success: false, message: 'Collectif introuvable.' });
      const adhesion = adhesionInfo(booker);
      const form = adhesion.enabled ? await loadForm(booker) : null;
      const community = await prisma.userCommunity.findFirst({ where: { userId: req.user.id }, select: { id: true } });
      const membership = community
        ? await prisma.collectifMembership.findUnique({
            where: { communityId_bookerId: { communityId: community.id, bookerId: booker.id } },
          })
        : null;
      return res.json({
        success: true,
        adhesion: {
          ...adhesion,
          title: form?.title || 'Adhésion',
          url: form?.url || adhesion.url,
          tiers: form?.tiers || [],
        },
        membership: effectiveMembership(membership),
      });
    } catch (error) {
      console.error('Erreur adhésion collectif:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /**
   * Vérifie sur HelloAsso si le membre connecté a adhéré (email du compte NOX).
   * @route POST /api/collectifs/:bookerId/membership/sync
   */
  app.post('/api/collectifs/:bookerId/membership/sync', authenticateToken, async (req, res) => {
    try {
      const booker = await prisma.userBooker.findUnique({ where: { id: req.params.bookerId } });
      if (!booker || !adhesionInfo(booker).enabled) {
        return res.status(404).json({ success: false, message: 'Collectif introuvable.' });
      }
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { email: true, communities: { select: { id: true }, take: 1 } },
      });
      const communityId = user?.communities?.[0]?.id;
      if (!communityId) {
        return res.status(403).json({ success: false, message: 'Crée ton profil Communauté pour rejoindre un collectif.' });
      }
      if (!isHelloAssoConfigured()) {
        return res.json({ success: true, tracked: false, membership: null });
      }
      const membership = await syncMembershipFromHelloAsso({ booker, communityId, email: user.email });
      return res.json({ success: true, tracked: true, membership: effectiveMembership(membership) });
    } catch (error) {
      console.error('Erreur sync adhésion:', error?.message || error, error?.details || '');
      return res.status(500).json({ success: false, message: 'Vérification HelloAsso impossible pour le moment.' });
    }
  });

  /**
   * Notifications HelloAsso (Order). Le contenu n’est pas signé : on ne s’en sert que pour savoir
   * quel collectif et quel email revérifier via l’API.
   */
  app.post('/api/webhooks/helloasso', async (req, res) => {
    res.json({ received: true });
    try {
      const data = req.body?.data || {};
      if (req.body?.eventType !== 'Order' || data.formType !== 'Membership') return;
      const organizationSlug = String(data.organizationSlug || '').toLowerCase();
      const formSlug = String(data.formSlug || '').toLowerCase();
      const email = String(data.payer?.email || '').trim();
      if (!organizationSlug || !formSlug || !email) return;
      const booker = await prisma.userBooker.findFirst({
        where: { helloAssoOrganizationSlug: organizationSlug, helloAssoAdhesionFormSlug: formSlug },
      });
      if (!booker) return;
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { email: true, communities: { select: { id: true }, take: 1 } },
      });
      const communityId = user?.communities?.[0]?.id;
      if (!communityId) return;
      await syncMembershipFromHelloAsso({ booker, communityId, email: user.email });
    } catch (error) {
      console.error('[HELLOASSO WEBHOOK]', error?.message || error);
    }
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
