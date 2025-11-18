// Configuration API pour le backend
const API_CONFIG = {
  // URL de base du backend
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.1.44:5000',
  
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
    TICKETS_BUY: '/api/tickets/buy',
    TICKETS_USER: '/api/user',
    TICKET_QR: '/api/tickets',
    STATS: '/api/stats',
    TEST: '/api/test',
  },
};

// Fonction helper pour faire des requêtes
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: API_CONFIG.TIMEOUT,
  };

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

  // Acheter un ticket
  buyTicket: async (userId, eventId, quantity = 1) => {
    return apiRequest(API_CONFIG.ENDPOINTS.TICKETS_BUY, {
      method: 'POST',
      body: JSON.stringify({ userId, eventId, quantity }),
    });
  },

  // Récupérer les tickets d'un utilisateur
  getUserTickets: async (userId) => {
    return apiRequest(`${API_CONFIG.ENDPOINTS.TICKETS_USER}/${userId}/tickets`);
  },

  // Générer QR code pour un ticket
  getTicketQR: async (ticketId) => {
    return apiRequest(`${API_CONFIG.ENDPOINTS.TICKET_QR}/${ticketId}/qr`);
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

