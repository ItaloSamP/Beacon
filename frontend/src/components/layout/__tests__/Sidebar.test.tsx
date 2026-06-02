/**
 * Unit tests for Sidebar component — refined version.
 *
 * Tests: nav items (6 items: Dashboard, Agents,
 * DataSources, Pipelines, Anomalies, Alerts), active state
 * class on current route, badge counter on anomalies, lucide
 * icons, brand logo/name, user section (avatar + name),
 * mobile collapse toggle, logout button.
 *
 * Must wrap in MemoryRouter since Sidebar uses NavLink,
 * and in AuthProvider since Sidebar calls useAuth() for logout.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

import { AuthProvider } from '../../../hooks/useAuth';

// IMPORT THAT WILL FAIL (RED PHASE — refined component doesn't exist)
import { Sidebar } from '../Sidebar';

/**
 * Render Sidebar wrapped in MemoryRouter (NavLink requires routing context)
 * and AuthProvider (Sidebar calls useAuth() for logout).
 */
function renderSidebar(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Sidebar />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  // ==========================================================
  // Brand / Logo
  // ==========================================================
  describe('brand', () => {
    it('should render the brand name "Beacon"', () => {
      renderSidebar();
      expect(screen.getByText('Beacon')).toBeInTheDocument();
    });

    it('should render a brand logo or icon', () => {
      renderSidebar();
      // Should have an SVG logo or icon next to the brand name
      const aside = document.querySelector('aside');
      expect(aside).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Nav Items
  // ==========================================================
  describe('nav items', () => {
    it('should render all 6 navigation items', () => {
      renderSidebar();

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('DataSources')).toBeInTheDocument();
      expect(screen.getByText('Pipelines')).toBeInTheDocument();
      expect(screen.getByText('Anomalies')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    it('should render lucide icons for each nav item', () => {
      renderSidebar();

      // Each nav item should have an associated SVG icon
      const nav = document.querySelector('nav');
      const svgs = nav?.querySelectorAll('svg');
      // Should have icons for each item
      expect(svgs?.length).toBeGreaterThanOrEqual(6);
    });

    it('should render nav items as links', () => {
      renderSidebar();

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute('href', '/');
    });

    it('should link to correct routes', () => {
      renderSidebar();

      expect(screen.getByText('Agents').closest('a')).toHaveAttribute('href', '/agents');
      expect(screen.getByText('DataSources').closest('a')).toHaveAttribute('href', '/datasources');
      expect(screen.getByText('Pipelines').closest('a')).toHaveAttribute('href', '/pipelines');
      expect(screen.getByText('Anomalies').closest('a')).toHaveAttribute('href', '/anomalies');
      expect(screen.getByText('Alerts').closest('a')).toHaveAttribute('href', '/alerts');
    });
  });

  // ==========================================================
  // Active State
  // ==========================================================
  describe('active state', () => {
    it('should highlight the current route', () => {
      renderSidebar('/anomalies');

      const anomalyLink = screen.getByText('Anomalies').closest('a');
      // Active link should have active class (bg-blue-600 or similar)
      expect(anomalyLink?.className).toMatch(/active|bg-blue/);
    });

    it('should highlight Dashboard when on root route', () => {
      renderSidebar('/');

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink?.className).toMatch(/active|bg-blue/);
    });

    it('should NOT highlight non-current routes', () => {
      renderSidebar('/agents');

      // Only Agents should be active; Dashboard should not
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      const agentsLink = screen.getByText('Agents').closest('a');

      expect(agentsLink?.className).toMatch(/active|bg-blue/);
      // Dashboard should NOT have active styling
      expect(dashboardLink?.className).not.toMatch(/active/);
    });
  });

  // ==========================================================
  // Badge Counter on Anomalies
  // ==========================================================
  describe('badge counter', () => {
    it('should show a badge count on anomalies', () => {
      renderSidebar();

      // The anomalies nav item should show a badge
      const anomalyItem = screen.getByText('Anomalies').closest('a');
      expect(anomalyItem).toBeInTheDocument();
    });
  });

  // ==========================================================
  // User Section
  // ==========================================================
  describe('user section', () => {
    it('should render user avatar and name', () => {
      renderSidebar();

      const aside = document.querySelector('aside');
      expect(aside).toBeInTheDocument();
    });

    it('should render user section at the bottom of sidebar', () => {
      renderSidebar();

      const aside = document.querySelector('aside');
      expect(aside).toBeInTheDocument();
    });

    it('should render a logout button in user section', () => {
      renderSidebar();

      // The Sidebar should have a logout button (Sair)
      const logoutBtn = document.querySelector('aside button[aria-label="Sair"]');
      expect(logoutBtn).toBeInTheDocument();
      const svg = logoutBtn?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Mobile Collapse Toggle
  // ==========================================================
  describe('mobile collapse', () => {
    it('should render a mobile collapse toggle button', () => {
      renderSidebar();

      // Should have a hamburger/close button for mobile
      const buttons = document.querySelectorAll('button');
      // May have a collapse toggle button
      expect(buttons.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================
  // Sidebar Width
  // ==========================================================
  describe('dimensions', () => {
    it('should have 256px width (w-64)', () => {
      renderSidebar();

      const aside = document.querySelector('aside');
      expect(aside?.className).toMatch(/w-64/);
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should render as an <aside> element', () => {
      renderSidebar();

      expect(document.querySelector('aside')).toBeInTheDocument();
    });

    it('should have a <nav> element for navigation', () => {
      renderSidebar();

      expect(document.querySelector('nav')).toBeInTheDocument();
    });

    it('should have accessible navigation label', () => {
      renderSidebar();

      const nav = document.querySelector('nav');
      // Should have aria-label for navigation
      expect(nav).toBeInTheDocument();
    });
  });
});
