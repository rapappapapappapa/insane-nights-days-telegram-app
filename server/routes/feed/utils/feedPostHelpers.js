/**
 * Helpers partagés pour les posts du feed (création, repost, formatage).
 */
const prisma = require('../../../lib/prisma');

const FEED_POST_INCLUDE = {
  _count: { select: { comments: true } },
  dj: {
    include: {
      media: {
        where: { type: 'photo', title: 'profile' },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  },
  booker: {
    select: {
      pseudo: true,
      nom: true,
      prenom: true,
      bookerType: true,
      profileImage: true,
    },
  },
  venue: {
    select: {
      venueName: true,
      city: true,
      address: true,
      profileImage: true,
    },
  },
  author: {
    select: {
      username: true,
      activeProfileType: true,
    },
  },
};

const ORIGINAL_POST_INCLUDE = {
  dj: {
    include: {
      media: {
        where: { type: 'photo', title: 'profile' },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  },
  booker: {
    select: {
      pseudo: true,
      nom: true,
      prenom: true,
      bookerType: true,
      profileImage: true,
    },
  },
  venue: {
    select: {
      venueName: true,
      city: true,
      address: true,
      profileImage: true,
    },
  },
  author: {
    select: {
      id: true,
      username: true,
    },
  },
};

function resolveFeedProfileType(post) {
  if (post.djId) return 'DJ';
  if (post.bookerId) return 'BOOKER';
  if (post.venueId) return 'VENUE';
  return null;
}

async function resolveFeedAuthorProfile(userId, activeProfileType) {
  if (activeProfileType === 'DJ') {
    const djProfile = await prisma.userDj.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!djProfile) {
      return { error: { status: 404, message: 'Profil DJ introuvable.' } };
    }
    return { profileType: 'DJ', djId: djProfile.id, bookerId: null, venueId: null };
  }

  if (activeProfileType === 'BOOKER') {
    const bookerProfile = await prisma.userBooker.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!bookerProfile) {
      return { error: { status: 404, message: 'Profil Booker introuvable.' } };
    }
    return { profileType: 'BOOKER', djId: null, bookerId: bookerProfile.id, venueId: null };
  }

  if (activeProfileType === 'VENUE') {
    const venueProfile = await prisma.userVenue.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!venueProfile) {
      return { error: { status: 404, message: 'Profil lieu introuvable.' } };
    }
    return { profileType: 'VENUE', djId: null, bookerId: null, venueId: venueProfile.id };
  }

  return {
    error: {
      status: 403,
      message: 'Seuls les DJs, organisateurs et lieux peuvent publier ou reposter sur le feed.',
    },
  };
}

async function requireDjOrBookerUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeProfileType: true },
  });

  if (!user || (user.activeProfileType !== 'DJ' && user.activeProfileType !== 'BOOKER')) {
    return {
      error: {
        status: 403,
        message: 'Seuls les artistes et organisateurs peuvent publier ou reposter sur le feed.',
      },
    };
  }

  const profile = await resolveFeedAuthorProfile(userId, user.activeProfileType);
  if (profile.error) return profile;

  return {
    activeProfileType: user.activeProfileType,
    ...profile,
  };
}

/** DJ, Booker ou Lieu — création de posts originaux. */
async function requireFeedPublisherUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeProfileType: true },
  });

  const allowed = user && ['DJ', 'BOOKER', 'VENUE'].includes(user.activeProfileType);
  if (!allowed) {
    return {
      error: {
        status: 403,
        message: 'Seuls les DJs, organisateurs et lieux peuvent créer des posts. Les profils Community peuvent commenter.',
      },
    };
  }

  const profile = await resolveFeedAuthorProfile(userId, user.activeProfileType);
  if (profile.error) return profile;

  return {
    activeProfileType: user.activeProfileType,
    ...profile,
  };
}

