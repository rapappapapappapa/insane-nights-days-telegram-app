import logger from '../../utils/logger';
import { apiCache } from '../../utils/apiCache';

export function createCoreAuthApiMethods({ apiRequest, getMimeType, getFileName, API_CONFIG }) {
  return {
  connectWallet: async (walletAddress, username) => {
    return apiRequest(API_CONFIG.ENDPOINTS.WALLET_CONNECT, {
      method: 'POST',
      body: JSON.stringify({ walletAddress, username }),
    });
  },

  // Inscription utilisateur
  register: async ({ email, username, password, birthDate, certifiedMajor }) => {
    return apiRequest(API_CONFIG.ENDPOINTS.AUTH_REGISTER, {
      method: 'POST',
      body: JSON.stringify({ email, username, password, birthDate, certifiedMajor }),
    });
  },

  // Connexion utilisateur
  login: async ({ email, password }) => {
    return apiRequest(API_CONFIG.ENDPOINTS.AUTH_LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /** OAuth Google : { idToken } (connexion) ou + birthDate, certifiedMajor, acceptedCgu, username? (inscription) */
  loginWithGoogle: async (payload) => {
    return apiRequest(API_CONFIG.ENDPOINTS.AUTH_GOOGLE, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  /** Sign in with Apple : { identityToken } ou + inscription (birthDate, certifiedMajor, acceptedCgu, username?) */
  loginWithApple: async (payload) => {
    return apiRequest(API_CONFIG.ENDPOINTS.AUTH_APPLE, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  // Créer un profil Communauté (nécessite un token JWT)
  createCommunityProfile: async ({ token, pseudo, nom, prenom, email, pays, dateNaissance }) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour créer un profil.');
    }
    return apiRequest(
      API_CONFIG.ENDPOINTS.PROFILE_COMMUNITY,
      {
        method: 'POST',
        body: JSON.stringify({ pseudo, nom, prenom, email, pays, dateNaissance }),
      },
      token
    );
  },

  // Créer un profil DJ (nécessite un token JWT)
  createDjProfile: async ({ token, pseudo, artistName, email, city, phone, birthDate, legalName, address, postalCode, country, siret, vatNumber }) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour créer un profil.');
    }
    const body = { artistName, city, phone, birthDate };
    if (legalName != null) body.legalName = legalName;
    if (address != null) body.address = address;
    if (postalCode != null) body.postalCode = postalCode;
    if (country != null) body.country = country;
    if (siret != null) body.siret = siret;
    if (vatNumber != null) body.vatNumber = vatNumber;
    return apiRequest(
      API_CONFIG.ENDPOINTS.PROFILE_DJ,
      { method: 'POST', body: JSON.stringify(body) },
      token
    );
  },

  // Créer un profil Booker (nécessite un token JWT)
  createBookerProfile: async ({ token, pseudo, nom, prenom, email, phonePro, bookerType, companyName, address, postalCode, city, country, siret }) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour créer un profil.');
    }
    const body = { nom, prenom, phonePro, bookerType, pseudo: pseudo?.trim() || null };
    if (companyName != null) body.companyName = companyName;
    if (address != null) body.address = address;
    if (postalCode != null) body.postalCode = postalCode;
    if (city != null) body.city = city;
    if (country != null) body.country = country;
    if (siret != null) body.siret = siret;
    return apiRequest(
      API_CONFIG.ENDPOINTS.PROFILE_BOOKER,
      { method: 'POST', body: JSON.stringify(body) },
      token
    );
  },

  // Créer un profil Venue (nécessite un token JWT)
  createVenueProfile: async ({
    token,
    pseudo,
    venueName,
    email,
    address,
    companyName,
    legalRepresentative,
    postalCode,
    city,
    country,
    siret,
    maxCapacity,
  }) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour créer un profil.');
    }
    const body = { venueName, address };
    if (companyName != null) body.companyName = companyName;
    if (legalRepresentative != null) body.legalRepresentative = legalRepresentative;
    if (postalCode != null) body.postalCode = postalCode;
    if (city != null) body.city = city;
    if (country != null) body.country = country;
    if (siret != null) body.siret = siret;
    if (maxCapacity != null && maxCapacity !== '' && String(maxCapacity).trim() !== '') {
      const n = parseInt(String(maxCapacity).replace(/\s/g, ''), 10);
      if (Number.isFinite(n) && n >= 1) body.maxCapacity = n;
    }
    return apiRequest(
      API_CONFIG.ENDPOINTS.PROFILE_VENUE,
      { method: 'POST', body: JSON.stringify(body) },
      token
    );
  },

  // Créer un profil Prestataire
  createPrestataireProfile: async ({
    token,
    businessName,
    phonePro,
    prestationGenres,
    city,
    country,
    bio,
    availableDays,
    availableStatus,
  }) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour créer un profil.');
    }
    const body = {
      businessName: businessName?.trim(),
      phonePro: phonePro?.trim(),
      prestationGenres: Array.isArray(prestationGenres) ? prestationGenres : [],
    };
    if (city != null) body.city = city;
    if (country != null) body.country = country;
    if (bio != null) body.bio = bio;
    if (availableDays != null) body.availableDays = availableDays;
    if (availableStatus !== undefined) body.availableStatus = availableStatus;
    return apiRequest(
      API_CONFIG.ENDPOINTS.PROFILE_PRESTATAIRE,
      { method: 'POST', body: JSON.stringify(body) },
      token
    );
  },

  // Récupérer le profil utilisateur
  getUserProfile: async (userId) => {
    return apiRequest(`${API_CONFIG.ENDPOINTS.USER_PROFILE}/${userId}`);
  },

  // Récupère les informations de l'utilisateur connecté avec son dernier ticket
  getCurrentUser: async (token) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    // ✅ Ne jamais mettre en cache: change après switchProfile / achats / etc.
    return apiRequest(`${API_CONFIG.ENDPOINTS.USER_PROFILE}/me`, { noCache: true }, token);
  },

  // Récupérer tous les événements
  getEvents: async () => {
    return apiRequest(API_CONFIG.ENDPOINTS.EVENTS);
  },

  // Récupérer un événement par ID. Le token est requis pour les événements
  // pas encore publiés sur le feed (visibles par leurs seules parties prenantes).
  getEventById: async (eventId, token = null) => {
    return apiRequest(`${API_CONFIG.ENDPOINTS.EVENT_DETAIL}/${eventId}`, {}, token);
  },

  // Récupérer le classement des DJs
  getDjRanking: async () => {
    return apiRequest(API_CONFIG.ENDPOINTS.DJ_RANKING);
  },

  // Acheter un ticket (nécessite un token JWT)
  buyTicket: async (token, eventId, quantity = 1, tierId = null) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour acheter un ticket.');
    }
    const body = { eventId, quantity };
    if (tierId) body.tierId = tierId;
    return apiRequest(
      API_CONFIG.ENDPOINTS.TICKETS_BUY,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      token
    );
  },

  // ✅ Stripe: créer un PaymentIntent pour acheter des tickets
  createTicketPaymentIntent: async (token, eventId, quantity = 1, tierId = null) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour payer un ticket.');
    }
    const body = { eventId, quantity };
    if (tierId) body.tierId = tierId;
    return apiRequest(
      API_CONFIG.ENDPOINTS.PAYMENTS_CREATE_TICKET_INTENT,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      token
    );
  },

  // ✅ Stripe: confirmer le paiement et délivrer les tickets
  confirmTicketPurchase: async (token, paymentIntentId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      API_CONFIG.ENDPOINTS.PAYMENTS_CONFIRM_TICKET_PURCHASE,
      {
        method: 'POST',
        body: JSON.stringify({ paymentIntentId }),
      },
      token
    );
  },

  // Noter un DJ (nécessite un token JWT)
  // djUserId est le User.id du DJ (pas le UserDj.id)
  rateDj: async ({ token, djUserId, eventId, rating, comment }) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour noter.');
    }
    return apiRequest(
      API_CONFIG.ENDPOINTS.RATINGS_DJ,
      {
        method: 'POST',
        body: JSON.stringify({ djUserId, eventId, rating, comment }),
      },
      token
    );
  },

  // Noter un lieu (nécessite un token JWT)
  rateVenue: async ({ token, venueId, eventId, rating, comment }) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour noter.');
    }
    return apiRequest(
      API_CONFIG.ENDPOINTS.RATINGS_VENUE,
      {
        method: 'POST',
        body: JSON.stringify({ venueId, eventId, rating, comment }),
      },
      token
    );
  },

  // Récupérer les notes d'un DJ (peut être UserDj.id ou User.id)
  getDjRatings: async (identifier) => {
    return apiRequest(`${API_CONFIG.ENDPOINTS.DJ_RATINGS}/${identifier}/ratings`);
  },

  // Récupérer les événements d'un DJ (pour affichage public)
  getDjEvents: async (identifier) => {
    return apiRequest(`/api/dj/${identifier}/events`);
  },

  // Récupérer les notes d'un lieu
  getVenueRatings: async (venueId) => {
    return apiRequest(`${API_CONFIG.ENDPOINTS.VENUE_RATINGS}/${venueId}/ratings`);
  },

  // Récupérer la liste de tous les DJs
  getDjs: async () => {
    return apiRequest(API_CONFIG.ENDPOINTS.DJS_LIST);
  },

  getPublicVenues: async (limit = 50) => {
    return apiRequest(`/api/venues/public?limit=${limit}`, { noCache: true });
  },

  getPublicBookers: async (bookerType = null, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (bookerType) params.set('bookerType', bookerType);
    return apiRequest(`/api/bookers/public?${params}`, { noCache: true });
  },

  // Vérifier les notes existantes d'un utilisateur pour un événement
  checkRatings: async (token, eventId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(`${API_CONFIG.ENDPOINTS.RATINGS_CHECK}/${eventId}`, {}, token);
  },

  // (Nettoyage) Endpoints admin temporaires supprimés.

  // Récupérer les tickets de l'utilisateur connecté (recommandé)
  getMyTickets: async (token) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(API_CONFIG.ENDPOINTS.TICKETS_ME, {}, token);
  },

  // Récupérer les paiements de l'utilisateur connecté (Mes achats)
  getMyPayments: async (token) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(API_CONFIG.ENDPOINTS.PAYMENTS_ME, {}, token);
  },

  // Générer QR code pour un ticket
  getTicketQR: async (ticketId) => {
    return apiRequest(`${API_CONFIG.ENDPOINTS.TICKET_QR}/${ticketId}/qr`);
  },

  // Supprimer un ticket (TEMPORAIRE - à supprimer en production)
  deleteTicket: async (token, ticketId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.TICKET_DELETE}/${ticketId}`,
      {
        method: 'DELETE',
      },
      token
    );
  },

  // Récupérer les statistiques
  getStats: async () => {
    return apiRequest(API_CONFIG.ENDPOINTS.STATS);
  },

  // Test de connexion
  test: async () => {
    return apiRequest(API_CONFIG.ENDPOINTS.TEST);
  },

  // Récupérer tous les profils d'un utilisateur
  getUserProfiles: async (token) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    // ✅ Ne jamais mettre en cache: doit refléter instantanément le profil actif
    return apiRequest(API_CONFIG.ENDPOINTS.USER_PROFILES, { noCache: true }, token);
  },

  // Basculer entre profils
  switchProfile: async (token, profileType) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    const res = await apiRequest(
      API_CONFIG.ENDPOINTS.USER_SWITCH_PROFILE,
      {
        method: 'POST',
        body: JSON.stringify({ profileType }),
      },
      token
    );
    // ✅ Invalidation cache (au cas où /me ou /profiles ont été mis en cache avant)
    if (res?.success) {
      try {
        const meEndpoint = `${API_CONFIG.ENDPOINTS.USER_PROFILE}/me`;
        const profilesEndpoint = API_CONFIG.ENDPOINTS.USER_PROFILES;
        apiCache.delete(apiCache.generateKey(meEndpoint, {}, token));
        apiCache.delete(apiCache.generateKey(profilesEndpoint, {}, token));
      } catch (e) {
        logger.warn('[api.switchProfile] cache invalidation failed:', e?.message ?? e);
      }
    }
    return res;
  },

  // Changer le mot de passe
  changePassword: async (token, oldPassword, newPassword, confirmPassword) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      API_CONFIG.ENDPOINTS.USER_CHANGE_PASSWORD,
      {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      },
      token
    );
  },

  // RGPD: Export des données personnelles
  exportUserData: async (token) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest('/api/user/me/export', { noCache: true }, token);
  },

  // RGPD: Suppression du compte
  deleteAccount: async (token, password) => {
    if (!token) throw new Error('Token requis.');
    if (!password) throw new Error('Mot de passe requis pour confirmer.');
    return apiRequest('/api/user/me', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }, token);
  },
  };
}
