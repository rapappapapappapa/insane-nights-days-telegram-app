/**
 * eventGroup — extrait de userController.js
 */

const prisma = require('../../lib/prisma');
const { handleError, sendError, sendSuccess } = require('../../utils/helpers');

/**
 * Créer un groupe pour un événement
 * POST /api/events/:eventId/groups
 * body: { name?, friendCommunityIds?: string[] }
 */
const createEventGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { name, friendCommunityIds = [] } = req.body ?? {};
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) {
      return sendError(res, 'Profil Communauté requis.', 400);
    }
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return sendError(res, 'Événement introuvable.', 404);
    const existing = await prisma.eventGroup.findUnique({
      where: { eventId_creatorCommunityId: { eventId, creatorCommunityId: myCommunityId } },
      include: {
        event: { select: { id: true, title: true, date: true, time: true, location: true } },
        creator: { select: { id: true, pseudo: true, profileImage: true } },
        members: { include: { community: { select: { id: true, pseudo: true, profileImage: true } } } },
      },
    });
    if (existing) {
      return sendSuccess(res, { group: existing, alreadyExists: true });
    }
    const group = await prisma.eventGroup.create({
      data: {
        eventId,
        creatorCommunityId: myCommunityId,
        name: name && String(name).trim() ? String(name).trim() : null,
      },
      include: {
        event: { select: { id: true, title: true, date: true, time: true, location: true } },
        creator: { select: { id: true, pseudo: true, profileImage: true } },
        members: { include: { community: { select: { id: true, pseudo: true, profileImage: true } } } },
      },
    });
    if (Array.isArray(friendCommunityIds) && friendCommunityIds.length > 0) {
      const friends = await prisma.communityFriend.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [
            { requesterCommunityId: myCommunityId, requestedCommunityId: { in: friendCommunityIds } },
            { requestedCommunityId: myCommunityId, requesterCommunityId: { in: friendCommunityIds } },
          ],
        },
      });
      const validIds = [...new Set(friends.map((f) => (f.requesterCommunityId === myCommunityId ? f.requestedCommunityId : f.requesterCommunityId)))];
      if (validIds.length > 0) {
        await prisma.eventGroupMember.createMany({
          data: validIds.map((communityId) => ({ groupId: group.id, communityId })),
        });
        const updated = await prisma.eventGroup.findUnique({
          where: { id: group.id },
          include: {
            event: { select: { id: true, title: true, date: true, time: true, location: true } },
            creator: { select: { id: true, pseudo: true, profileImage: true } },
            members: { include: { community: { select: { id: true, pseudo: true, profileImage: true } } } },
          },
        });
        return sendSuccess(res, { group: updated }, 201);
      }
    }
    return sendSuccess(res, { group }, 201);
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Lister mes groupes pour un événement
 * GET /api/events/:eventId/groups
 */
const getEventGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) {
      return sendSuccess(res, { groups: [] });
    }
    const groups = await prisma.eventGroup.findMany({
      where: {
        eventId,
        OR: [
          { creatorCommunityId: myCommunityId },
          { members: { some: { communityId: myCommunityId } } },
        ],
      },
      include: {
        creator: { select: { id: true, pseudo: true, profileImage: true } },
        members: {
          include: { community: { select: { id: true, pseudo: true, profileImage: true } } },
        },
      },
    });
    const formatted = groups.map((g) => ({
      id: g.id,
      name: g.name,
      eventId: g.eventId,
      creator: g.creator,
      members: g.members.map((m) => ({
        id: m.id,
        communityId: m.communityId,
        pseudo: m.community.pseudo || 'Anonyme',
        profileImage: m.community.profileImage,
        status: m.status,
      })),
    }));
    return sendSuccess(res, { groups: formatted });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Inviter des amis dans un groupe
 * POST /api/events/:eventId/groups/:groupId/invite
 * body: { communityIds: string[] }
 */
const inviteToEventGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId, groupId } = req.params;
    const { communityIds } = req.body ?? {};
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) return sendError(res, 'Profil Communauté requis.', 400);
    if (!Array.isArray(communityIds) || communityIds.length === 0) {
      return sendError(res, 'communityIds requis (tableau).', 400);
    }
    const group = await prisma.eventGroup.findFirst({
      where: { id: groupId, eventId, creatorCommunityId: myCommunityId },
    });
    if (!group) return sendError(res, 'Groupe introuvable ou tu n\'es pas le créateur.', 404);
    const friends = await prisma.communityFriend.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterCommunityId: myCommunityId, requestedCommunityId: { in: communityIds } },
          { requestedCommunityId: myCommunityId, requesterCommunityId: { in: communityIds } },
        ],
      },
    });
    const validIds = [...new Set(friends.map((f) => (f.requesterCommunityId === myCommunityId ? f.requestedCommunityId : f.requesterCommunityId)))];
    const created = [];
    for (const cid of validIds) {
      if (cid === myCommunityId) continue;
      const existing = await prisma.eventGroupMember.findUnique({
        where: { groupId_communityId: { groupId, communityId: cid } },
      });
      if (!existing) {
        const m = await prisma.eventGroupMember.create({
          data: { groupId, communityId: cid, status: 'INVITED' },
          include: { community: { select: { id: true, pseudo: true, profileImage: true } } },
        });
        created.push(m);
      }
    }
    return sendSuccess(res, { invited: created.length, members: created });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Répondre à une invitation (rejoindre ou refuser)
 * PUT /api/event-groups/:groupId/respond
 * body: { action: 'join' | 'decline' }
 */
const respondToEventGroupInvitation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupId } = req.params;
    const { action } = req.body ?? {};
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) return sendError(res, 'Profil Communauté requis.', 400);
    if (!action || !['join', 'decline'].includes(action)) {
      return sendError(res, 'action requis: join ou decline.', 400);
    }
    const member = await prisma.eventGroupMember.findFirst({
      where: { groupId, communityId: myCommunityId },
      include: { group: { include: { event: true, creator: true } } },
    });
    if (!member) return sendError(res, 'Invitation introuvable.', 404);
    if (member.status !== 'INVITED') {
      return sendError(res, 'Tu as déjà répondu à cette invitation.', 400);
    }
    await prisma.eventGroupMember.update({
      where: { id: member.id },
      data: { status: action === 'join' ? 'JOINED' : 'DECLINED' },
    });
    return sendSuccess(res, {
      message: action === 'join' ? 'Tu as rejoint le groupe.' : 'Invitation refusée.',
      status: action === 'join' ? 'JOINED' : 'DECLINED',
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Mes invitations à des groupes d'événements
 * GET /api/user/community/event-groups/invitations
 */
const getEventGroupInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) return sendSuccess(res, { invitations: [] });
    const members = await prisma.eventGroupMember.findMany({
      where: { communityId: myCommunityId, status: 'INVITED' },
      include: {
        group: {
          include: {
            event: { select: { id: true, title: true, date: true, time: true, location: true } },
            creator: { select: { id: true, pseudo: true, profileImage: true } },
          },
        },
      },
    });
    const invitations = members.map((m) => ({
      id: m.id,
      groupId: m.groupId,
      status: m.status,
      event: m.group.event,
      creator: m.group.creator,
    }));
    return sendSuccess(res, { invitations });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

module.exports = {
  createEventGroup,
  getEventGroups,
  inviteToEventGroup,
  respondToEventGroupInvitation,
  getEventGroupInvitations,
};
