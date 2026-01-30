// Centralized API base URL for the web client.
// - In production: defaults to Railway backend
// - In dev: you can override with REACT_APP_API_BASE (Create React App style)
//
// Example:
//   REACT_APP_API_BASE=http://localhost:5000 npm start

const DEFAULT_API_BASE = 'https://insane-nights-days-telegram-app-production.up.railway.app';

export function getApiBase() {
  const raw = (process.env.REACT_APP_API_BASE || DEFAULT_API_BASE || '').trim();
  return raw.replace(/\/$/, '');
}

