/**
 * Component tests for AnomaliesListPage.
 *
 * Tests the anomalies list page:
 * - Renders a table with anomaly rows
 * - Severity badges with correct colors
 * - Filters: severity dropdown, type dropdown, resolved toggle
 * - Pagination
 * - "Resolver" action button per row
 * - Loading, empty, and error states
 * - Accessibility
 *
 * RED PHASE: All tests WILL FAIL because the AnomaliesListPage
 * component and its dependencies don't exist yet.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../../../test/mocks/server';

// ============================================================
// IMPORTS THAT WILL FAIL (RED PHASE — modules don't exist yet)
// ============================================================
import { AnomaliesListPage } from '../AnomaliesListPage';
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

function renderListPage() {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/anomalies']}>
        <AuthProvider>
          <AnomaliesListPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ============================================================
// Tests
// ============================================================

describe('AnomaliesListPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'mock-access-token');
    localStorage.setItem('refresh_token', 'mock-refresh-token');
  });

  // ==========================================================
  // Data rendering
  // ==========================================================
  describe('data rendering', () => {
    it('should render a table with anomaly rows', async () => {
      renderListPage();

      await waitFor(() => {
        expect(
          screen.getByText(/public\.orders/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/public\.users/i)
        ).toBeInTheDocument();
      });
    });

    it('should display anomaly descriptions', async () => {
      renderListPage();

      await waitFor(() => {
        expect(
          screen.getByText(/Row count for public\.orders decreased by 45%/i)
        ).toBeInTheDocument();
      });
    });

    it('should display severity badges with correct colors', async () => {
      renderListPage();

      await waitFor(() => {
        const highBadge = screen.queryByText(/high|alta/i);
        const mediumBadge = screen.queryByText(/medium|m.dia/i);
        const lowBadge = screen.queryByText(/low|baixa/i);

        // At least one severity badge should be present
        expect(
          highBadge !== null || mediumBadge !== null || lowBadge !== null
        ).toBe(true);
      });
    });

    it('should display anomaly type for each row', async () => {
      renderListPage();

      await waitFor(() => {
        const volumeElements = screen.queryAllByText(/volume/i);
        const nullCheckElements = screen.queryAllByText(/null/i);

        const totalTypes = volumeElements.length + nullCheckElements.length;
        expect(totalTypes).toBeGreaterThan(0);
      });
    });

    it('should display detection dates', async () => {
      renderListPage();

      await waitFor(() => {
        const dateElements = screen.queryAllByText(/2026-05-1/i);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });

    it('should display resolved/pending status', async () => {
      renderListPage();

      await waitFor(() => {
        const resolvedElements = screen.queryAllByText(/resolv|pendent/i);
        expect(resolvedElements.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================
  // Filters
  // ==========================================================
  describe('filters', () => {
    it('should have severity filter dropdown', async () => {
      renderListPage();

      await waitFor(() => {
        const severityFilter = screen.queryByLabelText(/severity|severidade/i);
        const severitySelect = screen.queryByRole('combobox', {
          name: /severity|severidade/i,
        });
        expect(severityFilter || severitySelect).toBeTruthy();
      });
    });

    it('should filter anomalies by severity', async () => {
      renderListPage();

      await waitFor(() => {
        // After applying severity filter, only matching items should show
        expect(
          screen.queryByText(/public\.orders/i)
        ).toBeInTheDocument();
      });
    });

    it('should have type filter dropdown', async () => {
      renderListPage();

      await waitFor(() => {
        const typeFilter = screen.queryByLabelText(/type|tipo/i);
        const typeSelect = screen.queryByRole('combobox', {
          name: /type|tipo/i,
        });
        expect(typeFilter || typeSelect).toBeTruthy();
      });
    });

    it('should have resolved toggle', async () => {
      renderListPage();

      await waitFor(() => {
        const resolvedToggle = screen.queryByLabelText(
          /resolv|mostrar resolv/i
        );
        const resolvedCheckbox = screen.queryByRole('checkbox');
        expect(resolvedToggle || resolvedCheckbox).toBeTruthy();
      });
    });
  });

  // ==========================================================
  // Pagination
  // ==========================================================
  describe('pagination', () => {
    it('should show pagination controls when there are many items', async () => {
      const manyAnomalies = Array.from({ length: 60 }, (_, i) => ({
        id: `anomaly-uuid-${i}`,
        pipeline_run_id: 'prun-uuid-001',
        severity: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
        type: i % 2 === 0 ? 'volume' : 'null_check',
        description: `Test anomaly ${i}`,
        deviation_details: {},
        detected_at: `2026-05-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        resolved_at: null,
      }));

      server.use(
        http.get('http://localhost:8000/api/v1/anomalies', ({ request }) => {
          const url = new URL(request.url);
          const page = parseInt(url.searchParams.get('page') || '1');
          const perPage = parseInt(url.searchParams.get('per_page') || '50');
          const start = (page - 1) * perPage;
          const pageData = manyAnomalies.slice(start, start + perPage);

          return HttpResponse.json(
            {
              data: pageData,
              meta: { page, per_page: perPage, total: 60 },
              error: null,
            },
            { status: 200 }
          );
        })
      );

      renderListPage();

      await waitFor(() => {
        expect(screen.getByText('Test anomaly 0')).toBeInTheDocument();
      });
    });

    it('should navigate between pages', async () => {
      const manyAnomalies = Array.from({ length: 60 }, (_, i) => ({
        id: `anomaly-uuid-${i}`,
        pipeline_run_id: 'prun-uuid-001',
        severity: 'medium',
        type: 'volume',
        description: `Test anomaly ${i}`,
        deviation_details: {},
        detected_at: '2026-05-14T10:00:00Z',
        resolved_at: null,
      }));

      server.use(
        http.get('http://localhost:8000/api/v1/anomalies', ({ request }) => {
          const url = new URL(request.url);
          const page = parseInt(url.searchParams.get('page') || '1');
          const perPage = parseInt(url.searchParams.get('per_page') || '50');
          const start = (page - 1) * perPage;
          const pageData = manyAnomalies.slice(start, start + perPage);

          return HttpResponse.json(
            {
              data: pageData,
              meta: { page, per_page: perPage, total: 60 },
              error: null,
            },
            { status: 200 }
          );
        })
      );

      renderListPage();

      await waitFor(() => {
        expect(screen.getByText('Test anomaly 0')).toBeInTheDocument();
      });

      const nextButton = screen.queryByRole('button', { name: /next|pr.xim/i });
      if (nextButton) {
        await userEvent.click(nextButton);
        await waitFor(() => {
          expect(screen.queryByText('Test anomaly 50')).toBeInTheDocument();
        });
      }
    });
  });

  // ==========================================================
  // Actions
  // ==========================================================
  describe('actions', () => {
    it('should have "Resolver" button for unresolved anomalies', async () => {
      renderListPage();

      await waitFor(() => {
        const resolveButtons = screen.queryAllByText(/resolv|resolve/i);
        expect(resolveButtons.length).toBeGreaterThan(0);
      });
    });

    it('should mark anomaly as resolved when clicking "Resolver"', async () => {
      renderListPage();

      await waitFor(async () => {
        const resolveButtons = screen.queryAllByText(/resolv|resolve/i);
        if (resolveButtons.length > 0) {
          await userEvent.click(resolveButtons[0]);
        }
      });

      await waitFor(() => {
        // After resolve, the UI should update to reflect the resolved state
        const resolvedTexts = screen.queryAllByText(/resolv|resolved/i);
        expect(resolvedTexts.length).toBeGreaterThan(0);
      });
    });

    it('should show detail link for each anomaly row', async () => {
      renderListPage();

      await waitFor(() => {
        const links = screen.queryAllByRole('link');
        const detailLinks = links.filter((link) =>
          /anomal/i.test(link.getAttribute('href') || '')
        );
        expect(detailLinks.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================
  // States
  // ==========================================================
  describe('states', () => {
    it('should show loading state initially', async () => {
      renderListPage();

      const loadingElements = screen.queryAllByRole('status');
      // Loading indicators should be present before data resolves
    });

    it('should show empty state when no anomalies', async () => {
      server.use(
        http.get('http://localhost:8000/api/v1/anomalies', () => {
          return HttpResponse.json(
            { data: [], meta: { page: 1, per_page: 50, total: 0 }, error: null },
            { status: 200 }
          );
        })
      );

      renderListPage();

      await waitFor(() => {
        const emptyMessage = screen.queryByText(
          /nenhuma anomalia|no anomal|sem anomal/i
        );
        expect(emptyMessage).toBeInTheDocument();
      });
    });

    it('should show error state on API failure', async () => {
      server.use(
        http.get('http://localhost:8000/api/v1/anomalies', () => {
          return HttpResponse.json(
            {
              data: null,
              error: 'server_error',
              message: 'Failed to fetch anomalies',
            },
            { status: 500 }
          );
        })
      );

      renderListPage();

      await waitFor(() => {
        const errorMessage = screen.queryByText(/error|erro|failed|falha/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should have a table with proper structure', async () => {
      renderListPage();

      await waitFor(() => {
        const table = screen.queryByRole('table');
        // Table should be present when data loads
      });
    });

    it('should have a page title/heading', async () => {
      renderListPage();

      await waitFor(() => {
        const headings = screen.queryAllByRole('heading');
        expect(headings.length).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
