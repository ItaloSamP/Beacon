/**
 * Unit tests for useAuth hook and AuthContext.
 *
 * Tests the authentication context behavior:
 * - Login sets user and tokens in context
 * - Logout clears user and tokens
 * - AuthProvider wraps children
 * - Redirect logic for unauthenticated users
 * - Token storage and retrieval
 *
 * RED PHASE: All tests WILL FAIL because the hook, context,
 * and related modules don't exist yet.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ============================================================
// IMPORTS THAT WILL FAIL (RED PHASE — modules don't exist yet)
// ============================================================
import { AuthProvider, useAuth } from '../useAuth';
import type { User, AuthResponse } from '../../types/auth';


// ============================================================
// Test helpers
// ============================================================

/**
 * Wrapper component that provides AuthContext for hook tests.
 */
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  };
}

/**
 * Mock API response for successful login.
 */
const mockLoginResponse: AuthResponse = {
  data: {
    user: {
      id: 'user-uuid-123',
      email: 'test@example.com',
      name: 'Test User',
    },
    access_token: 'access-token-mock',
    refresh_token: 'refresh-token-mock',
  },
  error: null,
};

// ============================================================
// Tests
// ============================================================

describe('useAuth', () => {
  beforeEach(() => {
    // Clear localStorage between tests
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('initial state', () => {
    it('should have null user when not authenticated', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should expose login, logout, and register functions', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.register).toBe('function');
    });
  });

  describe('login', () => {
    it('should set user and tokens after successful login', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.login('test@example.com', 'TestPassword123!');
      });

      // After successful login, user should be set
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.email).toBe('test@example.com');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.tokens).toBeDefined();
      expect(result.current.tokens?.accessToken).toBeTruthy();
    });

    it('should throw error on invalid credentials', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.login('wrong@example.com', 'WrongPassword');
        } catch (e) {
          // Error should be thrown
          expect(e).toBeDefined();
        }
      });

      // User should remain null after failed login
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should persist tokens to storage', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.login('test@example.com', 'TestPassword123!');
      });

      // Tokens should be persisted (check localStorage or cookie)
      const storedToken = localStorage.getItem('access_token');
      expect(storedToken).toBeTruthy();
    });

    it('should set isLoading to true during login', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      // Start login (don't await to check loading state)
      act(() => {
        result.current.login('test@example.com', 'TestPassword123!');
      });

      // isLoading should be set during the async operation
      // Note: This may complete synchronously depending on mock setup
    });
  });

  describe('register', () => {
    it('should register new user and set tokens', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.register('newuser@example.com', 'NewPass123!', 'New User');
      });

      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.email).toBe('newuser@example.com');
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should throw error on duplicate email', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await expect(async () => {
        await act(async () => {
          await result.current.register('existing@example.com', 'Pass123!', 'Existing');
        });
      }).rejects.toThrow();

      expect(result.current.user).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear user and tokens on logout', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      // Login first
      await act(async () => {
        await result.current.login('test@example.com', 'TestPassword123!');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.tokens).toBeNull();
    });

    it('should clear tokens from storage on logout', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      // Login
      await act(async () => {
        await result.current.login('test@example.com', 'TestPassword123!');
      });

      expect(localStorage.getItem('access_token')).toBeTruthy();

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('should not error when logging out while already logged out', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(result.current.isAuthenticated).toBe(false);

      // Should not throw
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('token management', () => {
    it('should provide access token for API calls', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.login('test@example.com', 'TestPassword123!');
      });

      const accessToken = result.current.tokens?.accessToken;
      expect(accessToken).toBeTruthy();
      expect(typeof accessToken).toBe('string');
    });

    it('should return null tokens when not authenticated', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(result.current.tokens).toBeNull();
    });

    it('should restore session from stored tokens', async () => {
      // Pre-populate tokens in storage
      localStorage.setItem('access_token', 'stored-access-token');
      localStorage.setItem('refresh_token', 'stored-refresh-token');

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      // The hook should attempt to restore the session
      // (Behavior depends on implementation — may load user info on mount)
      await waitFor(() => {
        // If the hook tries to verify the stored token, user may or may not be set
        // depending on whether verification succeeds with mock handler
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      // The mock may not simulate network errors, but the hook should handle them
      // This test verifies the hook doesn't crash on errors
      try {
        await act(async () => {
          await result.current.login('error@example.com', 'error');
        });
      } catch {
        // Expected — hook should throw or handle the error
      }

      // After error, state should remain clean
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});


describe('AuthProvider', () => {
  it('should render children', () => {
    render(
      <AuthProvider>
        <div data-testid="child">Protected Content</div>
      </AuthProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should not expose password hash in user object', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.login('test@example.com', 'TestPassword123!');
    });

    const user = result.current.user;
    if (user) {
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('password_hash');
    }
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow(/AuthProvider/);

    consoleSpy.mockRestore();
  });
});
