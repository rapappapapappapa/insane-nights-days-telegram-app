/**
 * Point d'entrée API client : ré-exporte api, API_CONFIG et normalizeMediaUrl.
 * Implémentation découpée dans ./endpointsConfig, ./http, ./normalizeMediaUrl, ./apiMethods.
 */
import { API_CONFIG } from './endpointsConfig';
import { apiRequest, getMimeType, getFileName } from './http';
import { normalizeMediaUrl } from './normalizeMediaUrl';
import { createApiMethods } from './apiMethods';

const api = createApiMethods({ apiRequest, getMimeType, getFileName, API_CONFIG });

export { api, API_CONFIG, normalizeMediaUrl };
