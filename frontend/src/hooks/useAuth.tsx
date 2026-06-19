import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
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
  isVerifying: boolean;
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
  const [isVerifying, setIsVerifying] = useState(() => {
    return !!(localStorage.getItem('access_token') && localStorage.getItem('refresh_token') && localStorage.getItem('beacon_user'));
  });

  // Validate stored tokens against the server on mount
  useEffect(() => {
    const storedAccess = localStorage.getItem('access_token');
    const storedRefresh = localStorage.getItem('refresh_token');
    const storedUser = localStorage.getItem('beacon_user');

    if (!storedAccess || !storedRefresh || !storedUser) {
      setIsVerifying(false);
      // Ensure state is clean if localStorage is inconsistent
      if (user) setUser(null);
      if (tokens) setTokensState(null);
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        // Add a timeout so verification doesn't hang indefinitely
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch('/api/v1/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedAccess}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (cancelled) return;

        if (!response.ok) {
          // Try refresh first
          const refreshResp = await fetch('/api/v1/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: storedRefresh }),
          });

          if (cancelled) return;

          if (refreshResp.ok) {
            const refreshBody = await refreshResp.json();
            if (refreshBody.data) {
              setTokens(refreshBody.data.access_token, refreshBody.data.refresh_token);
              setTokensState({
                accessToken: refreshBody.data.access_token,
                refreshToken: refreshBody.data.refresh_token,
              });
              setIsVerifying(false);
              return;
            }
          }

          // Both failed — clear everything
          clearTokens();
          clearUser();
          if (!cancelled) {
            setUser(null);
            setTokensState(null);
          }
        } else {
          // Token is valid — update user from response
          const body = await response.json();
          if (!cancelled && body.data?.user) {
            setUser(body.data.user);
            saveUser(body.data.user);
          }
        }
      } catch {
        // Network error or timeout — don't clear tokens on transient failures.
        // The backend may still be starting (E2E CI race condition) or the
        // request timed out. If the token is truly invalid, the next API call
        // will return 401 and trigger the apiRequest retry/refresh logic.
      } finally {
        if (!cancelled) {
          setIsVerifying(false);
        }
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Listen for force-logout events from api.ts
  useEffect(() => {
    function handleForceLogout() {
      setUser(null);
      setTokensState(null);
      setIsVerifying(false);
    }

    window.addEventListener('beacon:force-logout', handleForceLogout);
    return () => window.removeEventListener('beacon:force-logout', handleForceLogout);
  }, []);

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
    isVerifying,
    login,
    logout,
    register: registerFn,
    forgotPassword: forgotPasswordFn,
    resetPassword: resetPasswordFn,
  }), [user, tokens, isLoading, isVerifying, login, logout, registerFn, forgotPasswordFn, resetPasswordFn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
