// AuthContext - Manages authentication state

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../api/auth';
import { login as apiLogin, getMe } from '../api/auth';
import { setLogoutCallback } from '../api/fetch';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  canReverse: boolean;
  canDeleteItem: boolean;
  canDoStockOps: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'store_auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [loading, setLoading] = useState(true);

  // Verify existing token on mount
  useEffect(() => {
    if (token) {
      getMe(token)
        .then((userData) => {
          setUser(userData);
          setLoading(false);
        })
        .catch(() => {
          // Invalid token
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    const result = await apiLogin(username, password);
    localStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  // Set up logout callback for 401 responses
  useEffect(() => {
    setLogoutCallback(logout);
  }, []);

  // Role checks
  const isAdmin = user?.role === 'ADMIN';
  const canReverse = user?.role === 'ADMIN' || user?.role === 'STORE_INCHARGE';
  const canDeleteItem = user?.role === 'ADMIN';
  const canDoStockOps = user?.role !== 'VIEWER';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        isAdmin,
        canReverse,
        canDeleteItem,
        canDoStockOps,
      }}
    >
      {!loading && children}
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
