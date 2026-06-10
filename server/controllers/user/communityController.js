/**
 * community — extrait de userController.js
 */

const prisma = require('../../lib/prisma');
const { handleError, sendError, sendSuccess } = require('../../utils/helpers');

/**
 * Récupère le profil public d'un profil Communauté par ID (pour voir un ami)
 * GET /api/user/community/:communityId
 * Retourne uniquement les infos publiques : pseudo, profileImage, bannerImage, genres
 */
const getCommunityProfileById = async (req, res) => {
  try {
    const { communityId } = req.params;
    if (!communityId) return sendError(res, 'communityId requis.', 400);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(communityId)) return sendError(res, 'Profil introuvable.', 404);
    const community = await prisma.userCommunity.findUnique({
      where: { id: communityId },
      select: { id: true, pseudo: true, profileImage: true, bannerImage: true, genres: true },
    });
    if (!community) return sendError(res, 'Profil introuvable.', 404);
    return sendSuccess(res, {
      profile: {
        id: community.id,
        pseudo: community.pseudo || 'Anonyme',
        profileImage: community.profileImage,
        bannerImage: community.bannerImage,
        genres: community.genres,
      },
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Récupère le profil Communauté de l'utilisateur connecté (premier profil)
 */
const getCommunityProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const community = await prisma.userCommunity.findFirst({
      where: { userId },
    });
    if (!community) {
      return sendError(res, 'Profil Communauté non trouvé.', 404);
    }
    return sendSuccess(res, {
      profile: {
        id: community.id,
        pseudo: community.pseudo,
        nom: community.nom,
        prenom: community.prenom,
        pays: community.pays,
        dateNaissance: community.dateNaissance,
        isnNumber: community.isnNumber,
        profileImage: community.profileImage,
        bannerImage: community.bannerImage,
        genres: community.genres,
      },
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Met à jour le profil Communauté (pseudo, genres)
 * Pseudo Communauté : unique pour la recherche d'amis (différent du artistName DJ)
 */
const updateCommunityProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pseudo, genres } = req.body ?? {};
    const community = await prisma.userCommunity.findFirst({
      where: { userId },
    });
    if (!community) {
      return sendError(res, 'Profil Communauté non trouvé.', 404);
    }
    const updateData = {};
    if (pseudo !== undefined) {
      const newPseudo = pseudo && String(pseudo).trim() ? String(pseudo).trim() : null;
      if (newPseudo) {
        const existing = await prisma.userCommunity.findFirst({
          where: {
            pseudo: newPseudo,
            id: { not: community.id },
          },
        });
        if (existing) {
          return sendError(res, 'Ce pseudo Communauté est déjà pris. Choisis-en un autre.', 409);
        }
      }
      updateData.pseudo = newPseudo;
    }
    if (genres !== undefined) updateData.genres = genres && String(genres).trim() ? String(genres).trim() : null;
    const updated = await prisma.userCommunity.update({
      where: { id: community.id },
      data: updateData,
    });
    return sendSuccess(res, {
      profile: {
        id: updated.id,
        pseudo: updated.pseudo,
        nom: updated.nom,
        prenom: updated.prenom,
        profileImage: updated.profileImage,
        bannerImage: updated.bannerImage,
        genres: updated.genres,
      },
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Récupère l'ID du profil Communauté de l'utilisateur connecté
 */
const getMyCommunityId = async (userId) => {
  const community = await prisma.userCommunity.findFirst({
    where: { userId },
  });
  return community?.id ?? null;
};

/**
 * Liste des amis (Communauté) - relations avec status ACCEPTED
 */
const getCommunityFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) {
      return sendError(res, 'Profil Communauté requis pour accéder aux amis.', 400);
    }
    const friendships = await prisma.communityFriend.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterCommunityId: myCommunityId },
          { requestedCommunityId: myCommunityId },
        ],
      },
      include: {
        requester: { select: { id: true, pseudo: true, profileImage: true } },
        requested: { select: { id: true, pseudo: true, profileImage: true } },
      },
    });
    const friends = friendships.map((f) => {
      const other = f.requesterCommunityId === myCommunityId ? f.requested : f.requester;
      return {
        id: f.id,
        communityId: other.id,
        pseudo: other.pseudo || 'Anonyme',
        profileImage: other.profileImage,
        since: f.createdAt,
      };
    });
    return sendSuccess(res, { friends });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Liste des demandes d'amis reçues (status PENDING)
 */
const getCommunityFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) {
      return sendError(res, 'Profil Communauté requis.', 400);
    }
    const requests = await prisma.communityFriend.findMany({
      where: {
        requestedCommunityId: myCommunityId,
        status: 'PENDING',
      },
      include: {
        requester: { select: { id: true, pseudo: true, profileImage: true } },
      },
    });
    const list = requests.map((r) => ({
      id: r.id,
      communityId: r.requester.id,
      pseudo: r.requester.pseudo || 'Anonyme',
      profileImage: r.requester.profileImage,
      createdAt: r.createdAt,
    }));
    return sendSuccess(res, { requests: list });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Envoyer une demande d'ami
 * body: { requestedCommunityId }
 */
const sendCommunityFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestedCommunityId } = req.body ?? {};
    if (!requestedCommunityId) {
      return sendError(res, 'requestedCommunityId requis.', 400);
    }
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) {
      return sendError(res, 'Profil Communauté requis.', 400);
    }
    if (requestedCommunityId === myCommunityId) {
      return sendError(res, 'Impossible de s\'ajouter soi-même.', 400);
    }
    const targetExists = await prisma.userCommunity.findUnique({
      where: { id: requestedCommunityId },
    });
    if (!targetExists) {
      return sendError(res, 'Profil Communauté introuvable.', 404);
    }
    const existing = await prisma.communityFriend.findUnique({
      where: {
        requesterCommunityId_requestedCommunityId: {
          requesterCommunityId: myCommunityId,
          requestedCommunityId,
        },
      },
    });
    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return sendError(res, 'Vous êtes déjà amis.', 400);
      }
      if (existing.status === 'PENDING') {
        return sendError(res, 'Demande déjà envoyée.', 400);
      }
      return sendError(res, 'Action impossible.', 400);
    }
    const reverse = await prisma.communityFriend.findUnique({
      where: {
        requesterCommunityId_requestedCommunityId: {
          requesterCommunityId: requestedCommunityId,
          requestedCommunityId: myCommunityId,
        },
      },
    });
    if (reverse) {
      if (reverse.status === 'PENDING') {
        return sendError(res, 'Cette personne vous a déjà envoyé une demande. Acceptez-la.', 400);
      }
      if (reverse.status === 'ACCEPTED') {
        return sendError(res, 'Vous êtes déjà amis.', 400);
      }
    }
    await prisma.communityFriend.create({
      data: {
        requesterCommunityId: myCommunityId,
        requestedCommunityId,
        status: 'PENDING',
      },
    });
    return sendSuccess(res, { message: 'Demande envoyée.' });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Accepter ou refuser une demande d'ami
 * body: { action: 'accept'|'decline' }
 */
const respondToCommunityFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { action } = req.body ?? {};
    if (!id || !action || !['accept', 'decline'].includes(action)) {
      return sendError(res, 'Paramètre id et action (accept|decline) requis.', 400);
    }
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) {
      return sendError(res, 'Profil Communauté requis.', 400);
    }
    const friendship = await prisma.communityFriend.findUnique({
      where: { id },
    });
    if (!friendship || friendship.requestedCommunityId !== myCommunityId || friendship.status !== 'PENDING') {
      return sendError(res, 'Demande introuvable ou déjà traitée.', 404);
    }
    if (action === 'accept') {
      await prisma.communityFriend.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      });
      return sendSuccess(res, { message: 'Demande acceptée.' });
    }
    await prisma.communityFriend.delete({
      where: { id },
    });
    return sendSuccess(res, { message: 'Demande refusée.' });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Retirer un ami
 */
const removeCommunityFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) {
      return sendError(res, 'Profil Communauté requis.', 400);
    }
    const friendship = await prisma.communityFriend.findUnique({
      where: { id },
    });
    if (!friendship || friendship.status !== 'ACCEPTED') {
      return sendError(res, 'Amitié introuvable.', 404);
    }
    const isMine = friendship.requesterCommunityId === myCommunityId || friendship.requestedCommunityId === myCommunityId;
    if (!isMine) {
      return sendError(res, 'Non autorisé.', 403);
    }
    await prisma.communityFriend.delete({
      where: { id },
    });
    return sendSuccess(res, { message: 'Ami retiré.' });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Vérifier si un pseudo Communauté est disponible
 * GET /api/user/community/pseudo/check?pseudo=xyz
 */
const checkCommunityPseudoAvailable = async (req, res) => {
  try {
    const userId = req.user.id;
    const pseudo = (req.query.pseudo || '').trim();
    if (!pseudo || pseudo.length < 2) {
      return sendSuccess(res, { available: false, message: 'Pseudo trop court (min. 2 caractères).' });
    }
    const myCommunity = await prisma.userCommunity.findFirst({
      where: { userId },
    });
    const existing = await prisma.userCommunity.findFirst({
      where: {
        pseudo,
        ...(myCommunity ? { id: { not: myCommunity.id } } : {}),
      },
    });
    return sendSuccess(res, { available: !existing });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Rechercher des profils Communauté par pseudo
 * GET ?q=pseudo
 * Le pseudo Communauté doit être défini (éditer le profil Communauté).
 */
const searchCommunities = async (req, res) => {
  try {
    const userId = req.user.id;
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return sendSuccess(res, { results: [] });
    }
    const myCommunityId = await getMyCommunityId(userId);
    const where = {
      AND: [
        { pseudo: { not: null } },
        {
          OR: [
            { pseudo: { equals: q, mode: 'insensitive' } },
            { pseudo: { contains: q, mode: 'insensitive' } },
          ],
        },
        ...(myCommunityId ? [{ id: { not: myCommunityId } }] : []),
      ],
    };
    const communities = await prisma.userCommunity.findMany({
      where,
      select: { id: true, pseudo: true, profileImage: true },
      take: 20,
    });
    if (process.env.DEBUG_LOGS === 'true') {
      console.log('[searchCommunities]', { q, myCommunityId, count: communities.length });
    }
    const results = communities.map((c) => ({
      id: c.id,
      pseudo: c.pseudo || 'Anonyme',
      profileImage: c.profileImage,
    }));
    return sendSuccess(res, { results });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

// ============================================================================
// Groupes d'événements (amis qui vont ensemble)
// ============================================================================

module.exports = {
  getCommunityProfileById,
  getCommunityProfile,
  updateCommunityProfile,
  getCommunityFriends,
  getCommunityFriendRequests,
  sendCommunityFriendRequest,
  respondToCommunityFriendRequest,
  removeCommunityFriend,
  checkCommunityPseudoAvailable,
  searchCommunities,
};
