export function createAdminApiMethods({ apiRequest, getMimeType, getFileName, API_CONFIG }) {
  return {
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
}
