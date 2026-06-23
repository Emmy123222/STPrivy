'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthUser, Role } from '@/types';

const TOKEN_KEY = 'zkkyc:token';

interface DecodedJWT {
  sub: string;
  address: string;
  role: Role;
  exp: number;
}

function decodeJWT(token: string): DecodedJWT | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)) as DecodedJWT;
  } catch {
    return null;
  }
}

function isExpired(decoded: DecodedJWT): boolean {
  return Date.now() >= decoded.exp * 1000;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      const decoded = decodeJWT(stored);
      if (decoded && !isExpired(decoded)) {
        setToken(stored);
        // Restore a minimal user from the JWT claims — hasDID resolved by later query
        setUser({
          id: decoded.sub,
          stellarAddress: decoded.address,
          role: decoded.role,
          createdAt: new Date(0).toISOString(),
          hasDID: false,
        });
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const setAuth = useCallback((t: string, u: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be inside AuthProvider');
  return ctx;
}
