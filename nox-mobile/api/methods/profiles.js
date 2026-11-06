import logger from '../../utils/logger';

export function createProfilesApiMethods({ apiRequest, getMimeType, getFileName, API_CONFIG }) {
  return {
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
    const profiles = await apiRequest(API_CONFIG.ENDPOINTS.USER_PROFILES, { noCache: true }, token);
    if (profiles?.success && profiles?.profiles?.booker?.[0]) {
      return { success: true, profile: profiles.profiles.booker[0] };
    }
    return { success: false, message: 'Profil Booker non trouvé.' };
  },

  // ✅ AJOUT: Mettre à jour le profil Booker
  updateBookerProfile: async (token, nom, prenom, phonePro, bookerType, pseudo = null, legalFields = {}) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    const body = { nom, prenom, phonePro, bookerType, pseudo: pseudo?.trim() || null };
    if (legalFields.companyName !== undefined) body.companyName = legalFields.companyName;
    if (legalFields.address !== undefined) body.address = legalFields.address;
    if (legalFields.postalCode !== undefined) body.postalCode = legalFields.postalCode;
    if (legalFields.city !== undefined) body.city = legalFields.city;
    if (legalFields.country !== undefined) body.country = legalFields.country;
    if (legalFields.siret !== undefined) body.siret = legalFields.siret;
    return apiRequest(
      API_CONFIG.ENDPOINTS.BOOKER_PROFILE,
      { method: 'PUT', body: JSON.stringify(body) },
      token
    );
  },

  updatePrestataireProfile: async (token, fields) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      API_CONFIG.ENDPOINTS.PRESTATAIRE_PROFILE,
      { method: 'PUT', body: JSON.stringify(fields || {}) },
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

  // Récupérer les bookings d'un lieu (événements où il est associé via EventVenue)
  getVenueBookings: async (token) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest(API_CONFIG.ENDPOINTS.VENUE_BOOKINGS, { noCache: true }, token);
  },

  getPrestataireBookings: async (token) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest(API_CONFIG.ENDPOINTS.PRESTATAIRE_BOOKINGS, { noCache: true }, token);
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

  // Annuler un booking DJ (après acceptation)
  cancelDjBooking: async (token, invitationId, reason = null) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.DJ_REJECT_INVITATION}/${invitationId}/cancel`,
      {
        method: 'PUT',
        body: JSON.stringify(reason ? { reason } : {}),
      },
      token
    );
  },

  // Refuser une invitation à un événement (reason optionnel)
  rejectInvitation: async (token, invitationId, reason = null) => {
    if (!token) {
      throw new Error('Token d\'authentification requis.');
    }
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.DJ_REJECT_INVITATION}/${invitationId}/reject`,
      {
        method: 'PUT',
        body: JSON.stringify(reason ? { reason } : {}),
      },
      token
    );
  },

  // Accepter une invitation lieu à un événement
  acceptVenueInvitation: async (token, eventVenueId) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.VENUE_ACCEPT_INVITATION}/${eventVenueId}/accept`,
      { method: 'PUT' },
      token
    );
  },

  // Annuler un booking lieu (après acceptation)
  cancelVenueBooking: async (token, eventVenueId, reason = null) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.VENUE_REJECT_INVITATION}/${eventVenueId}/cancel`,
      {
        method: 'PUT',
        body: JSON.stringify(reason ? { reason } : {}),
      },
      token
    );
  },

  // Refuser une invitation lieu à un événement
  rejectVenueInvitation: async (token, eventVenueId, reason = null) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.VENUE_REJECT_INVITATION}/${eventVenueId}/reject`,
      {
        method: 'PUT',
        body: JSON.stringify(reason ? { reason } : {}),
      },
      token
    );
  },

  acceptPrestataireInvitation: async (token, eventPrestataireId) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.PRESTATAIRE_ACCEPT_INVITATION}/${eventPrestataireId}/accept`,
      { method: 'PUT' },
      token
    );
  },
  cancelPrestataireBooking: async (token, eventPrestataireId, reason = null) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.PRESTATAIRE_REJECT_INVITATION}/${eventPrestataireId}/cancel`,
      {
        method: 'PUT',
        body: JSON.stringify(reason ? { reason } : {}),
      },
      token
    );
  },
  rejectPrestataireInvitation: async (token, eventPrestataireId, reason = null) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.PRESTATAIRE_REJECT_INVITATION}/${eventPrestataireId}/reject`,
      {
        method: 'PUT',
        body: JSON.stringify(reason ? { reason } : {}),
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

  getAvailablePrestataires: async (token, date = null) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    const url = date
      ? `${API_CONFIG.ENDPOINTS.BOOKER_AVAILABLE_PRESTATAIRES}?date=${encodeURIComponent(date)}`
      : API_CONFIG.ENDPOINTS.BOOKER_AVAILABLE_PRESTATAIRES;
    return apiRequest(url, {}, token);
  },

  addPrestataireToEvent: async (token, eventId, prestataireId) => {
    if (!token || !eventId || !prestataireId) throw new Error('Paramètres requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.BOOKER_EVENTS}/${eventId}/prestataires`,
      { method: 'POST', body: JSON.stringify({ prestataireId }) },
      token
    );
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
  };
}
