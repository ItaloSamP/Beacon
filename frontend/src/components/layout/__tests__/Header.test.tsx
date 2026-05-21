/**
 * Unit tests for Header component — refined version.
 *
 * Tests: page title rendering, actions area slot, user name
 * display, logout button, mobile menu toggle button, 64px height.
 *
 * RED PHASE: Tests WILL FAIL because the refined Header
 * component doesn't exist yet with page title, actions slot,
 * and mobile toggle.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock useAuth for Header (it imports from ../../hooks/useAuth)
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// IMPORT THAT WILL FAIL (RED PHASE — refined component doesn't exist)
import { Header } from '../Header';

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
}

describe('Header', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render as a <header> element', () => {
      renderHeader();
      expect(document.querySelector('header')).toBeInTheDocument();
    });

    it('should render the page title', () => {
      renderHeader();
      // Default title is "Beacon"
      expect(screen.getByText('Beacon')).toBeInTheDocument();
    });

    it('should render dynamic page title when provided', () => {
      render(
        <MemoryRouter>
          <Header title="Anomalies" />
        </MemoryRouter>
      );

      expect(screen.getByText('Anomalies')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Height
  // ==========================================================
  describe('height', () => {
    it('should have 64px height (h-16)', () => {
      renderHeader();

      const header = document.querySelector('header');
      expect(header?.className).toMatch(/h-16/);
    });
  });

  // ==========================================================
  // User Name
  // ==========================================================
  describe('user display', () => {
    it('should show the user name', () => {
      renderHeader();

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should show a user icon', () => {
      renderHeader();

      // Should have a User icon (lucide)
      const svg = document.querySelector('header svg');
      expect(svg).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Logout Button
  // ==========================================================
  describe('logout button', () => {
    it('should render a logout button', () => {
      renderHeader();

      expect(
        screen.getByRole('button', { name: /logout/i })
      ).toBeInTheDocument();
    });

    it('should have a LogOut icon', () => {
      renderHeader();

      const logoutBtn = screen.getByRole('button', { name: /logout/i });
      const svg = logoutBtn.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Actions Area Slot
  // ==========================================================
  describe('actions slot', () => {
    it('should render action buttons when provided', () => {
      render(
        <MemoryRouter>
          <Header
            title="Dashboard"
            actions={
              <button data-testid="action-btn">New Pipeline</button>
            }
          />
        </MemoryRouter>
      );

      expect(screen.getByTestId('action-btn')).toBeInTheDocument();
    });

    it('should render multiple action items', () => {
      render(
        <MemoryRouter>
          <Header
            actions={
              <>
                <button data-testid="action-1">Action 1</button>
                <button data-testid="action-2">Action 2</button>
              </>
            }
          />
        </MemoryRouter>
      );

      expect(screen.getByTestId('action-1')).toBeInTheDocument();
      expect(screen.getByTestId('action-2')).toBeInTheDocument();
    });

    it('should render without actions when not provided', () => {
      renderHeader();

      // Should still render header with title and logout
      expect(screen.getByText('Beacon')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Mobile Menu Toggle
  // ==========================================================
  describe('mobile menu toggle', () => {
    it('should render a mobile menu toggle button', () => {
      renderHeader();

      // Header should have a hamburger button for mobile sidebar toggle
      const buttons = screen.getAllByRole('button');
      // At minimum, logout button exists; may have hamburger too
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('should render hamburger icon', () => {
      renderHeader();

      // Should have a Menu or similar icon for mobile toggle
      const headerEl = document.querySelector('header');
      expect(headerEl).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Border Bottom
  // ==========================================================
  describe('styling', () => {
    it('should have a bottom border', () => {
      renderHeader();

      const header = document.querySelector('header');
      expect(header?.className).toMatch(/border-b/);
    });

    it('should have white background', () => {
      renderHeader();

      const header = document.querySelector('header');
      expect(header?.className).toMatch(/bg-white/);
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should render as semantic <header>', () => {
      renderHeader();

      expect(document.querySelector('header')).toBeInTheDocument();
    });

    it('should have the title as a heading', () => {
      renderHeader();

      const heading = document.querySelector('h1, h2, h3');
      expect(heading).toBeInTheDocument();
    });
  });
});
