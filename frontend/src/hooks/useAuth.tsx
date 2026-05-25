import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { User, Tokens } from '../types/auth';
import type { ApiResponse } from '../types/api';
import { api, setTokens, clearTokens } from '../lib/api';

const USER_STORAGE_KEY = 'beacon_user';

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveUser(user: User) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem(USER_STORAGE_KEY);
}

interface AuthContextType {
  user: User | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);
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
        saveUser(response.data.user);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    clearUser();
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
        saveUser(response.data.user);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const forgotPasswordFn = useCallback(async (email: string) => {
    await api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });
  }, []);

  const resetPasswordFn = useCallback(async (token: string, password: string) => {
    await api.post<ApiResponse<{ message: string }>>('/auth/reset-password', { token, password });
  }, []);

  const value = useMemo(() => ({
    user,
    tokens,
    isAuthenticated: !!tokens && !!user,
    isLoading,
    login,
    logout,
    register: registerFn,
    forgotPassword: forgotPasswordFn,
    resetPassword: resetPasswordFn,
  }), [user, tokens, isLoading, login, logout, registerFn, forgotPasswordFn, resetPasswordFn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