/** Remonte au post source (non-repost) pour éviter les chaînes. */
async function resolveRootFeedPostId(postId) {
  let currentId = postId;
  for (let depth = 0; depth < 10; depth += 1) {
    const row = await prisma.feedPost.findUnique({
      where: { id: currentId },
      select: { id: true, originalPostId: true },
    });
    if (!row) return null;
    if (!row.originalPostId) return row.id;
    currentId = row.originalPostId;
  }
  return currentId;
}

function formatFeedPostAuthorBlock(post, normalizeImageUrl) {
  const profileType = resolveFeedProfileType(post);
  const formatted = {
    profileType,
    author: {
      id: post.authorId,
      username: post.author?.username,
    },
  };

  if (post.dj) {
    const djProfileImg = post.dj.profileImage || post.dj.media?.[0]?.url;
    formatted.dj = {
      id: post.djId,
      userId: post.authorId,
      artistName: post.dj.artistName,
      profileImage: normalizeImageUrl(djProfileImg),
      city: post.dj.city,
    };
  }

  if (post.booker) {
    formatted.booker = {
      id: post.bookerId,
      userId: post.authorId,
      name: post.booker.pseudo?.trim() || `${post.booker.nom} ${post.booker.prenom}`,
      bookerType: post.booker.bookerType,
      profileImage: normalizeImageUrl(post.booker.profileImage),
    };
  } else if (post.bookerId) {
    formatted.bookerId = post.bookerId;
  }

  if (post.venue) {
    formatted.venue = {
      id: post.venueId,
      userId: post.authorId,
      venueName: post.venue.venueName,
      city: post.venue.city,
      address: post.venue.address,
      profileImage: normalizeImageUrl(post.venue.profileImage),
    };
  } else if (post.venueId) {
    formatted.venueId = post.venueId;
  }

  return formatted;
}

function formatOriginalFeedPost(post, normalizeImageUrl) {
  const authorBlock = formatFeedPostAuthorBlock(post, normalizeImageUrl);
  return {
    id: post.id,
    content: post.content,
    imageUrl: normalizeImageUrl(post.imageUrl),
    createdAt: post.createdAt,
    ...authorBlock,
  };
}

function formatFeedPost(post, { normalizeImageUrl, userLikedPostIds, userRepostedRootIds }) {
  const profileType = resolveFeedProfileType(post);
  const rootId = post.originalPostId || post.id;

  const formattedPost = {
    type: 'post',
    id: post.id,
    content: post.content,
    imageUrl: normalizeImageUrl(post.imageUrl),
    likes: post.likes,
    liked: userLikedPostIds ? userLikedPostIds.has(post.id) : undefined,
    commentsCount: post._count?.comments ?? 0,
    createdAt: post.createdAt,
    profileType,
    isRepost: !!post.originalPostId,
    repostedByMe: userRepostedRootIds ? userRepostedRootIds.has(rootId) : undefined,
    author: {
      id: post.authorId,
      username: post.author?.username,
    },
  };

  Object.assign(formattedPost, formatFeedPostAuthorBlock(post, normalizeImageUrl));

  if (post.originalPost) {
    formattedPost.originalPost = formatOriginalFeedPost(post.originalPost, normalizeImageUrl);
  }

  return formattedPost;
}

async function fetchUserRepostedRootIds(userId, postIds) {
  const rootIds = postIds.filter(Boolean);
  if (!userId || rootIds.length === 0) return new Set();

  const reposts = await prisma.feedPost.findMany({
    where: {
      authorId: userId,
      originalPostId: { in: rootIds },
    },
    select: { originalPostId: true },
  });

  return new Set(reposts.map((r) => r.originalPostId));
}

module.exports = {
  FEED_POST_INCLUDE,
  ORIGINAL_POST_INCLUDE,
  requireDjOrBookerUser,
  requireFeedPublisherUser,
  resolveRootFeedPostId,
  formatFeedPost,
  fetchUserRepostedRootIds,
};
