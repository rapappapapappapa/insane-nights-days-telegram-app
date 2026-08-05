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
  author: {
    select: {
      id: true,
      username: true,
    },
  },
};

async function resolveFeedAuthorProfile(userId, activeProfileType) {
  if (activeProfileType === 'DJ') {
    const djProfile = await prisma.userDj.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!djProfile) {
      return { error: { status: 404, message: 'Profil DJ introuvable.' } };
    }
    return { profileType: 'DJ', djId: djProfile.id, bookerId: null };
  }

  if (activeProfileType === 'BOOKER') {
    const bookerProfile = await prisma.userBooker.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!bookerProfile) {
      return { error: { status: 404, message: 'Profil Booker introuvable.' } };
    }
    return { profileType: 'BOOKER', djId: null, bookerId: bookerProfile.id };
  }

  return {
    error: {
      status: 403,
      message: 'Seuls les DJs et les Bookers peuvent publier ou reposter sur le feed.',
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
  const profileType = post.djId ? 'DJ' : post.bookerId ? 'BOOKER' : null;
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
  const profileType = post.djId ? 'DJ' : post.bookerId ? 'BOOKER' : null;
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
  resolveRootFeedPostId,
  formatFeedPost,
  fetchUserRepostedRootIds,
};
