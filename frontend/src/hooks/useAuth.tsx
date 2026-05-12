import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { User, Tokens } from '../types/auth';
import type { ApiResponse } from '../types/api';
import { api, setTokens, clearTokens } from '../lib/api';

interface AuthContextType {
  user: User | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokensState] = useState<Tokens | null>(() => {
    const access = localStorage.getItem('access_token');
    const refresh = localStorage.getItem('refresh_token');
    if (access && refresh) {
      return { accessToken: access, refreshToken: refresh };
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post<ApiResponse<{ user: User; access_token: string; refresh_token: string }>>('/auth/login', { email, password });
      if (response.data) {
        setTokens(response.data.access_token, response.data.refresh_token);
        setTokensState({
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
        });
        setUser(response.data.user);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setTokensState(null);
  }, []);

  const registerFn = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await api.post<ApiResponse<{ user: User; access_token: string; refresh_token: string }>>('/auth/register', { email, password, name });
      if (response.data) {
        setTokens(response.data.access_token, response.data.refresh_token);
        setTokensState({
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
        });
        setUser(response.data.user);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    tokens,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register: registerFn,
  }), [user, tokens, isLoading, login, logout, registerFn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
