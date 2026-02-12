// Configuration API pour le backend
import axios from 'axios';
import { isTokenExpired } from '../utils/tokenStorage';
import logger from '../utils/logger';
import { apiCache } from '../utils/apiCache';
import { retryApiCall, isRetryableError } from '../utils/retry';

const API_CONFIG = {
  // URL de base du backend
  // En prod, on utilise Railway (Cloudflare tunnel = uniquement dev local et instable).
  BASE_URL: (process.env.EXPO_PUBLIC_API_BASE || 'https://insane-nights-days-telegram-app-production.up.railway.app').replace(/\/$/, ''),
  
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
    TICKETS_BUY: '/api/tickets/buy',
    PAYMENTS_CREATE_TICKET_INTENT: '/api/payments/create-ticket-intent',
    PAYMENTS_CONFIRM_TICKET_PURCHASE: '/api/payments/confirm-ticket-purchase',
    PAYMENTS_ME: '/api/payments/me',
    TICKETS_USER: '/api/user',
    TICKETS_ME: '/api/user/me/tickets',
    TICKET_QR: '/api/tickets',
    TICKET_DELETE: '/api/tickets',
    STATS: '/api/stats',
    TEST: '/api/test',
    USER_PROFILES: '/api/user/profiles',
    USER_SWITCH_PROFILE: '/api/user/switch-profile',
    USER_CHANGE_PASSWORD: '/api/user/change-password',
    USER_DJ_PROFILE: '/api/user/dj/profile',
    BOOKER_PROFILE: '/api/booker/profile',
    DJ_BOOKINGS: '/api/dj/bookings',
    DJ_ACCEPT_INVITATION: '/api/dj/invitations',
    DJ_REJECT_INVITATION: '/api/dj/invitations',
    VENUE_MEDIA: '/api/venue',
    BOOKER_AVAILABLE_DJS: '/api/booker/available-djs',
    BOOKER_VENUES: '/api/booker/venues',
    BOOKER_EVENTS: '/api/booker/events',
    BOOKER_CREATE_EVENT: '/api/booker/events',
    BOOKER_DELETE_EVENT: '/api/booker/events',
    BOOKER_EVENTDJ_PAYMENT: '/api/booker/event-djs',
    CONTRACTS_EVENTDJS: '/api/contracts/event-djs',
  },
};

// Fonctions helper pour l'upload de fichiers
const getMimeType = (uri, type) => {
  const extension = uri.split('.').pop().toLowerCase();
  const mimeTypes = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    // Vidéos
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mpeg: 'video/mpeg',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
  };
  return mimeTypes[extension] || (type === 'photo' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : 'audio/mpeg');
};

const getFileName = (uri) => {
  // Extraire le nom de fichier de l'URI
  const parts = uri.split('/');
  let fileName = parts[parts.length - 1];
  // Si c'est un URI local, utiliser un nom générique
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    const extension = uri.split('.').pop().toLowerCase();
    fileName = `media.${extension}`;
  }
  return fileName;
};

