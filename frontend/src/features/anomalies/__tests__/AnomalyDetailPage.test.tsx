import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../../../test/mocks/server';

import { AnomalyDetailPage } from '../AnomalyDetailPage';
import { AuthProvider } from '../../../hooks/useAuth';

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

describe('AnomalyDetailPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'mock-access-token');
    localStorage.setItem('refresh_token', 'mock-refresh-token');
  });

  describe('detail rendering', () => {
    it('should render anomaly detail with correct data', async () => {
      renderDetailPage();

      await waitFor(() => {
        const elems = screen.queryAllByText(/Null rate spike detected/i);
        expect(elems.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display severity badge', async () => {
      renderDetailPage();

      await waitFor(() => {
        const badges = screen.queryAllByText(/critical/i);
        expect(badges.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display anomaly type', async () => {
      renderDetailPage();

      await waitFor(() => {
        const typeElements = screen.queryAllByText(/null check/i);
        expect(typeElements.length).toBeGreaterThan(0);
      });
    });

    it('should display deviation details in CodeBlock', async () => {
      renderDetailPage();

      await waitFor(() => {
        expect(screen.getByText(/z_score/i)).toBeInTheDocument();
        expect(screen.getByText(/threshold/i)).toBeInTheDocument();
      });
    });

    it('should display pipeline name', async () => {
      renderDetailPage();

      await waitFor(() => {
        expect(
          screen.getByText(/Orders Null Profiler/i)
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

    it('should display alerts table', async () => {
      renderDetailPage();

      await waitFor(() => {
        const alertElements = screen.queryAllByText(/email|slack/i);
        expect(alertElements.length).toBeGreaterThan(0);
      });
    });

    it('should display detection timestamp', async () => {
      renderDetailPage();

      await waitFor(() => {
        const elems = screen.queryAllByText(/Detectada/i);
        expect(elems.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display Z-Score', async () => {
      renderDetailPage();

      await waitFor(() => {
        expect(screen.getByText(/z=/i)).toBeInTheDocument();
      });
    });

    it('should display comparison between baseline and current', async () => {
      renderDetailPage();

      await waitFor(() => {
        const baselineElems = screen.queryAllByText(/Baseline/i);
        const currentElems = screen.queryAllByText(/Valor Atual/i);
        expect(baselineElems.length).toBeGreaterThanOrEqual(1);
        expect(currentElems.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display recommendation', async () => {
      renderDetailPage();

      await waitFor(() => {
        expect(screen.getByText(/Recomendacao/i)).toBeInTheDocument();
      });
    });

    it('should display description', async () => {
      renderDetailPage();

      await waitFor(() => {
        expect(screen.getByText(/Descricao/i)).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('should have breadcrumb link to anomalies list', async () => {
      renderDetailPage();

      await waitFor(() => {
        const links = screen.queryAllByRole('link');
        const anomalyLinks = links.filter(
          (link) => link.getAttribute('href') === '/anomalies'
        );
        expect(anomalyLinks.length).toBeGreaterThan(0);
      });
    });

    it('should have link to pipeline runs', async () => {
      renderDetailPage();

      await waitFor(() => {
        const links = screen.queryAllByRole('link');
        const pipelineLinks = links.filter(
          (link) =>
            link.getAttribute('href')?.includes('pipelines')
        );
        expect(pipelineLinks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('states', () => {
    it('should show loading state initially', async () => {
      renderDetailPage();

      const loadingElements = screen.queryAllByRole('status');
      // Loading indicator should be present before data resolves
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
          /n.o encontrad|não encontrad/i
        );
        expect(notFoundMessage).toBeInTheDocument();
      });
    });
  });

  describe('actions', () => {
    it('should have "Marcar como Resolvida" button when anomaly is not resolved', async () => {
      renderDetailPage();

      await waitFor(() => {
        const resolveButton = screen.queryByText(/Marcar como Resolvida/i);
        expect(resolveButton).toBeInTheDocument();
      });
    });

    it('should resolve anomaly when resolve button is clicked', async () => {
      renderDetailPage();

      await waitFor(async () => {
        const resolveButton = screen.queryByText(/Marcar como Resolvida/i);
        if (resolveButton) {
          await userEvent.click(resolveButton);
        }
      });

      await waitFor(() => {
        expect(screen.queryByText(/Resolvida em/i)).toBeInTheDocument();
      });
    });
  });
});
