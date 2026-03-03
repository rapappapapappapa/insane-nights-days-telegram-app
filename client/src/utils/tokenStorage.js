// Stockage token pour le web (localStorage)
const TOKEN_KEY = 'insane_token';
const USER_DATA_KEY = 'insane_user';

export function saveToken(token) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
  return Promise.resolve();
}

export function getToken() {
  if (typeof window !== 'undefined') {
    return Promise.resolve(localStorage.getItem(TOKEN_KEY));
  }
  return Promise.resolve(null);
}

export function deleteToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  }
  return Promise.resolve();
}

export function saveUserData(data) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(data || {}));
  }
  return Promise.resolve();
}

export function getUserData() {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(USER_DATA_KEY);
      return Promise.resolve(raw ? JSON.parse(raw) : null);
    } catch {
      return Promise.resolve(null);
    }
  }
  return Promise.resolve(null);
}

export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload?.exp;
    if (!exp) return false;
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}