// Fonction helper pour faire des requêtes
// options.noCache: si true, bypass cache GET (utile pour /user/me après switchProfile)
const apiRequest = async (endpoint, options = {}, token = null, customTimeout = null) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  // Déterminer la méthode HTTP (GET par défaut)
  const method = options.method || 'GET';
  const isGetRequest = method === 'GET' || !method;
  
  // Extraire les options internes (ne doivent pas partir dans fetch)
  const { noCache, ...optionsForFetch } = options || {};

  // Générer la clé de cache pour les requêtes GET
  const cacheKey = (isGetRequest && !noCache) ? apiCache.generateKey(endpoint, optionsForFetch, token) : null;
  
  // Vérifier le cache pour les requêtes GET
  if (isGetRequest && cacheKey) {
    const cachedData = apiCache.get(cacheKey);
    if (cachedData !== null) {
      logger.debug('[apiRequest] Données récupérées du cache pour:', endpoint);
      return cachedData;
    }
  }
  
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: customTimeout || API_CONFIG.TIMEOUT,
  };

  // Ajouter le token JWT dans les headers si fourni
  if (token) {
    // Vérifier si le token est expiré avant de faire la requête
    if (isTokenExpired(token)) {
      const expiredError = new Error('Token expiré. Veuillez vous reconnecter.');
      expiredError.status = 401;
      expiredError.isTokenExpired = true;
      throw expiredError;
    }
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...defaultOptions,
    ...optionsForFetch,
    headers: {
      ...defaultOptions.headers,
      ...(optionsForFetch?.headers || {}),
    },
  };

  // Fonction interne pour faire la requête (sera réessayée si nécessaire)
  const performRequest = async () => {
    // Gérer le timeout avec AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const contentType = response.headers.get('content-type') ?? '';
      const isJson = contentType.includes('application/json');
      let data;

      if (isJson) {
        try {
          data = await response.json();
        } catch (parseError) {
          logger.warn('API Response Warning: impossible de parser la réponse JSON.', parseError);
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
        
        // Marquer les erreurs 401 et 403 (token invalide/expiré) comme token expiré
        if (response.status === 401 || 
            (response.status === 403 && (
              errorMessage.includes('Token invalide') || 
              errorMessage.includes('Token expiré') ||
              errorMessage.includes('Token d\'authentification')
            ))) {
          error.isTokenExpired = true;
        }
        
        throw error;
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Timeout: La requête a pris trop de temps');
        timeoutError.status = 408;
        throw timeoutError;
      }
      
      throw error;
    }
  };

  try {
    // Réessayer la requête en cas d'erreur réseau ou timeout
    const data = await retryApiCall(performRequest, {
      maxRetries: 2, // 2 tentatives supplémentaires (3 au total)
      delay: 500, // Délai initial de 500ms
      shouldRetry: isRetryableError,
      exponentialBackoff: true,
    });
    
    // Mettre en cache les réponses GET réussies
    if (isGetRequest && cacheKey && data) {
      apiCache.set(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (error?.message?.includes('Network request failed')) {
      logger.warn('API Request Warning: backend inaccessible après plusieurs tentatives, fallback local utilisé.');
      return null;
    }
    // Logger l'erreur avec plus de détails
    logger.error('API Request Error:', {
      message: error?.message || 'Unknown error',
      status: error?.status,
      name: error?.name,
      endpoint: endpoint,
      isTokenExpired: error?.isTokenExpired,
    });
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

  // ✅ Stripe: créer un PaymentIntent pour acheter des tickets
  createTicketPaymentIntent: async (token, eventId, quantity = 1) => {
    if (!token) {
      throw new Error('Token d\'authentification requis pour payer un ticket.');
    }
    return apiRequest(
      API_CONFIG.ENDPOINTS.PAYMENTS_CREATE_TICKET_INTENT,
      {
        method: 'POST',
        body: JSON.stringify({ eventId, quantity }),
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

  // =========================================================================
  // EMAIL VERIFICATION / PASSWORD RESET
  // =========================================================================
  sendEmailVerificationCode: async (token) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest('/api/user/me/email/verification/send', { method: 'POST', noCache: true }, token);
  },
  confirmEmailVerificationCode: async (token, code) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!code) throw new Error('Code requis.');
    return apiRequest(
      '/api/user/me/email/verification/confirm',
      { method: 'POST', body: JSON.stringify({ code: String(code).trim() }) },
      token
    );
  },
  forgotPassword: async (email) => {
    return apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: (email || '').toString().trim() }),
    });
  },
  resetPassword: async ({ email, code, newPassword, confirmPassword }) => {
    return apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email: (email || '').toString().trim(),
        code: (code || '').toString().trim(),
        newPassword: (newPassword || '').toString(),
        confirmPassword: (confirmPassword || '').toString(),
      }),
    });
  },

  // Récupérer le profil DJ actif
  getDjProfile: async (token) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(API_CONFIG.ENDPOINTS.USER_DJ_PROFILE, {}, token);
  },

  // Mettre à jour le profil DJ
  updateDjProfile: async (token, artistName, city, phone, birthDate, additionalData = {}) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    // Les champs artistName, city, phone, birthDate sont requis pour validation mais non modifiés
    // Les champs éditables sont dans additionalData
    const requestBody = { 
      artistName, 
      city, 
      phone, 
      birthDate,
      ...additionalData // bio, genre, mainCity, languages, tarifs, disponibilités
    };
    
    logger.debug('[api.updateDjProfile] Corps de la requête avant stringify:', requestBody);
    logger.debug('[api.updateDjProfile] Clés dans requestBody:', Object.keys(requestBody));
    logger.debug('[api.updateDjProfile] bio dans requestBody:', requestBody.bio);
    logger.debug('[api.updateDjProfile] additionalData:', additionalData);
    
    return apiRequest(
      API_CONFIG.ENDPOINTS.USER_DJ_PROFILE,
      {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      },
      token
    );
  },

  // Uploader un média pour un DJ
  uploadDjMedia: async (token, djId, type, url, title = null, thumbnail = null) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    // Timeout plus long pour les vidéos (60 secondes)
    const timeout = type === 'video' ? 60000 : 30000;
    return apiRequest(
      `/api/dj/${djId}/media`,
      {
        method: 'POST',
        body: JSON.stringify({ type, url, title, thumbnail }),
      },
      token,
      timeout
    );
  },

  // ✅ AJOUT: Récupérer le profil Booker
  getBookerProfile: async (token) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    const profiles = await api.getUserProfiles(token);
    if (profiles?.success && profiles?.profiles?.booker?.[0]) {
      return { success: true, profile: profiles.profiles.booker[0] };
    }
    return { success: false, message: 'Profil Booker non trouvé.' };
  },

  // ✅ AJOUT: Mettre à jour le profil Booker
  updateBookerProfile: async (token, nom, prenom, phonePro, bookerType) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      API_CONFIG.ENDPOINTS.BOOKER_PROFILE,
      {
        method: 'PUT',
        body: JSON.stringify({ nom, prenom, phonePro, bookerType }),
      },
      token
    );
  },

  // ✅ AJOUT: Uploader la photo de profil d'un Booker
  uploadBookerProfileImage: async (token, imageUri) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    });

    const uploadUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOOKER_PROFILE}/upload-image`;
    return fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    })
      .then((res) => res.json())
      .catch((error) => {
        console.error('Erreur upload photo de profil Booker:', error);
        throw error;
      });
  },

  // Uploader un fichier média pour un DJ
  uploadDjMediaFile: async (token, djId, fileUri, type, title = null, thumbnail = null) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    
    logger.debug('[uploadDjMediaFile] Début upload:', { djId, type, fileUri: fileUri.substring(0, 50) + '...', title });
    
    // Créer un FormData pour l'upload
    const formData = new FormData();
    const fileData = {
      uri: fileUri,
      type: getMimeType(fileUri, type),
      name: getFileName(fileUri),
    };
    logger.debug('[uploadDjMediaFile] File data:', { type: fileData.type, name: fileData.name });
    
    // IMPORTANT: Ne pas mettre 'file' comme clé, utiliser directement l'objet
    formData.append('file', fileData);
    formData.append('type', type);
    if (title) formData.append('title', title);
    if (thumbnail) formData.append('thumbnail', thumbnail);

    const uploadUrl = `${API_CONFIG.BASE_URL}/api/dj/${djId}/media/upload`;
    logger.debug('[uploadDjMediaFile] URL:', uploadUrl);

    // Utiliser fetch (plus robuste sur Android que axios pour FormData)
    try {
      logger.debug('[uploadDjMediaFile] Envoi de la requête avec fetch...');
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const result = await response.json();
      logger.debug('[uploadDjMediaFile] Réponse:', result);
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Échec de l\'upload du média.');
      }

      return result;
    } catch (error) {
      logger.error('[uploadDjMediaFile] Erreur catch:', { 
        name: error.name, 
        message: error.message,
        code: error.code,
        stack: error.stack?.substring(0, 200)
      });
      
      if (error.message && (error.message.includes('Network request failed') || error.message.includes('Network Error'))) {
        throw new Error('Erreur réseau - Vérifiez votre connexion internet et réessayez. Si le problème persiste, le fichier est peut-être trop volumineux.');
      }
      throw error;
    }
  },

  // Récupérer les médias d'un lieu
  getVenueMedia: async (venueId, type = null) => {
    const query = type ? `?type=${type}` : '';
    return apiRequest(`${API_CONFIG.ENDPOINTS.VENUE_MEDIA}/${venueId}/media${query}`);
  },

  // Uploader un média par URL pour un lieu
  uploadVenueMedia: async (token, venueId, type, url, title = null, thumbnail = null) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }

    return apiRequest(
      `${API_CONFIG.ENDPOINTS.VENUE_MEDIA}/${venueId}/media`,
      {
        method: 'POST',
        body: JSON.stringify({ type, url, title, thumbnail }),
      },
      token
    );
  },

  // Uploader un fichier média pour un lieu
  uploadVenueMediaFile: async (token, venueId, fileUri, type, title = null, thumbnail = null) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }

    logger.debug('[uploadVenueMediaFile] Début upload:', { venueId, type, fileUri: fileUri?.substring(0, 50) + '...', title });

    const formData = new FormData();
    const fileData = {
      uri: fileUri,
      type: getMimeType(fileUri, type),
      name: getFileName(fileUri),
    };
    formData.append('file', fileData);
    formData.append('type', type);
    if (title) formData.append('title', title);
    if (thumbnail) formData.append('thumbnail', thumbnail);

    const uploadUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VENUE_MEDIA}/${venueId}/media/upload`;
    logger.debug('[uploadVenueMediaFile] URL:', uploadUrl);

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const result = await response.json();
      logger.debug('[uploadVenueMediaFile] Réponse:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Échec de l\'upload du média.');
      }

      return result;
    } catch (error) {
      logger.error('[uploadVenueMediaFile] Erreur:', error);
      throw error;
    }
  },

  // Supprimer un média d'un lieu
  deleteVenueMedia: async (token, venueId, mediaId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.VENUE_MEDIA}/${venueId}/media/${mediaId}`,
      {
        method: 'DELETE',
      },
      token
    );
  },

  // Récupérer les médias d'un DJ
  getDjMedia: async (identifier, type = null) => {
    const url = type 
      ? `/api/dj/${identifier}/media?type=${type}`
      : `/api/dj/${identifier}/media`;
    return apiRequest(url);
  },

  // Mettre à jour le titre d'un média
  updateDjMediaTitle: async (token, mediaId, title) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      `/api/dj/media/${mediaId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ title }),
      },
      token
    );
  },

  // Supprimer un média
  deleteDjMedia: async (token, mediaId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      `/api/dj/media/${mediaId}`,
      {
        method: 'DELETE',
      },
      token
    );
  },

  // Récupérer les bookings d'un DJ
  getDjBookings: async (token) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(API_CONFIG.ENDPOINTS.DJ_BOOKINGS, { noCache: true }, token);
  },

  // Accepter une invitation à un événement
  acceptInvitation: async (token, invitationId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.DJ_ACCEPT_INVITATION}/${invitationId}/accept`,
      {
        method: 'PUT',
      },
      token
    );
  },

  // Refuser une invitation à un événement
  rejectInvitation: async (token, invitationId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.DJ_REJECT_INVITATION}/${invitationId}/reject`,
      {
        method: 'PUT',
      },
      token
    );
  },

  // Récupérer les DJs disponibles pour un booker
  getAvailableDjs: async (token, date = null) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    const url = date 
      ? `${API_CONFIG.ENDPOINTS.BOOKER_AVAILABLE_DJS}?date=${encodeURIComponent(date)}`
      : API_CONFIG.ENDPOINTS.BOOKER_AVAILABLE_DJS;
    return apiRequest(url, {}, token);
  },

  // Récupérer tous les lieux disponibles
  getVenues: async (token) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(API_CONFIG.ENDPOINTS.BOOKER_VENUES, {}, token);
  },

  // Récupérer les événements d'un booker
  getBookerEvents: async (token) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(API_CONFIG.ENDPOINTS.BOOKER_EVENTS, { noCache: true }, token);
  },

  // ✅ Booking payment (Booker -> DJ): mettre à jour statut/montant/facture
  updateBookingPayment: async (token, eventDjId, { status, amount, currency, invoiceNumber } = {}) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    if (!eventDjId) {
      throw new Error('eventDjId requis.');
    }
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.BOOKER_EVENTDJ_PAYMENT}/${eventDjId}/payment`,
      {
        method: 'PUT',
        body: JSON.stringify({ status, amount, currency, invoiceNumber }),
      },
      token
    );
  },

  // ✅ Contrat booking (Booker <-> DJ) intégré au chat privé
  getBookingContract: async (token, eventDjId) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!eventDjId) throw new Error('eventDjId requis.');
    return apiRequest(`${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTDJS}/${eventDjId}`, { noCache: true }, token);
  },

  saveBookingContractDraft: async (token, eventDjId, payload) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!eventDjId) throw new Error('eventDjId requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTDJS}/${eventDjId}/draft`,
      { method: 'PUT', body: JSON.stringify({ payload: payload || {} }) },
      token
    );
  },

  sendBookingContract: async (token, eventDjId) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!eventDjId) throw new Error('eventDjId requis.');
    return apiRequest(`${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTDJS}/${eventDjId}/send`, { method: 'POST' }, token);
  },

  acceptBookingContract: async (token, eventDjId) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!eventDjId) throw new Error('eventDjId requis.');
    return apiRequest(`${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTDJS}/${eventDjId}/accept`, { method: 'POST' }, token);
  },

  counterBookingContract: async (token, eventDjId, payload) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!eventDjId) throw new Error('eventDjId requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTDJS}/${eventDjId}/counter`,
      { method: 'POST', body: JSON.stringify({ payload: payload || {} }) },
      token
    );
  },

  // Ajouter un DJ à un événement existant (Booker)
  addDjToEvent: async (token, eventId, djId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    if (!eventId || !djId) {
      throw new Error('eventId et djId sont requis.');
    }
    return apiRequest(
      `/api/booker/events/${eventId}/djs`,
      {
        method: 'POST',
        body: JSON.stringify({ djId }),
      },
      token
    );
  },

  // Créer un événement (booker)
  createEvent: async (token, eventData) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      API_CONFIG.ENDPOINTS.BOOKER_CREATE_EVENT,
      {
        method: 'POST',
        body: JSON.stringify(eventData),
      },
      token
    );
  },

  // Supprimer un événement (booker)
  deleteEvent: async (token, eventId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.BOOKER_DELETE_EVENT}/${eventId}`,
      {
        method: 'DELETE',
      },
      token
    );
  },

  // ✅ Modifier un événement (booker) - champs limités
  updateEvent: async (token, eventId, updates = {}) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!eventId) throw new Error('eventId requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.BOOKER_CREATE_EVENT}/${eventId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates || {}),
      },
      token
    );
  },

  // ✅ Uploader une image d'événement (booker)
  uploadEventImage: async (token, eventId, imageUri) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!eventId) throw new Error('eventId requis.');
    if (!imageUri) throw new Error('L\'URI de l\'image est requise.');

    const formData = new FormData();
    const fileData = {
      uri: imageUri,
      type: getMimeType(imageUri, 'photo'),
      name: getFileName(imageUri),
    };
    formData.append('image', fileData);

    const uploadUrl = `${API_CONFIG.BASE_URL}/api/booker/events/${eventId}/upload-image`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Échec de l\'upload de l\'image.');
    }
    return result;
  },

  // ============================================
  // CHAT - Communication DJ/Booker
  // ============================================

  // Envoyer un message dans une conversation
  sendMessage: async (token, eventDjId, content) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    if (!content || !content.trim()) {
      throw new Error('Le contenu du message est requis.');
    }
    return apiRequest(
      `/api/chat/${eventDjId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content: content.trim() }),
      },
      token
    );
  },

  // Récupérer les messages d'une conversation
  getMessages: async (token, eventDjId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    // ✅ Jamais de cache pour le chat (sinon les nouveaux messages n'apparaissent pas)
    return apiRequest(`/api/chat/${eventDjId}/messages`, { noCache: true }, token);
  },

  // Marquer un message comme lu
  markMessageAsRead: async (token, messageId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      `/api/chat/messages/${messageId}/read`,
      {
        method: 'PUT',
      },
      token
    );
  },

  // Supprimer un message (soft delete)
  deleteMessage: async (token, messageId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      `/api/chat/messages/${messageId}`,
      {
        method: 'DELETE',
      },
      token
    );
  },

  // Récupérer toutes les conversations (pour DJ ou Booker)
  getConversations: async (token) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    // ✅ Jamais de cache pour le chat
    return apiRequest('/api/chat/conversations', { noCache: true }, token);
  },

  // Récupérer le nombre total de messages non lus
  getUnreadMessagesCount: async (token) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    // ✅ Ne jamais mettre en cache (doit refléter instantanément l'état)
    return apiRequest('/api/chat/unread-count', { noCache: true }, token);
  },

  // Marquer tous les messages non lus comme lus
  markAllMessagesAsRead: async (token) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest('/api/chat/mark-all-read', { method: 'PUT' }, token);
  },

  // ============================================
  // CHAT DE GROUPE - Communication entre tous les DJs d'un événement
  // ============================================

  // Envoyer un message dans le chat de groupe d'un événement
  sendGroupMessage: async (token, eventId, content) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    if (!content || !content.trim()) {
      throw new Error('Le contenu du message est requis.');
    }
    return apiRequest(
      `/api/chat/group/${eventId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content: content.trim() }),
      },
      token
    );
  },

  // Récupérer les messages du chat de groupe d'un événement
  getGroupMessages: async (token, eventId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    // ✅ Jamais de cache pour le chat
    return apiRequest(`/api/chat/group/${eventId}/messages`, { noCache: true }, token);
  },

  // ============================================
  // ✅ AJOUT: FEED D'ACTUALITÉ - Posts des DJs et annonces d'événements
  // ============================================

  // Créer un nouveau post dans le feed (DJ uniquement)
  createFeedPost: async (token, content, imageUrl = null) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    if (!content || !content.trim()) {
      throw new Error('Le contenu du post est requis.');
    }
    return apiRequest(
      '/api/feed/post',
      {
        method: 'POST',
        body: JSON.stringify({ content: content.trim(), imageUrl }),
      },
      token
    );
  },

  // Récupérer le feed d'actualité (posts + événements)
  // ✅ CORRECTION: Désactiver le cache pour toujours récupérer les posts les plus récents
  // Cela garantit que les nouveaux utilisateurs voient tous les posts historiques
  getFeed: async (limit = 20, offset = 0) => {
    return apiRequest(`/api/feed?limit=${limit}&offset=${offset}`, { noCache: true });
  },

  // ✅ AJOUT: Uploader une image pour un post du feed
  uploadFeedPostImage: async (token, imageUri) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    if (!imageUri) {
      throw new Error('L\'URI de l\'image est requise.');
    }

    logger.debug('[uploadFeedPostImage] Début upload:', { imageUri: imageUri.substring(0, 50) + '...' });

    // Créer un FormData pour l'upload (format React Native)
    const formData = new FormData();
    const fileData = {
      uri: imageUri,
      type: getMimeType(imageUri, 'photo'),
      name: getFileName(imageUri),
    };
    logger.debug('[uploadFeedPostImage] File data:', { type: fileData.type, name: fileData.name });

    formData.append('image', fileData);

    const uploadUrl = `${API_CONFIG.BASE_URL}/api/feed/post/upload-image`;
    logger.debug('[uploadFeedPostImage] URL:', uploadUrl);

    // Utiliser fetch (plus robuste sur Android que axios pour FormData)
    try {
      logger.debug('[uploadFeedPostImage] Envoi de la requête avec fetch...');
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // Ne pas définir Content-Type manuellement, React Native le fera automatiquement avec la boundary
        },
        body: formData,
      });

      const result = await response.json();
      logger.debug('[uploadFeedPostImage] Réponse:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Échec de l\'upload de l\'image.');
      }

      return result;
    } catch (error) {
      logger.error('[uploadFeedPostImage] Erreur catch:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack?.substring(0, 200)
      });

      if (error.message && (error.message.includes('Network request failed') || error.message.includes('Network Error'))) {
        throw new Error('Erreur réseau - Vérifiez votre connexion internet et réessayez. Si le problème persiste, l\'image est peut-être trop volumineuse.');
      }
      throw error;
    }
  },

  // ✅ AJOUT: Supprimer un post du feed (uniquement par l'auteur)
  deleteFeedPost: async (token, postId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(`/api/feed/post/${postId}`, {
      method: 'DELETE',
    }, token);
  },

  // ✅ AJOUT: Liker ou unliker un post
  toggleLikePost: async (token, postId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(`/api/feed/post/${postId}/like`, {
      method: 'POST',
    }, token);
  },

  // ✅ AJOUT: Vérifier si l'utilisateur a liké un post
  checkPostLiked: async (token, postId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(`/api/feed/post/${postId}/like`, {}, token);
  },

  // ✅ AJOUT: Créer un commentaire sur un post
  createComment: async (token, postId, content) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    if (!content || !content.trim()) {
      throw new Error('Le contenu du commentaire est requis.');
    }
    return apiRequest(`/api/feed/post/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ content: content.trim() }),
    }, token);
  },

  // ✅ AJOUT: Récupérer les commentaires d'un post
  getPostComments: async (postId, limit = 20, offset = 0) => {
    return apiRequest(`/api/feed/post/${postId}/comments?limit=${limit}&offset=${offset}`, {});
  },

  // ============================================
  // ✅ AJOUT: NOTIFICATIONS DU FEED - Interactions sur les posts
  // ============================================

  // Récupérer les notifications du feed
  getFeedNotifications: async (token, limit = 20, offset = 0) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(`/api/feed/notifications?limit=${limit}&offset=${offset}`, {}, token);
  },

  // Récupérer le nombre de notifications non lues
  getFeedNotificationsUnreadCount: async (token) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    // ✅ Ne jamais mettre en cache
    return apiRequest('/api/feed/notifications/unread-count', { noCache: true }, token);
  },

  // Marquer une notification comme lue
  markFeedNotificationRead: async (token, notificationId) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(`/api/feed/notifications/${notificationId}/read`, {
      method: 'PUT',
    }, token);
  },

  // Marquer toutes les notifications comme lues
  markAllFeedNotificationsRead: async (token) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest('/api/feed/notifications/mark-all-read', {
      method: 'PUT',
    }, token);
  },

  // =========================================================================
  // ADMIN (nécessite user.role === 'ADMIN')
  // =========================================================================
  adminMe: async (token) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest('/api/admin/me', { noCache: true }, token);
  },
  adminListUsers: async (token) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest('/api/admin/users', { noCache: true }, token);
  },
  adminSetUserRole: async (token, userId, role) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!userId) throw new Error('userId requis.');
    return apiRequest(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }, token);
  },
  adminListFeedPosts: async (token, limit = 50, offset = 0) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest(`/api/admin/feed/posts?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`, { noCache: true }, token);
  },
  adminDeleteFeedPost: async (token, postId) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!postId) throw new Error('postId requis.');
    return apiRequest(`/api/admin/feed/posts/${postId}`, { method: 'DELETE' }, token);
  },

  adminListReports: async (token, status = null) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiRequest(`/api/admin/reports${qs}`, { noCache: true }, token);
  },
  adminUpdateReport: async (token, reportId, updates = {}) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!reportId) throw new Error('reportId requis.');
    return apiRequest(`/api/admin/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(updates || {}),
    }, token);
  },
  adminListEvents: async (token, limit = 50, offset = 0) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest(`/api/admin/events?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`, { noCache: true }, token);
  },
  adminDeleteEvent: async (token, eventId) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!eventId) throw new Error('eventId requis.');
    return apiRequest(`/api/admin/events/${eventId}`, { method: 'DELETE' }, token);
  },

  // =========================================================================
  // REPORTS (signalement)
  // =========================================================================
  createReport: async (token, payload = {}) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }, token);
  },
};

// Fonction helper pour normaliser les URLs des médias
// Remplace uniquement les anciennes URLs de tunnel (différentes de l'actuel) et convertit les URLs relatives en URLs absolues
export const normalizeMediaUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return url;
  }

  // Si c'est une URL HTTP/HTTPS complète
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Extraire le domaine de l'URL fournie
    const urlMatch = url.match(/^(https?:\/\/[^\/]+)/);
    if (urlMatch) {
      const urlDomain = urlMatch[1];
      const baseUrlDomain = API_CONFIG.BASE_URL.replace(/\/$/, ''); // Retirer le slash final si présent
      
      // Vérifier si c'est une URL de tunnel Cloudflare
      const isTunnelUrl = /\.trycloudflare\.com/.test(urlDomain);
      
      // Ne remplacer que si :
      // 1. C'est une URL de tunnel Cloudflare
      // 2. ET le domaine est différent de celui actuel
      if (isTunnelUrl && urlDomain !== baseUrlDomain) {
        // Remplacer uniquement le domaine, en conservant le chemin
        const normalizedUrl = url.replace(/^(https?:\/\/[^\/]+)/, baseUrlDomain);
        logger.debug('[NORMALIZE URL] Ancienne URL tunnel remplacée:', { old: url, new: normalizedUrl });
        return normalizedUrl;
      }
    }
    // URL déjà complète et valide (même domaine ou non-tunnel)
    return url;
  }
  
  // Si c'est une URL relative, la convertir en URL absolue avec le BASE_URL
  if (url.startsWith('/')) {
    return `${API_CONFIG.BASE_URL}${url}`;
  }
  
  // Sinon, retourner l'URL telle quelle
  return url;
};

export { api, API_CONFIG };

