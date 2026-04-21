import logger from '../utils/logger';
import { API_CONFIG } from './endpointsConfig';

/** Normalise les URLs des médias (tunnels Cloudflare, chemins relatifs). */
export const normalizeMediaUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return url;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    const urlMatch = url.match(/^(https?:\/\/[^\/]+)/);
    if (urlMatch) {
      const urlDomain = urlMatch[1];
      const baseUrlDomain = API_CONFIG.BASE_URL.replace(/\/$/, '');
      const isTunnelUrl = /\.trycloudflare\.com/.test(urlDomain);

      if (isTunnelUrl && urlDomain !== baseUrlDomain) {
        const normalizedUrl = url.replace(/^(https?:\/\/[^\/]+)/, baseUrlDomain);
        logger.debug('[NORMALIZE URL] Ancienne URL tunnel remplacée:', { old: url, new: normalizedUrl });
        return normalizedUrl;
      }
    }
    return url;
  }

  if (url.startsWith('/')) {
    return `${API_CONFIG.BASE_URL}${url}`;
  }

  return url;
};
