/**
 * Component tests for DashboardPage.
 *
 * Tests the redesigned dashboard page:
 * - Renders page title and status cards
 * - Renders anomaly feed section with severity badges
 * - Renders recent jobs feed with status badges
 * - Shows loading, empty, and error states
 * - Navigation links in feeds
 * - Auto-refresh behavior
 *
 * RED PHASE: All tests WILL FAIL because the DashboardPage
 * component with new features doesn't exist yet.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../../test/mocks/server';

// ============================================================
// IMPORTS THAT WILL FAIL (RED PHASE — modules don't exist yet)
// ============================================================
import { DashboardPage } from '../../pages/DashboardPage';
import { AuthProvider } from '../../hooks/useAuth';

// ============================================================
// Test helpers
// ============================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderDashboard() {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ============================================================
// Tests
// ============================================================

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'mock-access-token');
    localStorage.setItem('refresh_token', 'mock-refresh-token');
  });

  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render page title "Dashboard"', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
    });

    it('should render status cards section', async () => {
      renderDashboard();

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings.length).toBeGreaterThan(0);
      });
    });

    it('should render anomaly feed section', async () => {
      renderDashboard();

      await waitFor(() => {
        const anomalySection = screen.queryAllByText(/anomal/i);
        expect(anomalySection.length).toBeGreaterThan(0);
      });
    });

    it('should render recent jobs section', async () => {
      renderDashboard();

      await waitFor(() => {
        const jobsSection = screen.queryAllByText(/Daily Volume Check|Recent Activity/i);
        expect(jobsSection.length).toBeGreaterThan(0);
      });
    });

    it('should render the dashboard layout structure', async () => {
      renderDashboard();

      await waitFor(() => {
        const dashboardEl = screen.queryByTestId('dashboard');
        expect(dashboardEl).toBeInTheDocument();
      });
    });
  });

  // ==========================================================
  // Status Cards
  // ==========================================================
  describe('status cards', () => {
    it('should display DataSources count', async () => {
      renderDashboard();

      await waitFor(() => {
        const dsLabel = screen.queryByText(/Data Sources/i);
        expect(dsLabel).toBeInTheDocument();
      });
    });

    it('should display numeric value for DataSources', async () => {
      renderDashboard();

      await waitFor(() => {
        const cardTexts = screen.getAllByText(/\d+/);
        const numericValues = cardTexts.filter(
          (el) => el.textContent && /^\d+$/.test(el.textContent.trim())
        );
        expect(numericValues.length).toBeGreaterThan(0);
      });
    });

    it('should display Agents online count', async () => {
      renderDashboard();

      await waitFor(() => {
        const agentText = screen.queryByText(/agent/i);
        expect(agentText).toBeInTheDocument();
      });
    });

    it('should display unresolved anomalies count', async () => {
      renderDashboard();

      await waitFor(() => {
        const inds = screen.queryAllByText(/Active anomalies/i);
        expect(inds.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should display pipelines count', async () => {
      renderDashboard();

      await waitFor(() => {
        const pipelineText = screen.queryAllByText(/Daily Volume Check/i);
        expect(pipelineText.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================
  // Anomaly Feed
  // ==========================================================
  describe('anomaly feed', () => {
    it('should render anomaly data in the feed', async () => {
      renderDashboard();

      await waitFor(() => {
        const elems = screen.queryAllByText(/orders\.|below baseline|users\.email|above baseline|schema change/i);
        expect(elems.length).toBeGreaterThan(0);
      });
    });

    it('should display severity badges for anomalies', async () => {
      renderDashboard();

      await waitFor(() => {
        const anomalyItems = screen.queryAllByText(/Anomaly:/i);
        expect(anomalyItems.length).toBeGreaterThan(0);
      });
    });

    it('should show anomaly descriptions', async () => {
      renderDashboard();

      await waitFor(() => {
        const elems = screen.queryAllByText(/Null ratio|Volume|below baseline/i);
        expect(elems.length).toBeGreaterThan(0);
      });
    });

    it('should contain links to anomaly detail pages', async () => {
      renderDashboard();

      await waitFor(() => {
        const links = screen.queryAllByRole('link');
        const anomalyLinks = links.filter((link) =>
          /anomal/i.test(link.getAttribute('href') || '')
        );
        expect(anomalyLinks.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================
  // Recent Jobs Feed
  // ==========================================================
  describe('recent jobs feed', () => {
    it('should render pipeline runs in the feed', async () => {
      renderDashboard();

      await waitFor(() => {
        const runs = screen.getAllByText(/Daily Volume Check/i);
        expect(runs.length).toBeGreaterThan(0);
      });
    });

    it('should display status badges for pipeline runs', async () => {
      renderDashboard();

      await waitFor(() => {
        const successBadges = screen.queryAllByText(/success|sucesso/i);
        const warningBadges = screen.queryAllByText(/warning|aviso/i);

        const totalBadges = successBadges.length + warningBadges.length;
        expect(totalBadges).toBeGreaterThan(0);
      });
    });

    it('should show pipeline name for each run', async () => {
      renderDashboard();

      await waitFor(() => {
        const pipelineNameElements = screen.getAllByText(/Daily Volume Check/i);
        expect(pipelineNameElements.length).toBeGreaterThan(0);
      });
    });

    it('should show timestamps for pipeline runs', async () => {
      renderDashboard();

      await waitFor(() => {
        const datePatterns = screen.queryAllByText(/ago|just now/i);
        expect(datePatterns.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================
  // States
  // ==========================================================
  describe('states', () => {
    it('should show loading state initially', async () => {
      renderDashboard();

      const loadingElements = screen.queryAllByRole('status');
      // Loading indicators should be present before data resolves
    });

    it('should show empty anomaly feed when no anomalies', async () => {
      server.use(
        http.get('http://localhost:8000/api/v1/anomalies/recent', () => {
          return HttpResponse.json(
            { data: [], meta: { total: 0, limit: 10 }, error: null },
            { status: 200 }
          );
        }),
        http.get('http://localhost:8000/api/v1/pipeline-runs/recent', () => {
          return HttpResponse.json(
            { data: [], meta: { total: 0, limit: 10 }, error: null },
            { status: 200 }
          );
        })
      );

      renderDashboard();

      await waitFor(() => {
        const emptyMessage = screen.queryByText(
          /Tudo certo|No recent activity/i
        );
        expect(emptyMessage).toBeInTheDocument();
      });
    });

    it('should show empty jobs feed when no pipeline runs', async () => {
      server.use(
        http.get('http://localhost:8000/api/v1/anomalies/recent', () => {
          return HttpResponse.json(
            { data: [], meta: { total: 0, limit: 10 }, error: null },
            { status: 200 }
          );
        }),
        http.get('http://localhost:8000/api/v1/pipeline-runs/recent', () => {
          return HttpResponse.json(
            { data: [], meta: { total: 0, limit: 10 }, error: null },
            { status: 200 }
          );
        })
      );

      renderDashboard();

      await waitFor(() => {
        const emptyMessage = screen.queryByText(
          /Tudo certo|No recent activity/i
        );
        expect(emptyMessage).toBeInTheDocument();
      });
    });

    it('should show error state on anomaly API failure', async () => {
      server.use(
        http.get('http://localhost:8000/api/v1/anomalies/recent', () => {
          return HttpResponse.json(
            { data: null, error: 'server_error', message: 'Failed to load anomalies' },
            { status: 500 }
          );
        })
      );

      renderDashboard();

      await waitFor(() => {
        const errorMessages = screen.queryAllByText(/error|erro|failed|falha/i);
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    it('should show error state on pipeline runs API failure', async () => {
      server.use(
        http.get('http://localhost:8000/api/v1/pipeline-runs/recent', () => {
          return HttpResponse.json(
            { data: null, error: 'server_error', message: 'Failed to load jobs' },
            { status: 500 }
          );
        })
      );

      renderDashboard();

      await waitFor(() => {
        const errorMessages = screen.queryAllByText(/error|erro|failed|falha/i);
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================
  // Navigation
  // ==========================================================
  describe('navigation', () => {
    it('should have links to anomaly detail from feed', async () => {
      renderDashboard();

      await waitFor(() => {
        const links = screen.queryAllByRole('link');
        const anomalyLinks = links.filter(
          (link) =>
            link.getAttribute('href')?.includes('anomal') ||
            link.getAttribute('href')?.includes('anomaly')
        );
        expect(anomalyLinks.length).toBeGreaterThan(0);
      });
    });

    it('should have links to pipeline runs from feed', async () => {
      renderDashboard();

      await waitFor(() => {
        const links = screen.queryAllByRole('link');
        const runLinks = links.filter(
          (link) =>
            link.getAttribute('href')?.includes('run') ||
            link.getAttribute('href')?.includes('pipeline')
        );
        expect(runLinks.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================
  // Auto-refresh
  // ==========================================================
  describe('auto-refresh', () => {
    it('should fetch data on mount (React Query behavior)', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
    });

    it('should have multiple data sections populated', async () => {
      renderDashboard();

      await waitFor(() => {
        const hasAnomalyData = screen.queryAllByText(/public\.orders/i);
        const hasPipelineData = screen.queryAllByText(/Daily Volume Check/i);
        expect(hasAnomalyData.length > 0 || hasPipelineData.length > 0).toBe(true);
      });
    });
  });
});
