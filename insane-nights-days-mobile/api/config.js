// Configuration API pour le backend
const API_CONFIG = {
  // URL de base du backend
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE || 'https://next-surgical-simulations-pleasant.trycloudflare.com',
  
  // Timeout pour les requêtes
  TIMEOUT: 10000,
  
  // Endpoints
  ENDPOINTS: {
    WALLET_CONNECT: '/api/wallet/connect',
    USER_PROFILE: '/api/user',
    EVENTS: '/api/events',
    EVENT_DETAIL: '/api/events',
    DJ_RANKING: '/api/djs/ranking',
    AUTH_REGISTER: '/api/auth/register',
    AUTH_LOGIN: '/api/auth/login',
    PROFILE_COMMUNITY: '/api/profile/community',
    PROFILE_DJ: '/api/profile/dj',
    PROFILE_BOOKER: '/api/profile/booker',
    PROFILE_VENUE: '/api/profile/venue',
    RATINGS_DJ: '/api/ratings/dj',
    RATINGS_VENUE: '/api/ratings/venue',
    RATINGS_CHECK: '/api/ratings/check',
    DJS_LIST: '/api/djs',
    DJ_RATINGS: '/api/dj',
    VENUE_RATINGS: '/api/venue',
    ADMIN_EVENT_DATE: '/api/admin/event',
    TICKETS_BUY: '/api/tickets/buy',
    TICKETS_USER: '/api/user',
    TICKET_QR: '/api/tickets',
    TICKET_DELETE: '/api/tickets',
    STATS: '/api/stats',
    TEST: '/api/test',
  },
};

// Fonction helper pour faire des requêtes
const apiRequest = async (endpoint, options = {}, token = null) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: API_CONFIG.TIMEOUT,
  };

  // Ajouter le token JWT dans les headers si fourni
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    let data;

    if (isJson) {
      try {
        data = await response.json();
      } catch (parseError) {
        console.warn('API Response Warning: impossible de parser la réponse JSON.', parseError);
        data = null;
      }
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        (isJson && data && typeof data === 'object' && data.message) ||
        `Erreur HTTP ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error?.message?.includes('Network request failed')) {
      console.warn('API Request Warning: backend inaccessible, fallback local utilisé.');
      return null;
    }
    console.error('API Request Error:', error);
    throw error;
  }
};

// Fonctions spécifiques pour chaque endpoint
const api = {
  // Connexion wallet
  connectWallet: async (walletAddress, username) => {
    return apiRequest(API_CONFIG.ENDPOINTS.WALLET_CONNECT, {
      method: 'POST',
      body: JSON.stringify({ walletAddress, username }),
    });
  },

  // Inscription utilisateur
  register: async ({ email, username, password }) => {
    return apiRequest(API_CONFIG.ENDPOINTS.AUTH_REGISTER, {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
  },

  // Connexion utilisateur
  login: async ({ email, password }) => {
    return apiRequest(API_CONFIG.ENDPOINTS.AUTH_LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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
  createDjProfile: async ({ token, pseudo, artistName, email, city, phone, birthDate }) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour créer un profil.');
    }
    return apiRequest(
      API_CONFIG.ENDPOINTS.PROFILE_DJ,
      {
        method: 'POST',
        body: JSON.stringify({ artistName, city, phone, birthDate }),
      },
      token
    );
  },

  // Créer un profil Booker (nécessite un token JWT)
  createBookerProfile: async ({ token, pseudo, nom, prenom, email, phonePro, bookerType }) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour créer un profil.');
    }
    return apiRequest(
      API_CONFIG.ENDPOINTS.PROFILE_BOOKER,
      {
        method: 'POST',
        body: JSON.stringify({ nom, prenom, phonePro, bookerType }),
      },
      token
    );
  },

  // Créer un profil Venue (nécessite un token JWT)
  createVenueProfile: async ({ token, pseudo, venueName, email, address }) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour créer un profil.');
    }
    return apiRequest(
      API_CONFIG.ENDPOINTS.PROFILE_VENUE,
      {
        method: 'POST',
        body: JSON.stringify({ venueName, address }),
      },
      token
    );
  },

  // Récupérer le profil utilisateur
  getUserProfile: async (userId) => {
    return apiRequest(`${API_CONFIG.ENDPOINTS.USER_PROFILE}/${userId}`);
  },

  // Récupérer tous les événements
  getEvents: async () => {
    return apiRequest(API_CONFIG.ENDPOINTS.EVENTS);
  },

  // Récupérer un événement par ID
  getEventById: async (eventId) => {
    return apiRequest(`${API_CONFIG.ENDPOINTS.EVENT_DETAIL}/${eventId}`);
  },

  // Récupérer le classement des DJs
  getDjRanking: async () => {
    return apiRequest(API_CONFIG.ENDPOINTS.DJ_RANKING);
  },

  // Acheter un ticket (nécessite un token JWT)
  buyTicket: async (token, eventId, quantity = 1) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour acheter un ticket.');
    }
    return apiRequest(
      API_CONFIG.ENDPOINTS.TICKETS_BUY,
      {
        method: 'POST',
        body: JSON.stringify({ eventId, quantity }),
      },
      token
    );
  },

  // Noter un DJ (nécessite un token JWT)
  // djUserId est le User.id du DJ (pas le UserDj.id)
  rateDj: async ({ token, djUserId, eventId, rating, comment }) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour noter.');r
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

  // Récupérer les notes d'un lieu
  getVenueRatings: async (venueId) => {
    return apiRequest(`${API_CONFIG.ENDPOINTS.VENUE_RATINGS}/${venueId}/ratings`);
  },

  // Récupérer la liste de tous les DJs
  getDjs: async () => {
    return apiRequest(API_CONFIG.ENDPOINTS.DJS_LIST);
  },

  // Vérifier les notes existantes d'un utilisateur pour un événement
  checkRatings: async (token, eventId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(`${API_CONFIG.ENDPOINTS.RATINGS_CHECK}/${eventId}`, {}, token);
  },

  // Changer le statut d'un événement (TEMPORAIRE - à supprimer en production)
  updateEventStatus: async (token, eventId, status) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.ADMIN_EVENT_DATE}/${eventId}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ status }),
      },
      token
    );
  },

  // Modifier la date d'un événement (TEMPORAIRE - à supprimer en production)
  updateEventDate: async (token, eventId, year) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.ADMIN_EVENT_DATE}/${eventId}/date`,
      {
        method: 'POST',
        body: JSON.stringify({ year }),
      },
      token
    );
  },

  // Récupérer les tickets d'un utilisateur
  getUserTickets: async (userId) => {
    return apiRequest(`${API_CONFIG.ENDPOINTS.TICKETS_USER}/${userId}/tickets`);
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
};

export { api, API_CONFIG };

