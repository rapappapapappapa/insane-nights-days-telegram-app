import logger from '../utils/logger';
import { API_CONFIG } from './endpointsConfig';

/** Normalise les URLs des médias (tunnels Cloudflare, chemins relatifs, hôtes locaux / obsolètes). */
export const normalizeMediaUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return url;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }

  const baseNoSlash = API_CONFIG.BASE_URL.replace(/\/$/, '');

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const urlMatch = trimmed.match(/^(https?:\/\/[^\/]+)/);
    if (urlMatch) {
      const urlDomain = urlMatch[1];
      const isTunnelUrl = /\.trycloudflare\.com/.test(urlDomain);

      if (isTunnelUrl && urlDomain !== baseNoSlash) {
        const normalizedUrl = trimmed.replace(/^(https?:\/\/[^\/]+)/, baseNoSlash);
        logger.debug('[NORMALIZE URL] Ancienne URL tunnel remplacée:', { old: trimmed, new: normalizedUrl });
        return normalizedUrl;
      }
    }

    // Fichiers sous /uploads/ servis par notre API : réécrire vers EXPO_PUBLIC_API_BASE si l’hôte
    // ne correspond pas (localhost, IP LAN, ancien domaine Railway, etc.) — sinon le téléphone ne charge pas l’image.
    try {
      const u = new URL(trimmed);
      const apiBase = new URL(baseNoSlash);
      if (u.pathname.startsWith('/uploads/')) {
        const rewriteHost =
          u.hostname === 'localhost' ||
          u.hostname === '127.0.0.1' ||
          u.hostname !== apiBase.hostname;
        if (rewriteHost) {
          const rewritten = `${apiBase.origin}${u.pathname}${u.search}`;
          logger.debug('[NORMALIZE URL] /uploads/ réécrit vers BASE_URL:', { old: trimmed, new: rewritten });
          return rewritten;
        }
      }
    } catch (e) {
      // URL absolue invalide
    }

    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `${baseNoSlash}${trimmed}`;
  }

  return trimmed;
};
