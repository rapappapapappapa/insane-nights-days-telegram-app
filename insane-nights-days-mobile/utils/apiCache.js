/**
 * Système de cache pour les requêtes API
 * Réduit les appels réseau en mettant en cache les réponses GET
 */

import logger from './logger';

class ApiCache {
  constructor(defaultTtl = 5 * 60 * 1000) {
    // TTL par défaut : 5 minutes
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
  }

  /**
   * Génère une clé de cache à partir de l'endpoint et des options
   * @param {string} endpoint - L'endpoint API
   * @param {Object} options - Les options de la requête
   * @param {string|null} token - Le token d'authentification (optionnel)
   * @returns {string} - La clé de cache
   */
  generateKey(endpoint, options = {}, token = null) {
    // Ne pas inclure le token dans la clé pour permettre le partage de cache entre utilisateurs
    // Mais inclure un hash si nécessaire pour différencier les requêtes authentifiées
    const tokenHash = token ? 'auth' : 'public';
    const optionsStr = JSON.stringify({
      method: options.method || 'GET',
      body: options.body ? '[BODY]' : undefined, // Ne pas mettre le body complet pour éviter des clés trop longues
    });
    return `${endpoint}-${optionsStr}-${tokenHash}`;
  }

  /**
   * Récupère une valeur du cache
   * @param {string} key - La clé de cache
   * @returns {any|null} - Les données en cache ou null si expirées/inexistantes
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // Vérifier si l'item a expiré
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      logger.debug('[ApiCache] Cache expiré pour:', key);
      return null;
    }

    logger.debug('[ApiCache] Cache hit pour:', key);
    return item.data;
  }

  /**
   * Met une valeur en cache
   * @param {string} key - La clé de cache
   * @param {any} data - Les données à mettre en cache
   * @param {number|null} ttl - Time to live en millisecondes (optionnel, utilise defaultTtl si non fourni)
   */
  set(key, data, ttl = null) {
    const expiry = Date.now() + (ttl || this.defaultTtl);
    this.cache.set(key, {
      data,
      expiry,
    });
    logger.debug('[ApiCache] Données mises en cache:', key, 'expire dans', ttl || this.defaultTtl, 'ms');
  }

  /**
   * Supprime une entrée du cache
   * @param {string} key - La clé à supprimer
   */
  delete(key) {
    this.cache.delete(key);
    logger.debug('[ApiCache] Entrée supprimée du cache:', key);
  }

  /**
   * Vide tout le cache
   */
  clear() {
    this.cache.clear();
    logger.debug('[ApiCache] Cache vidé');
  }

  /**
   * Supprime toutes les entrées expirées du cache
   */
  cleanExpired() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.debug('[ApiCache]', cleaned, 'entrées expirées supprimées');
    }
  }

  /**
   * Récupère la taille du cache
   * @returns {number} - Le nombre d'entrées dans le cache
   */
  size() {
    return this.cache.size;
  }
}

// Instance singleton
export const apiCache = new ApiCache();

// Nettoyer le cache toutes les 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    apiCache.cleanExpired();
  }, 10 * 60 * 1000);
}
