/**
 * venue — extrait de userController.js
 */

const prisma = require('../../lib/prisma');
const { handleError, sendError, sendSuccess } = require('../../utils/helpers');

/**
 * Récupère le profil Venue de l'utilisateur connecté (premier lieu)
 */
const getVenueProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const venue = await prisma.userVenue.findFirst({
      where: { userId },
    });
    if (!venue) {
      return sendError(res, 'Profil Lieu non trouvé.', 404);
    }
    return sendSuccess(res, {
      profile: {
        id: venue.id,
        venueName: venue.venueName,
        address: venue.address,
        profileImage: venue.profileImage,
        bannerImage: venue.bannerImage,
        companyName: venue.companyName,
        legalRepresentative: venue.legalRepresentative,
        postalCode: venue.postalCode,
        city: venue.city,
        country: venue.country,
        siret: venue.siret,
        maxCapacity: venue.maxCapacity ?? null,
      },
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Met à jour le profil Venue (nom, adresse - champs de base)
 */
const updateVenueProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { venueName, address, companyName, legalRepresentative, postalCode, city, country, siret, maxCapacity } =
      req.body ?? {};
    const venue = await prisma.userVenue.findFirst({
      where: { userId },
    });
    if (!venue) {
      return sendError(res, 'Profil Lieu non trouvé.', 404);
    }
    const updateData = {};
    if (venueName !== undefined && String(venueName).trim()) updateData.venueName = String(venueName).trim();
    if (address !== undefined && String(address).trim()) updateData.address = String(address).trim();
    if (maxCapacity !== undefined) {
      if (maxCapacity === null || maxCapacity === '' || String(maxCapacity).trim() === '') {
        updateData.maxCapacity = null;
      } else {
        const mc = parseInt(String(maxCapacity).replace(/\s/g, ''), 10);
        if (!Number.isFinite(mc) || mc < 1) {
          return sendError(res, 'maxCapacity doit être un entier positif (≥ 1) ou être vide.', 400);
        }
        updateData.maxCapacity = mc;
      }
    }
    const venueLegalFields = ['companyName', 'legalRepresentative', 'postalCode', 'city', 'country', 'siret'];
    const venueLegalValues = { companyName, legalRepresentative, postalCode, city, country, siret };
    for (const field of venueLegalFields) {
      const incoming = venueLegalValues[field];
      const current = venue[field];
      const isEmpty = current == null || String(current).trim() === '';
      if (incoming !== undefined && isEmpty) {
        updateData[field] = incoming != null && String(incoming).trim() ? String(incoming).trim() : null;
      }
    }
    const filtered = Object.fromEntries(Object.entries(updateData).filter(([, v]) => v !== undefined));
    const updated = await prisma.userVenue.update({
      where: { id: venue.id },
      data: filtered,
    });
    return sendSuccess(res, {
      profile: {
        id: updated.id,
        venueName: updated.venueName,
        address: updated.address,
        profileImage: updated.profileImage,
        bannerImage: updated.bannerImage,
        companyName: updated.companyName,
        legalRepresentative: updated.legalRepresentative,
        postalCode: updated.postalCode,
        city: updated.city,
        country: updated.country,
        siret: updated.siret,
        maxCapacity: updated.maxCapacity ?? null,
      },
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

module.exports = {
  getVenueProfile,
  updateVenueProfile,
};
