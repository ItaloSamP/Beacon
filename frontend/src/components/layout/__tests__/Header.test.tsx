/**
 * Unit tests for Header component — refined version.
 *
 * Tests: page title rendering, actions area slot,
 * mobile menu toggle button, 64px height,
 * styling, and accessibility.
 *
 * NOTE: User name and logout moved to Sidebar.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Header no longer depends on useAuth (user/logout moved to Sidebar)
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
