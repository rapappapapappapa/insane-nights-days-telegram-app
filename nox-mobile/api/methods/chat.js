export function createChatApiMethods({ apiRequest, getMimeType, getFileName, API_CONFIG }) {
  return {
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

  // Chat Organisateur ↔ Lieu
  sendVenueMessage: async (token, eventVenueId, content) => {
    if (!token || !content?.trim()) throw new Error('Token et contenu requis.');
    return apiRequest(
      `/api/chat/event-venue/${eventVenueId}/messages`,
      { method: 'POST', body: JSON.stringify({ content: content.trim() }) },
      token
    );
  },
  getVenueMessages: async (token, eventVenueId) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(`/api/chat/event-venue/${eventVenueId}/messages`, { noCache: true }, token);
  },

  // Contrats Organisateur ↔ Lieu
  getVenueContract: async (token, eventVenueId) => {
    if (!token || !eventVenueId) throw new Error('Token et eventVenueId requis.');
    return apiRequest(`${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTVENUES}/${eventVenueId}`, { noCache: true }, token);
  },
  saveVenueContractDraft: async (token, eventVenueId, payload) => {
    if (!token || !eventVenueId) throw new Error('Token et eventVenueId requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTVENUES}/${eventVenueId}/draft`,
      { method: 'PUT', body: JSON.stringify({ payload: payload || {} }) },
      token
    );
  },
  sendVenueContract: async (token, eventVenueId) => {
    if (!token || !eventVenueId) throw new Error('Token et eventVenueId requis.');
    return apiRequest(`${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTVENUES}/${eventVenueId}/send`, { method: 'POST' }, token);
  },
  acceptVenueContract: async (token, eventVenueId) => {
    if (!token || !eventVenueId) throw new Error('Token et eventVenueId requis.');
    return apiRequest(`${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTVENUES}/${eventVenueId}/accept`, { method: 'POST' }, token);
  },
  counterVenueContract: async (token, eventVenueId, payload) => {
    if (!token || !eventVenueId) throw new Error('Token et eventVenueId requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTVENUES}/${eventVenueId}/counter`,
      { method: 'POST', body: JSON.stringify({ payload: payload || {} }) },
      token
    );
  },

  previewVenueContractPdf: async (token, eventVenueId, payload) => {
    if (!token || !eventVenueId) throw new Error('Token et eventVenueId requis.');
    const body = payload !== undefined ? JSON.stringify({ payload }) : JSON.stringify({});
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTVENUES}/${eventVenueId}/preview-pdf`,
      { method: 'POST', body },
      token,
      60000
    );
  },

  sendPrestataireMessage: async (token, eventPrestataireId, content) => {
    if (!token || !content?.trim()) throw new Error('Token et contenu requis.');
    return apiRequest(
      `/api/chat/event-prestataire/${eventPrestataireId}/messages`,
      { method: 'POST', body: JSON.stringify({ content: content.trim() }) },
      token
    );
  },
  getPrestataireMessages: async (token, eventPrestataireId) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(`/api/chat/event-prestataire/${eventPrestataireId}/messages`, { noCache: true }, token);
  },
  getPrestataireContract: async (token, eventPrestataireId) => {
    if (!token || !eventPrestataireId) throw new Error('Token et id requis.');
    return apiRequest(`${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTPRESTATAIRES}/${eventPrestataireId}`, { noCache: true }, token);
  },
  savePrestataireContractDraft: async (token, eventPrestataireId, payload) => {
    if (!token || !eventPrestataireId) throw new Error('Token et id requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTPRESTATAIRES}/${eventPrestataireId}/draft`,
      { method: 'PUT', body: JSON.stringify({ payload: payload || {} }) },
      token
    );
  },
  sendPrestataireContract: async (token, eventPrestataireId) => {
    if (!token || !eventPrestataireId) throw new Error('Token requis.');
    return apiRequest(`${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTPRESTATAIRES}/${eventPrestataireId}/send`, { method: 'POST' }, token);
  },
  acceptPrestataireContract: async (token, eventPrestataireId) => {
    if (!token || !eventPrestataireId) throw new Error('Token requis.');
    return apiRequest(`${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTPRESTATAIRES}/${eventPrestataireId}/accept`, { method: 'POST' }, token);
  },
  counterPrestataireContract: async (token, eventPrestataireId, payload) => {
    if (!token || !eventPrestataireId) throw new Error('Token requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTPRESTATAIRES}/${eventPrestataireId}/counter`,
      { method: 'POST', body: JSON.stringify({ payload: payload || {} }) },
      token
    );
  },
  previewPrestataireContractPdf: async (token, eventPrestataireId, payload) => {
    if (!token || !eventPrestataireId) throw new Error('Token requis.');
    const body = payload !== undefined ? JSON.stringify({ payload }) : JSON.stringify({});
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTPRESTATAIRES}/${eventPrestataireId}/preview-pdf`,
      { method: 'POST', body },
      token,
      60000
    );
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
  };
}
