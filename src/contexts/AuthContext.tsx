import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (nickname: string, password: string) => Promise<void>;
  register: (nickname: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadSession() {
      try {
        const data = await api.auth.me();
        if (isActive) setUser(data.user);
      } catch {
        if (isActive) setUser(null);
      } finally {
        if (isActive) setLoading(false);
      }
    }

    void loadSession();
    return () => {
      isActive = false;
    };
  }, []);

  const login = useCallback(async (nickname: string, password: string) => {
    const data = await api.auth.login(nickname, password);
    setUser(data.user);
  }, []);

  const register = useCallback(async (nickname: string, password: string) => {
    const data = await api.auth.register(nickname, password);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
