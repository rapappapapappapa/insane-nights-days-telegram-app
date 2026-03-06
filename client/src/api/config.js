// Configuration API pour le client web
import { isTokenExpired } from '../utils/tokenStorage';

const API_BASE = (process.env.REACT_APP_API_BASE || 'https://insane-nights-days-telegram-app-production.up.railway.app').replace(/\/$/, '');
const TIMEOUT = 10000;

async function apiRequest(endpoint, options = {}, token = null) {
  const url = `${API_BASE}${endpoint}`;
  const method = options.method || 'GET';

  const config = {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...options,
    headers: { ...{ 'Content-Type': 'application/json' }, ...(options.headers || {}) },
  };

  if (token) {
    if (isTokenExpired(token)) {
      const err = new Error('Token expiré. Veuillez vous reconnecter.');
      err.status = 401;
      err.isTokenExpired = true;
      throw err;
    }
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  } else if (options.body) {
    config.body = options.body;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || TIMEOUT);

  try {
    const res = await fetch(url, { ...config, signal: controller.signal });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
      const msg = (data && typeof data === 'object' && data.message) || `Erreur HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = data;
      if (res.status === 401) err.isTokenExpired = true;
      throw err;
    }
    return data;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

export const api = {
  register: (body) => apiRequest('/api/auth/register', { method: 'POST', body }),
  login: (body) => apiRequest('/api/auth/login', { method: 'POST', body }),
  getCurrentUser: (token) => apiRequest('/api/user/me', { noCache: true }, token),
  getEvents: () => apiRequest('/api/events'),
  getEventById: (id) => apiRequest(`/api/events/${id}`),
  getMyTickets: (token) => apiRequest('/api/user/me/tickets', {}, token),
  getUserProfiles: (token) => apiRequest('/api/user/profiles', {}, token),
  switchProfile: (token, profileType) =>
    apiRequest('/api/user/switch-profile', { method: 'POST', body: { profileType } }, token),
  forgotPassword: (email) =>
    apiRequest('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (body) =>
    apiRequest('/api/auth/reset-password', { method: 'POST', body }),
  getFeed: (limit = 20, offset = 0, token = null) =>
    apiRequest(`/api/feed?limit=${limit}&offset=${offset}`, {}, token),
  getFeedFollowing: (token, limit = 50, offset = 0) =>
    apiRequest(`/api/feed/following?limit=${limit}&offset=${offset}`, {}, token),
  toggleLikePost: (token, postId) =>
    apiRequest(`/api/feed/post/${postId}/like`, { method: 'POST' }, token),
  checkPostLiked: (token, postId) =>
    apiRequest(`/api/feed/post/${postId}/like`, {}, token),
};

export const API_BASE_URL = API_BASE;
