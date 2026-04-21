import { isTokenExpired } from '../utils/tokenStorage';
import logger from '../utils/logger';
import { apiCache } from '../utils/apiCache';
import { retryApiCall, isRetryableError } from '../utils/retry';
import { API_CONFIG } from './endpointsConfig';

export const getMimeType = (uri, type) => {
  const extension = uri.split('.').pop().toLowerCase();
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mpeg: 'video/mpeg',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
  };
  return mimeTypes[extension] || (type === 'photo' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : 'audio/mpeg');
};

export const getFileName = (uri) => {
  const parts = uri.split('/');
  let fileName = parts[parts.length - 1];
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    const extension = uri.split('.').pop().toLowerCase();
    fileName = `media.${extension}`;
  }
  return fileName;
};

/** options.noCache: si true, bypass cache GET (utile pour /user/me après switchProfile) */
export const apiRequest = async (endpoint, options = {}, token = null, customTimeout = null) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const method = options.method || 'GET';
  const isGetRequest = method === 'GET' || !method;
  const { noCache, ...optionsForFetch } = options || {};
  const cacheKey = isGetRequest && !noCache ? apiCache.generateKey(endpoint, optionsForFetch, token) : null;

  if (isGetRequest && cacheKey) {
    const cachedData = apiCache.get(cacheKey);
    if (cachedData !== null) {
      logger.debug('[apiRequest] Données récupérées du cache pour:', endpoint);
      return cachedData;
    }
  }

  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: customTimeout || API_CONFIG.TIMEOUT,
  };

  if (token) {
    if (isTokenExpired(token)) {
      const expiredError = new Error('Token expiré. Veuillez vous reconnecter.');
      expiredError.status = 401;
      expiredError.isTokenExpired = true;
      throw expiredError;
    }
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...defaultOptions,
    ...optionsForFetch,
    headers: {
      ...defaultOptions.headers,
      ...(optionsForFetch?.headers || {}),
    },
  };

  const performRequest = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') ?? '';
      const isJson = contentType.includes('application/json');
      let data;

      if (isJson) {
        try {
          data = await response.json();
        } catch (parseError) {
          logger.warn('API Response Warning: impossible de parser la réponse JSON.', parseError);
          data = null;
        }
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMessage =
          (isJson && data && typeof data === 'object' && data.message) || `Erreur HTTP ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.payload = data;

        if (
          response.status === 401 ||
          (response.status === 403 &&
            (errorMessage.includes('Token invalide') ||
              errorMessage.includes('Token expiré') ||
              errorMessage.includes("Token d'authentification")))
        ) {
          error.isTokenExpired = true;
        }

        throw error;
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        const timeoutError = new Error('Timeout: La requête a pris trop de temps');
        timeoutError.status = 408;
        throw timeoutError;
      }

      throw error;
    }
  };

  try {
    const data = await retryApiCall(performRequest, {
      maxRetries: 2,
      delay: 500,
      shouldRetry: isRetryableError,
      exponentialBackoff: true,
    });

    if (isGetRequest && cacheKey && data) {
      apiCache.set(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (error?.message?.includes('Network request failed')) {
      logger.warn('API Request Warning: backend inaccessible après plusieurs tentatives, fallback local utilisé.');
      return null;
    }
    logger.error('API Request Error:', {
      message: error?.message || 'Unknown error',
      status: error?.status,
      name: error?.name,
      endpoint,
      isTokenExpired: error?.isTokenExpired,
    });
    throw error;
  }
};
