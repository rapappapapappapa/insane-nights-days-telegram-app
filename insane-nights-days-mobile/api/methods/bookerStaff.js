export function createBookerStaffApiMethods({ apiRequest, getMimeType, getFileName, API_CONFIG }) {
  return {
  // ============================================
  // Amis Organisateur + Staff + Scan QR
  // ============================================
  getBookerFriends: async (token) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(API_CONFIG.ENDPOINTS.BOOKER_FRIENDS, {}, token);
  },
  addBookerFriend: async (token, communityId) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(API_CONFIG.ENDPOINTS.BOOKER_FRIENDS, {
      method: 'POST',
      body: JSON.stringify({ communityId }),
    }, token);
  },
  getBookerFriendRequests: async (token) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(API_CONFIG.ENDPOINTS.COMMUNITY_BOOKER_REQUESTS, {}, token);
  },
  getStaffEvents: async (token) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(API_CONFIG.ENDPOINTS.COMMUNITY_STAFF_EVENTS, {}, token);
  },
  respondBookerFriendRequest: async (token, requestId, accept) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.BOOKER_FRIENDS}/${requestId}/respond`,
      { method: 'PUT', body: JSON.stringify({ accept }) },
      token
    );
  },
  getEventStaff: async (token, eventId) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(`${API_CONFIG.ENDPOINTS.EVENT_STAFF}/${eventId}/staff`, {}, token);
  },
  addEventStaff: async (token, eventId, communityId) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.EVENT_STAFF}/${eventId}/staff`,
      { method: 'POST', body: JSON.stringify({ communityId }) },
      token
    );
  },
  removeEventStaff: async (token, eventId, communityId) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.EVENT_STAFF}/${eventId}/staff/${communityId}`,
      { method: 'DELETE' },
      token
    );
  },
  scanTicket: async (token, eventId, qrCode) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(
      `${API_CONFIG.ENDPOINTS.SCAN_TICKET}/${eventId}/scan-ticket`,
      { method: 'POST', body: JSON.stringify({ qrCode }) },
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
  };
}
