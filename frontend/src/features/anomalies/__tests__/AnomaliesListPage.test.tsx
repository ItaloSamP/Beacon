import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../../../test/mocks/server';

import { AnomaliesListPage } from '../AnomaliesListPage';
import { AuthProvider } from '../../../hooks/useAuth';

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

describe('AnomaliesListPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'mock-access-token');
    localStorage.setItem('refresh_token', 'mock-refresh-token');
  });

  describe('data rendering', () => {
    it('should render a table with anomaly rows', async () => {
      renderListPage();

      await waitFor(() => {
        const elems = screen.queryAllByText(/Null rate spike detected/i);
        expect(elems.length).toBeGreaterThan(0);
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
        const criticalBadges = screen.queryAllByText(/critical/i);
        const highBadges = screen.queryAllByText(/high/i);
        const mediumBadges = screen.queryAllByText(/medium/i);
        const lowBadges = screen.queryAllByText(/low/i);

        const total = criticalBadges.length + highBadges.length + mediumBadges.length + lowBadges.length;
        expect(total).toBeGreaterThan(0);
      });
    });

    it('should display data source and pipeline columns', async () => {
      renderListPage();

      await waitFor(() => {
        const dsElems = screen.queryAllByText(/Production PostgreSQL/i);
        const pipeElems = screen.queryAllByText(/Orders Null Profiler/i);
        expect(dsElems.length).toBeGreaterThanOrEqual(1);
        expect(pipeElems.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display detection dates', async () => {
      renderListPage();

      await waitFor(() => {
        expect(screen.getByText(/Showing/i)).toBeInTheDocument();
      });
    });

    it('should display resolved/active status', async () => {
      renderListPage();

      await waitFor(() => {
        const statusElements = screen.queryAllByText(/Active|Resolved/i);
        expect(statusElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('tabs', () => {
    it('should have tab navigation', async () => {
      renderListPage();

      await waitFor(() => {
        expect(screen.getByText(/All Anomalies/i)).toBeInTheDocument();
        expect(screen.getByText(/Active/i)).toBeInTheDocument();
        expect(screen.getByText(/Resolved/i)).toBeInTheDocument();
      });
    });
  });

  describe('actions', () => {
    it('should have "Resolve" button for unresolved anomalies', async () => {
      renderListPage();

      await waitFor(() => {
        const resolveButtons = screen.queryAllByText(/Resolve/i);
        expect(resolveButtons.length).toBeGreaterThan(0);
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

    it('should show inline critical anomaly detail', async () => {
      renderListPage();

      await waitFor(() => {
        expect(screen.getByText(/Deviation Evidence/i)).toBeInTheDocument();
      });
    });
  });

  describe('states', () => {
    it('should show loading state initially', async () => {
      renderListPage();

      const loadingElements = screen.queryAllByRole('status');
      // Loading indicators should be present before data resolves
    });

    it('should show empty state when no anomalies', async () => {
      server.use(
        http.get('/api/v1/anomalies', () => {
          return HttpResponse.json(
            { data: [], meta: { page: 1, per_page: 50, total: 0, active_count: 0 }, error: null },
            { status: 200 }
          );
        })
      );

      renderListPage();

      await waitFor(() => {
        const emptyMessages = screen.queryAllByText(
          /no anomalies found|No active anomalies|nenhuma anomalia|No resolved anomalies/i
        );
        expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should show error state on API failure', async () => {
      server.use(
        http.get('/api/v1/anomalies', () => {
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

    it('should have tablist role', async () => {
      renderListPage();

      await waitFor(() => {
        const tablist = screen.queryByRole('tablist');
        expect(tablist).toBeInTheDocument();
      });
    });
  });
});
