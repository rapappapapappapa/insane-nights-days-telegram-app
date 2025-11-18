import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/config';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState({
    id: null,
    email: '',
    username: '',
    level: 1,
    score: 0,
    isAuthenticated: false,
    token: null,
  });

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

      setUser({
        id: response.user.id ?? null,
        email: response.user.email ?? '',
        username: response.user.username ?? '',
        score: response.user.score ?? 0,
        level: response.user.level ?? 1,
        isAuthenticated: true,
        token: response.token ?? null,
      });

      return { success: true, user: response.user, token: response.token };
    } catch (error) {
      return { success: false, error: error.message ?? 'Erreur de connexion.' };
    }
  }, []);

  const register = useCallback(async ({ email, username, password }) => {
    try {
      const response = await api.register({ email, username, password });
      
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
          error: response.message ?? "Erreur d'inscription." 
        };
      }

      setUser({
        id: response.user.id ?? null,
        email: response.user.email ?? '',
        username: response.user.username ?? '',
        score: response.user.score ?? 0,
        level: response.user.level ?? 1,
        isAuthenticated: true,
        token: response.token ?? null,
      });

      return { success: true, user: response.user, token: response.token };
    } catch (error) {
      return { success: false, error: error.message ?? "Erreur d'inscription." };
    }
  }, []);

  const logout = useCallback(() => {
    setUser({
      id: null,
      email: '',
      username: '',
      level: 1,
      score: 0,
      isAuthenticated: false,
      token: null,
    });
  }, []);

  const updateUser = useCallback((partialUser) => {
    setUser((prev) => ({
      ...prev,
      ...partialUser,
    }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
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

