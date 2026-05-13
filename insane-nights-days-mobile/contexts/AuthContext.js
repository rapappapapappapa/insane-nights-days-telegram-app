import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api/config';
import { saveToken, getToken, deleteToken, saveUserData, getUserData, isTokenExpired } from '../utils/tokenStorage';
import { getLocalExpoPushToken, clearLocalExpoPushToken } from '../utils/pushTokenStorage';
import logger from '../utils/logger';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState({
    id: null,
    email: '',
    username: '',
    role: 'USER',
    emailVerified: false,
    level: 1,
    score: 0,
    activeProfileType: null,
    isAuthenticated: false,
    token: null,
  });
  const [isInitializing, setIsInitializing] = useState(true);

  // Charger le token sauvegardé au démarrage de l'app
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedToken = await getToken();
        const savedUserData = await getUserData();

        if (savedToken && !isTokenExpired(savedToken)) {
          // Vérifier la validité du token avec le backend
          try {
            const currentUser = await api.getCurrentUser(savedToken);
            if (currentUser && currentUser.success) {
              // Token valide, restaurer la session
              setUser({
                id: currentUser.user?.id ?? savedUserData?.id ?? null,
                email: currentUser.user?.email ?? savedUserData?.email ?? '',
                username: currentUser.user?.username ?? savedUserData?.username ?? '',
                role: currentUser.user?.role ?? savedUserData?.role ?? 'USER',
                emailVerified: currentUser.user?.emailVerified ?? savedUserData?.emailVerified ?? false,
                score: currentUser.user?.score ?? savedUserData?.score ?? 0,
                level: currentUser.user?.level ?? savedUserData?.level ?? 1,
                activeProfileType: currentUser.user?.activeProfileType ?? savedUserData?.activeProfileType ?? null,
                isAuthenticated: true,
                token: savedToken,
              });
            } else {
              // Token invalide côté backend, nettoyer
              await deleteToken();
              setUser({
                id: null,
                email: '',
                username: '',
                role: 'USER',
                emailVerified: false,
                level: 1,
                score: 0,
                activeProfileType: null,
                isAuthenticated: false,
                token: null,
              });
            }
          } catch (error) {
            // Erreur lors de la vérification (réseau, token invalide, etc.)
            logger.warn('[AuthContext] Erreur vérification token:', error.message);
            await deleteToken();
            setUser({
              id: null,
              email: '',
              username: '',
              role: 'USER',
              emailVerified: false,
              level: 1,
              score: 0,
              activeProfileType: null,
              isAuthenticated: false,
              token: null,
            });
          }
        } else {
          // Pas de token valide, nettoyer
          await deleteToken();
        }
      } catch (error) {
        logger.error('[AuthContext] Erreur initialisation auth:', error);
        await deleteToken();
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async ({ email, password }) => {
    try {
      const response = await api.login({ email, password });
      
      // Si le backend n'est pas accessible, api.login retourne null
      if (!response) {
        return { 
          success: false, 
          error: 'Backend inaccessible. Vérifie que le serveur est lancé et que tu es sur le même réseau Wi-Fi.' 
        };
      }

      if (!response.success) {
        return { 
          success: false, 
          error: response.message ?? 'Erreur de connexion.' 
        };
      }

      const userData = {
        id: response.user.id ?? null,
        email: response.user.email ?? '',
        username: response.user.username ?? '',
        role: response.user.role ?? 'USER',
        emailVerified: response.user.emailVerified ?? false,
        score: response.user.score ?? 0,
        level: response.user.level ?? 1,
        activeProfileType: response.user.activeProfileType ?? null,
        isAuthenticated: true,
        token: response.token ?? null,
      };

      // Sauvegarder le token de manière sécurisée
      if (response.token) {
        await saveToken(response.token);
        await saveUserData(userData);
      }

      setUser(userData);

      return { success: true, user: response.user, token: response.token };
    } catch (error) {
      const msg = error?.payload?.message || error?.message || 'Erreur de connexion.';
      return { success: false, error: msg };
    }
  }, []);

  const register = useCallback(async ({ email, username, password, birthDate, certifiedMajor }) => {
    try {
      const response = await api.register({ email, username, password, birthDate, certifiedMajor });
      
      // Si le backend n'est pas accessible, api.register retourne null
      if (!response) {
        return { 
          success: false, 
          error: 'Backend inaccessible. Vérifie que le serveur est lancé et que tu es sur le même réseau Wi-Fi.' 
        };
      }

      if (!response.success) {
        return { 
          success: false, 
          error: response.message || "Erreur d'inscription." 
        };
      }

      const userData = {
        id: response.user.id ?? null,
        email: response.user.email ?? '',
        username: response.user.username ?? '',
        role: response.user.role ?? 'USER',
        emailVerified: response.user.emailVerified ?? false,
        score: response.user.score ?? 0,
        level: response.user.level ?? 1,
        activeProfileType: response.user.activeProfileType ?? null,
        isAuthenticated: true,
        token: response.token ?? null,
      };

      // Sauvegarder le token de manière sécurisée
      if (response.token) {
        await saveToken(response.token);
        await saveUserData(userData);
      }

      setUser(userData);

      return { success: true, user: response.user, token: response.token };
    } catch (error) {
      const msg = error?.payload?.message || error?.message || "Erreur d'inscription.";
      return { success: false, error: msg };
    }
  }, []);

  const loginWithGoogle = useCallback(async (payload) => {
    try {
      const response = await api.loginWithGoogle(payload);

      if (!response) {
        return {
          success: false,
          error: 'Backend inaccessible. Vérifie que le serveur est lancé et que tu es sur le même réseau Wi-Fi.',
        };
      }

      if (!response.success) {
        return {
          success: false,
          error: response.message ?? 'Erreur connexion Google.',
        };
      }

      const userData = {
        id: response.user.id ?? null,
        email: response.user.email ?? '',
        username: response.user.username ?? '',
        role: response.user.role ?? 'USER',
        emailVerified: response.user.emailVerified ?? false,
        score: response.user.score ?? 0,
        level: response.user.level ?? 1,
        activeProfileType: response.user.activeProfileType ?? null,
        isAuthenticated: true,
        token: response.token ?? null,
      };

      if (response.token) {
        await saveToken(response.token);
        await saveUserData(userData);
      }

      setUser(userData);

      return { success: true, user: response.user, token: response.token };
    } catch (error) {
      const msg = error?.payload?.message || error?.message || 'Erreur connexion Google.';
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const authTok = await getToken();
      const expoTok = await getLocalExpoPushToken();
      if (authTok && expoTok) {
        await api.unregisterExpoPushToken(authTok, expoTok).catch(() => {});
      }
    } catch (_) {
      /* ignore */
    }
    await clearLocalExpoPushToken();
    await deleteToken();
    setUser({
      id: null,
      email: '',
      username: '',
      role: 'USER',
      emailVerified: false,
      level: 1,
      score: 0,
      activeProfileType: null,
      isAuthenticated: false,
      token: null,
    });
  }, []);

  const updateUser = useCallback(async (partialUser) => {
    // ✅ Utiliser une mise à jour fonctionnelle pour éviter les valeurs "stales"
    // (ex: switchProfile qui se fait écraser par un autre updateUser quasi simultané).
    setUser((prev) => {
      const next = { ...prev, ...partialUser };
      // Persistance best-effort (pas besoin de bloquer l'UI)
      saveUserData(next).catch((e) => logger.warn('[AuthContext] Erreur saveUserData:', e?.message ?? e));
      return next;
    });
  }, []);

  // Re-synchroniser l'utilisateur depuis le backend (utile après switchProfile)
  const refreshCurrentUser = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token || isTokenExpired(token)) {
        return;
      }
      const currentUser = await api.getCurrentUser(token);
      if (currentUser && currentUser.success) {
        setUser((prev) => {
          const next = {
            ...prev,
            id: currentUser.user?.id ?? prev.id,
            email: currentUser.user?.email ?? prev.email,
            username: currentUser.user?.username ?? prev.username,
            role: currentUser.user?.role ?? prev.role ?? 'USER',
            emailVerified: currentUser.user?.emailVerified ?? prev.emailVerified ?? false,
            score: currentUser.user?.score ?? prev.score,
            level: currentUser.user?.level ?? prev.level,
            activeProfileType: currentUser.user?.activeProfileType ?? prev.activeProfileType,
            isAuthenticated: true,
            token,
          };
          saveUserData(next).catch((e) => logger.warn('[AuthContext] Erreur saveUserData:', e?.message ?? e));
          return next;
        });
      }
    } catch (e) {
      logger.warn('[AuthContext] refreshCurrentUser failed:', e?.message ?? e);
    }
  }, []);

  // Fonction pour gérer le logout automatique en cas de token expiré
  const handleTokenExpired = useCallback(async () => {
    console.warn('[AuthContext] Token expiré, déconnexion automatique...');
    await logout();
  }, [logout]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register,
      loginWithGoogle,
      logout, 
      updateUser, 
      isInitializing,
      handleTokenExpired,
      refreshCurrentUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

