export function createBookerEventsApiMethods({ apiRequest, getMimeType, getFileName, API_CONFIG }) {
  return {
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

  /** Prévisualisation PDF (réponse JSON { pdfBase64 }) — payload optionnel pour brouillon / contre-proposition */
  previewBookingContractPdf: async (token, eventDjId, payload) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!eventDjId) throw new Error('eventDjId requis.');
    const body = payload !== undefined ? JSON.stringify({ payload }) : JSON.stringify({});
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTDJS}/${eventDjId}/preview-pdf`,
      { method: 'POST', body },
      token,
      60000
    );
  },

  // Ajouter un DJ à un événement existant (Booker)
  addVenueToEvent: async (token, eventId, venueId) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!eventId || !venueId) throw new Error('eventId et venueId sont requis.');
    return apiRequest(
      `/api/booker/events/${eventId}/venues`,
      {
        method: 'POST',
        body: JSON.stringify({ venueId }),
      },
      token
    );
  },

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

  // Publier un événement sur le feed (uniquement si tous les contrats sont signés)
  publishEventToFeed: async (token, eventId) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!eventId) throw new Error('eventId requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.BOOKER_EVENTS}/${eventId}/publish-to-feed`,
      { method: 'POST' },
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

  /** Presets matériel NOX (location) — lang: 'fr' | 'en' */
  getRentalEquipmentPresets: async (token, lang = 'fr') => {
    if (!token) throw new Error('Token d\'authentification requis.');
    const l = lang === 'en' ? 'en' : 'fr';
    return apiRequest(`${API_CONFIG.ENDPOINTS.BOOKER_RENTAL_PRESETS}?lang=${l}`, {}, token);
  },

  /** Catalogue matériel réutilisable du booker */
  saveBookerRentalInventory: async (token, items) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    return apiRequest(
      API_CONFIG.ENDPOINTS.BOOKER_RENTAL_INVENTORY,
      { method: 'PUT', body: JSON.stringify({ items: Array.isArray(items) ? items : [] }) },
      token
    );
  },

  createContractPaymentIntent: async (token, kind, bookingId) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!kind || !bookingId) throw new Error('kind et bookingId requis.');
    return apiRequest(
      API_CONFIG.ENDPOINTS.PAYMENTS_CREATE_CONTRACT_INTENT,
      { method: 'POST', body: JSON.stringify({ kind, bookingId }) },
      token
    );
  },

  confirmContractPayment: async (token, paymentIntentId) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!paymentIntentId) throw new Error('paymentIntentId requis.');
    return apiRequest(
      API_CONFIG.ENDPOINTS.PAYMENTS_CONFIRM_CONTRACT_PAYMENT,
      { method: 'POST', body: JSON.stringify({ paymentIntentId }) },
      token
    );
  },

  retryContractSignature: async (token, kind, bookingId) => {
    if (!token) throw new Error('Token d\'authentification requis.');
    if (!kind || !bookingId) throw new Error('kind et bookingId requis.');
    const path =
      kind === 'venue'
        ? `${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTVENUES}/${bookingId}/retry-signature`
        : kind === 'prestataire'
          ? `${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTPRESTATAIRES}/${bookingId}/retry-signature`
          : `${API_CONFIG.ENDPOINTS.CONTRACTS_EVENTDJS}/${bookingId}/retry-signature`;
    return apiRequest(path, { method: 'POST' }, token);
  },
  };
}
