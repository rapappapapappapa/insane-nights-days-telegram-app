import logger from '../../utils/logger';

export function createFeedApiMethods({ apiRequest, getMimeType, getFileName, API_CONFIG }) {
  return {
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
  getFeed: async (limit = 20, offset = 0, token = null) => {
    return apiRequest(`/api/feed?limit=${limit}&offset=${offset}`, { noCache: true }, token);
  },

  getFeedFollowing: async (token, limit = 50, offset = 0) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(`/api/feed/following?limit=${limit}&offset=${offset}`, { noCache: true }, token);
  },

  // ✅ Abonnements : suivre / ne plus suivre un profil (DJ ou Booker)
  followDj: async (token, djId) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(`/api/follow/dj/${djId}`, { method: 'POST' }, token);
  },
  unfollowDj: async (token, djId) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(`/api/follow/dj/${djId}`, { method: 'DELETE' }, token);
  },
  followBooker: async (token, bookerId) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(`/api/follow/booker/${bookerId}`, { method: 'POST' }, token);
  },
  unfollowBooker: async (token, bookerId) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(`/api/follow/booker/${bookerId}`, { method: 'DELETE' }, token);
  },
  getFollowStatus: async (token, { djId, bookerId }) => {
    if (!token) throw new Error('Token requis.');
    const params = new URLSearchParams();
    if (djId) params.set('djId', djId);
    if (bookerId) params.set('bookerId', bookerId);
    return apiRequest(`/api/follow/status?${params}`, {}, token);
  },
  getBookerProfileById: async (bookerId) => {
    return apiRequest(`/api/booker/${bookerId}/public`);
  },

  getCommunityProfile: async (token) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest('/api/user/community/profile', {}, token);
  },
  getCommunityProfileById: async (token, communityId) => {
    if (!token || !communityId) throw new Error('Token et communityId requis.');
    return apiRequest(`/api/user/community/${communityId}`, {}, token);
  },
  updateCommunityProfile: async (token, { pseudo, genres }) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest('/api/user/community/profile', {
      method: 'PUT',
      body: JSON.stringify({ pseudo: pseudo?.trim() || null, genres: genres?.trim() || null }),
    }, token);
  },
  uploadCommunityProfileImage: async (token, imageUri, type = 'profile') => {
    if (!token) throw new Error('Token requis.');
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: getMimeType(imageUri, 'photo'),
      name: getFileName(imageUri),
    });
    const url = `${API_CONFIG.BASE_URL}/api/user/community/profile/upload-image?type=${type}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Erreur upload');
    return data;
  },

  // Amis Communauté
  getCommunityFriends: async (token) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest('/api/user/community/friends', {}, token);
  },
  getCommunityFriendRequests: async (token) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest('/api/user/community/friends/requests', {}, token);
  },
  sendCommunityFriendRequest: async (token, requestedCommunityId) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest('/api/user/community/friends/request', {
      method: 'POST',
      body: JSON.stringify({ requestedCommunityId }),
    }, token);
  },
  respondToCommunityFriendRequest: async (token, requestId, action) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(`/api/user/community/friends/requests/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    }, token);
  },
  removeCommunityFriend: async (token, friendshipId) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(`/api/user/community/friends/${friendshipId}`, {
      method: 'DELETE',
    }, token);
  },

  // Groupes d'événements (amis qui vont ensemble)
  createEventGroup: async (token, eventId, { name, friendCommunityIds } = {}) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(`/api/events/${eventId}/groups`, {
      method: 'POST',
      body: JSON.stringify({ name: name || null, friendCommunityIds: friendCommunityIds || [] }),
    }, token);
  },
  getEventGroups: async (token, eventId) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(`/api/events/${eventId}/groups`, {}, token);
  },
  inviteToEventGroup: async (token, eventId, groupId, communityIds) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(`/api/events/${eventId}/groups/${groupId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ communityIds }),
    }, token);
  },
  respondToEventGroupInvitation: async (token, groupId, action) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest(`/api/event-groups/${groupId}/respond`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    }, token);
  },
  getEventGroupInvitations: async (token) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest('/api/user/community/event-groups/invitations', {}, token);
  },

  searchCommunities: async (token, query) => {
    if (!token) throw new Error('Token requis.');
    const q = encodeURIComponent((query || '').trim());
    return apiRequest(`/api/user/community/search?q=${q}`, {}, token);
  },
  checkCommunityPseudoAvailable: async (token, pseudo) => {
    if (!token) throw new Error('Token requis.');
    const p = encodeURIComponent((pseudo || '').trim());
    return apiRequest(`/api/user/community/pseudo/check?pseudo=${p}`, {}, token);
  },

  getVenueProfile: async (token) => {
    if (!token) throw new Error('Token requis.');
    return apiRequest('/api/user/venue/profile', {}, token);
  },
  updateVenueProfile: async (token, { venueName, address, companyName, legalRepresentative, postalCode, city, country, siret, maxCapacity }) => {
    if (!token) throw new Error('Token requis.');
    const body = { venueName: venueName?.trim() || null, address: address?.trim() || null };
    if (companyName !== undefined) body.companyName = companyName;
    if (legalRepresentative !== undefined) body.legalRepresentative = legalRepresentative;
    if (postalCode !== undefined) body.postalCode = postalCode;
    if (city !== undefined) body.city = city;
    if (country !== undefined) body.country = country;
    if (siret !== undefined) body.siret = siret;
    if (maxCapacity !== undefined) body.maxCapacity = maxCapacity;
    return apiRequest('/api/user/venue/profile', { method: 'PUT', body: JSON.stringify(body) }, token);
  },
  uploadVenueProfileImage: async (token, imageUri, type = 'profile') => {
    if (!token) throw new Error('Token requis.');
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: getMimeType(imageUri, 'photo'),
      name: getFileName(imageUri),
    });
    const url = `${API_CONFIG.BASE_URL}/api/user/venue/profile/upload-image?type=${type}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Erreur upload');
    return data;
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
  };
}
