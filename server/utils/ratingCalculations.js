/**
 * Recalcul des moyennes de notation DJ / Lieu.
 */
const prisma = require('../lib/prisma');

// Fonction helper pour calculer les moyennes d'un DJ
async function calculateDjRatings(djId) {
  const ratings = await prisma.djRating.findMany({
    where: { djId },
  });

  const communityRatings = ratings.filter((r) => r.raterType === 'COMMUNITY');
  const bookerRatings = ratings.filter((r) => r.raterType === 'BOOKER');
  const venueRatings = ratings.filter((r) => r.raterType === 'VENUE');

  const avgCommunity =
    communityRatings.length > 0
      ? communityRatings.reduce((sum, r) => sum + r.rating, 0) / communityRatings.length
      : 0;
  const avgBooker =
    bookerRatings.length > 0
      ? bookerRatings.reduce((sum, r) => sum + r.rating, 0) / bookerRatings.length
      : 0;
  const avgVenue =
    venueRatings.length > 0
      ? venueRatings.reduce((sum, r) => sum + r.rating, 0) / venueRatings.length
      : 0;

  const avgGlobal =
    ratings.length > 0 ? (avgCommunity + avgBooker + avgVenue) / 3 : 0;

  await prisma.userDj.update({
    where: { id: djId },
    data: {
      averageRatingCommunity: Math.round(avgCommunity * 10) / 10,
      averageRatingBooker: Math.round(avgBooker * 10) / 10,
      averageRatingVenue: Math.round(avgVenue * 10) / 10,
      averageRatingGlobal: Math.round(avgGlobal * 10) / 10,
      totalRatingsCommunity: communityRatings.length,
      totalRatingsBooker: bookerRatings.length,
      totalRatingsVenue: venueRatings.length,
    },
  });
};

// Fonction helper pour calculer les moyennes d'un lieu
async function calculateVenueRatings(venueId) {
  const ratings = await prisma.venueRating.findMany({
    where: { venueId },
  });

  const communityRatings = ratings.filter((r) => r.raterType === 'COMMUNITY');
  const bookerRatings = ratings.filter((r) => r.raterType === 'BOOKER');
  const djRatings = ratings.filter((r) => r.raterType === 'DJ');

  const avgCommunity =
    communityRatings.length > 0
      ? communityRatings.reduce((sum, r) => sum + r.rating, 0) / communityRatings.length
      : 0;
  const avgBooker =
    bookerRatings.length > 0
      ? bookerRatings.reduce((sum, r) => sum + r.rating, 0) / bookerRatings.length
      : 0;
  const avgDj =
    djRatings.length > 0
      ? djRatings.reduce((sum, r) => sum + r.rating, 0) / djRatings.length
      : 0;

  const avgGlobal =
    ratings.length > 0 ? (avgCommunity + avgBooker + avgDj) / 3 : 0;

  await prisma.userVenue.update({
    where: { id: venueId },
    data: {
      averageRatingCommunity: Math.round(avgCommunity * 10) / 10,
      averageRatingBooker: Math.round(avgBooker * 10) / 10,
      averageRatingDj: Math.round(avgDj * 10) / 10,
      averageRatingGlobal: Math.round(avgGlobal * 10) / 10,
      totalRatingsCommunity: communityRatings.length,
      totalRatingsBooker: bookerRatings.length,
      totalRatingsDj: djRatings.length,
    },
  });
};

module.exports = {
  calculateDjRatings,
  calculateVenueRatings,
};
