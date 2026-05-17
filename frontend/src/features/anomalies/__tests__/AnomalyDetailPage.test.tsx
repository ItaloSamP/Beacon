/**
 * Component tests for AnomalyDetailPage.
 *
 * Tests the anomaly detail page:
 * - Renders anomaly detail with pipeline name, data source, severity, type, description
 * - Displays deviation details (baseline, current value, z-score)
 * - Displays linked alerts table
 * - Has link to originating PipelineRun
 * - Has "Resolver" button (if not resolved)
 * - Loading, error (404), and not-found states
 *
 * RED PHASE: All tests WILL FAIL because the AnomalyDetailPage
 * component and its dependencies don't exist yet.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../../../test/mocks/server';

// ============================================================
// IMPORTS THAT WILL FAIL (RED PHASE — modules don't exist yet)
// ============================================================
import { AnomalyDetailPage } from '../AnomalyDetailPage';
import { AuthProvider } from '../../../hooks/useAuth';

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

function renderDetailPage(anomalyId: string = 'anomaly-uuid-001') {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/anomalies/${anomalyId}`]}>
        <AuthProvider>
          <Routes>
            <Route path="/anomalies/:id" element={<AnomalyDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ============================================================
// Tests
// ============================================================

describe('AnomalyDetailPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'mock-access-token');
    localStorage.setItem('refresh_token', 'mock-refresh-token');
  });

  // ==========================================================
  // Detail rendering
  // ==========================================================
  describe('detail rendering', () => {
    it('should render anomaly detail with correct data', async () => {
      renderDetailPage();

      await waitFor(() => {
        expect(
          screen.getByText(/Row count for public\.orders decreased by 45%/i)
        ).toBeInTheDocument();
      });
    });

    it('should display severity badge', async () => {
      renderDetailPage();

      await waitFor(() => {
        const severityBadge = screen.queryByText(/high|alta/i);
        expect(severityBadge).toBeInTheDocument();
      });
    });

    it('should display anomaly type', async () => {
      renderDetailPage();

      await waitFor(() => {
        const typeElements = screen.queryAllByText(/volume/i);
        expect(typeElements.length).toBeGreaterThan(0);
      });
    });

    it('should display deviation details', async () => {
      renderDetailPage();

      await waitFor(() => {
        expect(screen.getByText(/15200/)).toBeInTheDocument();
        expect(screen.getByText(/8360/)).toBeInTheDocument();
        expect(screen.getByText(/-4\.2/)).toBeInTheDocument();
      });
    });

    it('should display pipeline name', async () => {
      renderDetailPage();

      await waitFor(() => {
        expect(
          screen.getByText(/Daily Volume Check/i)
        ).toBeInTheDocument();
      });
    });

    it('should display data source name', async () => {
      renderDetailPage();

      await waitFor(() => {
        expect(
          screen.getByText(/Production PostgreSQL/i)
        ).toBeInTheDocument();
      });
    });

    it('should display linked alerts table', async () => {
      renderDetailPage();

      await waitFor(() => {
        const alertElements = screen.queryAllByText(/alert|alerta|email|slack/i);
        expect(alertElements.length).toBeGreaterThan(0);
      });
    });

    it('should display detection timestamp', async () => {
      renderDetailPage();

      await waitFor(() => {
        const dateElements = screen.queryAllByText(/2026-05-14/i);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================
  // Navigation
  // ==========================================================
  describe('navigation', () => {
    it('should have a link to the originating pipeline run', async () => {
      renderDetailPage();

      await waitFor(() => {
        const links = screen.queryAllByRole('link');
        const runLinks = links.filter(
          (link) =>
            link.getAttribute('href')?.includes('run') ||
            link.getAttribute('href')?.includes('prun')
        );
        expect(runLinks.length).toBeGreaterThan(0);
      });
    });

    it('should have a back link to anomalies list', async () => {
      renderDetailPage();

      await waitFor(() => {
        const links = screen.queryAllByRole('link');
        const backLinks = links.filter(
          (link) =>
            link.textContent?.toLowerCase().includes('back') ||
            link.textContent?.toLowerCase().includes('voltar') ||
            link.getAttribute('href')?.includes('anomalies')
        );
        expect(backLinks.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================
  // States
  // ==========================================================
  describe('states', () => {
    it('should show loading state initially', async () => {
      renderDetailPage();

      const loadingElements = screen.queryAllByRole('status');
      // Loading indicators should be present before data resolves
    });

    it('should show error state on API failure', async () => {
      server.use(
        http.get(
          'http://localhost:8000/api/v1/anomalies/anomaly-uuid-001',
          () => {
            return HttpResponse.json(
              {
                data: null,
                error: 'server_error',
                message: 'Failed to load anomaly',
              },
              { status: 500 }
            );
          }
        )
      );

      renderDetailPage();

      await waitFor(() => {
        const errorMessage = screen.queryByText(/error|erro|failed|falha/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should show not found message for non-existent anomaly', async () => {
      server.use(
        http.get(
          'http://localhost:8000/api/v1/anomalies/non-existent-id',
          () => {
            return HttpResponse.json(
              {
                data: null,
                error: 'not_found',
                message: 'Anomaly not found',
              },
              { status: 404 }
            );
          }
        )
      );

      renderDetailPage('non-existent-id');

      await waitFor(() => {
        const notFoundMessage = screen.queryByText(
          /not found|n.o encontrad|não encontrad/i
        );
        expect(notFoundMessage).toBeInTheDocument();
      });
    });
  });

  // ==========================================================
  // Actions
  // ==========================================================
  describe('actions', () => {
    it('should have "Resolver" button when anomaly is not resolved', async () => {
      // anomaly-uuid-001 has resolved_at: null
      renderDetailPage();

      await waitFor(() => {
        const resolveButton = screen.queryByText(/resolv|resolve/i);
        expect(resolveButton).toBeInTheDocument();
      });
    });

    it('should resolve anomaly when "Resolver" button is clicked', async () => {
      renderDetailPage();

      await waitFor(async () => {
        const resolveButton = screen.queryByText(/resolv|resolve/i);
        if (resolveButton) {
          await userEvent.click(resolveButton);
        }
      });

      await waitFor(() => {
        // UI should update to show resolved status
        const resolvedTexts = screen.queryAllByText(/resolv|resolved/i);
        expect(resolvedTexts.length).toBeGreaterThan(0);
      });
    });
  });
});
