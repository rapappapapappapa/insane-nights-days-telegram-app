import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api/config';
import { saveToken, getToken, deleteToken, saveUserData, getUserData, isTokenExpired } from '../utils/tokenStorage';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState({
    id: null,
    email: '',
    username: '',
    role: 'USER',
    activeProfileType: null,
    isAuthenticated: false,
    token: null,
  });
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const token = await getToken();
        const saved = await getUserData();

        if (token && !isTokenExpired(token)) {
          try {
            const res = await api.getCurrentUser(token);
            if (res?.success) {
              setUser({
                id: res.user?.id ?? saved?.id ?? null,
                email: res.user?.email ?? saved?.email ?? '',
                username: res.user?.username ?? saved?.username ?? '',
                role: res.user?.role ?? saved?.role ?? 'USER',
                activeProfileType: res.user?.activeProfileType ?? saved?.activeProfileType ?? null,
                isAuthenticated: true,
                token,
              });
            } else {
              await deleteToken();
              setUser({ id: null, email: '', username: '', role: 'USER', activeProfileType: null, isAuthenticated: false, token: null });
            }
          } catch {
            await deleteToken();
            setUser({ id: null, email: '', username: '', role: 'USER', activeProfileType: null, isAuthenticated: false, token: null });
          }
        } else {
          await deleteToken();
        }
      } catch {
        await deleteToken();
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async ({ email, password }) => {
    try {
      const res = await api.login({ email, password });
      if (!res?.success) return { success: false, error: res?.message ?? 'Erreur de connexion.' };

      const u = {
        id: res.user?.id ?? null,
        email: res.user?.email ?? '',
        username: res.user?.username ?? '',
        role: res.user?.role ?? 'USER',
        activeProfileType: res.user?.activeProfileType ?? null,
        isAuthenticated: true,
        token: res.token ?? null,
      };

      if (res.token) {
        await saveToken(res.token);
        await saveUserData(u);
      }
      setUser(u);
      return { success: true, user: res.user, token: res.token };
    } catch (e) {
      return { success: false, error: e?.payload?.message || e?.message || 'Erreur de connexion.' };
    }
  }, []);

  const register = useCallback(async ({ email, username, password, birthDate, certifiedMajor }) => {
    try {
      const res = await api.register({ email, username, password, birthDate, certifiedMajor });
      if (!res?.success) return { success: false, error: res?.message ?? "Erreur d'inscription." };

      const u = {
        id: res.user?.id ?? null,
        email: res.user?.email ?? '',
        username: res.user?.username ?? '',
        role: res.user?.role ?? 'USER',
        activeProfileType: res.user?.activeProfileType ?? null,
        isAuthenticated: true,
        token: res.token ?? null,
      };

      if (res.token) {
        await saveToken(res.token);
        await saveUserData(u);
      }
      setUser(u);
      return { success: true, user: res.user, token: res.token };
    } catch (e) {
      return { success: false, error: e?.payload?.message || e?.message || "Erreur d'inscription." };
    }
  }, []);

  const logout = useCallback(async () => {
    await deleteToken();
    setUser({ id: null, email: '', username: '', role: 'USER', activeProfileType: null, isAuthenticated: false, token: null });
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token || isTokenExpired(token)) return;
      const res = await api.getCurrentUser(token);
      if (res?.success) {
        setUser((prev) => {
          const next = {
            ...prev,
            id: res.user?.id ?? prev.id,
            email: res.user?.email ?? prev.email,
            username: res.user?.username ?? prev.username,
            role: res.user?.role ?? prev.role,
            activeProfileType: res.user?.activeProfileType ?? prev.activeProfileType,
            isAuthenticated: true,
            token,
          };
          saveUserData(next).catch(() => {});
          return next;
        });
      }
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isInitializing, refreshCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
