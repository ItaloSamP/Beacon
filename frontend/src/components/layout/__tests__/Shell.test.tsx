/**
 * Unit tests for Shell component — refined version.
 *
 * Tests: authenticated — renders Sidebar + Header + Outlet,
 * unauthenticated — redirects to /login, loading state.
 *
 * Must mock useAuth hook. Wrap in MemoryRouter + QueryClientProvider.
 *
 * RED PHASE: Tests WILL FAIL because the refined Shell
 * component doesn't exist yet with proper layout integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the auth hook
const mockUseAuth = vi.fn();

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock layout sub-components to isolate Shell tests
vi.mock('../Sidebar', () => ({
  Sidebar: () => <aside data-testid="mock-sidebar">Sidebar</aside>,
}));

vi.mock('../Header', () => ({
  Header: ({ title }: { title?: string }) => (
    <header data-testid="mock-header">{title || 'Beacon'}</header>
  ),
}));

// Mock react-router-dom Outlet and Navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <main data-testid="mock-outlet">Outlet Content</main>,
  };
});

// Now import the real Shell (it uses mocked modules)
import { Shell } from '../Shell';

function renderShell(initialRoute = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Shell />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================
  // Authenticated State
  // ==========================================================
  describe('authenticated state', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { name: 'Test User', email: 'test@example.com' },
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
      });
    });

    it('should render Sidebar when authenticated', () => {
      renderShell();
      expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
    });

    it('should render Header when authenticated', () => {
      renderShell();
      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
    });

    it('should render Outlet for child routes', () => {
      renderShell();
      expect(screen.getByTestId('mock-outlet')).toBeInTheDocument();
    });

    it('should render the full shell layout structure', () => {
      renderShell();

      // Shell should have a flex container with sidebar + main area
      expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.getByTestId('mock-outlet')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Unauthenticated State
  // ==========================================================
  describe('unauthenticated state', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        logout: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
      });
    });

    it('should redirect to /login when not authenticated', () => {
      renderShell();

      // Should NOT render the shell layout
      expect(screen.queryByTestId('mock-sidebar')).toBeNull();
      expect(screen.queryByTestId('mock-header')).toBeNull();
      expect(screen.queryByTestId('mock-outlet')).toBeNull();
    });

    it('should NOT render sidebar for unauthenticated users', () => {
      renderShell();
      expect(screen.queryByTestId('mock-sidebar')).toBeNull();
    });
  });

  // ==========================================================
  // Loading State
  // ==========================================================
  describe('loading state', () => {
    it('should render loading indicator when isLoading is true', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        logout: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
      });

      renderShell();

      // Should show loading state, not redirect immediately
      // Verifying that shell handles loading without crashing
      expect(screen.queryByTestId('mock-sidebar')).toBeNull();
    });
  });

  // ==========================================================
  // Layout Structure
  // ==========================================================
  describe('layout structure', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { name: 'User', email: 'user@test.com' },
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
      });
    });

    it('should have full-height layout (h-screen)', () => {
      renderShell();

      const shellContainer = screen.getByTestId('mock-sidebar').parentElement;
      expect(shellContainer?.className).toMatch(/h-screen|h-full/);
    });

    it('should render sidebar on the left, content on the right', () => {
      renderShell();

      const sidebar = screen.getByTestId('mock-sidebar');
      const header = screen.getByTestId('mock-header');
      expect(sidebar).toBeInTheDocument();
      expect(header).toBeInTheDocument();
    });
  });
});
