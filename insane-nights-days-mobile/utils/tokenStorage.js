/**
 * Gestion sécurisée du stockage des tokens JWT
 * Utilise expo-secure-store pour un stockage chiffré
 */

import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import logger from './logger';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

/**
 * Vérifie si un token JWT est expiré
 * @param {string} token - Le token JWT à vérifier
 * @returns {boolean} - true si le token est expiré ou invalide
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const decoded = jwtDecode(token);
    // Vérifier si le token a une date d'expiration
    if (decoded.exp) {
      // exp est en secondes, Date.now() est en millisecondes
      return decoded.exp * 1000 < Date.now();
    }
    // Si pas d'expiration, considérer comme valide (mais devrait avoir une exp)
    return false;
  } catch (error) {
    // Si le token ne peut pas être décodé, il est invalide
    logger.warn('[TokenStorage] Erreur décodage token:', error.message);
    return true;
  }
};

/**
 * Sauvegarde le token de manière sécurisée
 * @param {string} token - Le token JWT à sauvegarder
 */
export const saveToken = async (token) => {
  try {
    if (!token) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      return;
    }
    
    // Vérifier que le token n'est pas expiré avant de le sauvegarder
    if (isTokenExpired(token)) {
      logger.warn('[TokenStorage] Tentative de sauvegarde d\'un token expiré');
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      return;
    }
    
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    logger.error('[TokenStorage] Erreur sauvegarde token:', error);
    throw error;
  }
};

/**
 * Récupère le token sauvegardé
 * @returns {string|null} - Le token ou null s'il n'existe pas ou est expiré
 */
export const getToken = async () => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    
    if (!token) {
      return null;
    }
    
    // Vérifier si le token est expiré
    if (isTokenExpired(token)) {
      logger.warn('[TokenStorage] Token expiré détecté, suppression...');
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      return null;
    }
    
    return token;
  } catch (error) {
    logger.error('[TokenStorage] Erreur récupération token:', error);
    return null;
  }
};

/**
 * Supprime le token sauvegardé
 */
export const deleteToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (error) {
    logger.error('[TokenStorage] Erreur suppression token:', error);
  }
};

/**
 * Sauvegarde les données utilisateur (sans données sensibles)
 * @param {Object} userData - Les données utilisateur à sauvegarder
 */
export const saveUserData = async (userData) => {
  try {
    if (!userData) {
      await SecureStore.deleteItemAsync(USER_KEY);
      return;
    }
    
    // Ne pas sauvegarder le token dans les données utilisateur
    const { token, password, ...safeUserData } = userData;
    
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(safeUserData));
  } catch (error) {
    logger.error('[TokenStorage] Erreur sauvegarde données utilisateur:', error);
  }
};

/**
 * Récupère les données utilisateur sauvegardées
 * @returns {Object|null} - Les données utilisateur ou null
 */
export const getUserData = async () => {
  try {
    const userDataString = await SecureStore.getItemAsync(USER_KEY);
    if (!userDataString) {
      return null;
    }
    return JSON.parse(userDataString);
  } catch (error) {
    logger.error('[TokenStorage] Erreur récupération données utilisateur:', error);
    return null;
  }
};

/**
 * Vérifie si un token est valide (non expiré et format correct)
 * @param {string} token - Le token à vérifier
 * @returns {boolean} - true si le token est valide
 */
export const isTokenValid = (token) => {
  if (!token) return false;
  return !isTokenExpired(token);
};
