// Configuration API pour le backend
export const API_CONFIG = {
  // URL de base du backend
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE || 'http://172.20.10.7:5000',
  
  // Timeout pour les requêtes
  TIMEOUT: 10000,
  
  // Endpoints
  ENDPOINTS: {
    WALLET_CONNECT: '/api/wallet/connect',
    USER_PROFILE: '/api/user',
    EVENTS: '/api/events',
    TICKETS_BUY: '/api/tickets/buy',
    TICKETS_USER: '/api/user',
    TICKET_QR: '/api/tickets',
    STATS: '/api/stats',
    TEST: '/api/test',
  },
};

// Fonction helper pour faire des requêtes
export const apiRequest = async (endpoint, options = {}) => {
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
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Fonctions spécifiques pour chaque endpoint
export const api = {
  // Connexion wallet
  connectWallet: async (walletAddress, username) => {
    return apiRequest(API_CONFIG.ENDPOINTS.WALLET_CONNECT, {
      method: 'POST',
      body: JSON.stringify({ walletAddress, username }),
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

