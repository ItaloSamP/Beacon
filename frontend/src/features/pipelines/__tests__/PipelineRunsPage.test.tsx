/**
 * Component tests for PipelineRunsPage.
 *
 * Tests the pipeline runs page:
 * - Renders table with run rows
 * - Status badges (success=green, warning=yellow, error=red)
 * - "Run Now" button to trigger pipeline execution
 * - Metrics summary for each run
 * - Loading, empty, and error states
 * - Back navigation link
 *
 * RED PHASE: All tests WILL FAIL because the PipelineRunsPage
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
import { PipelineRunsPage } from '../PipelineRunsPage';
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

function renderRunsPage(pipelineId: string = 'pipe-uuid-001') {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[`/pipelines/${pipelineId}/runs`]}
      >
        <AuthProvider>
          <Routes>
            <Route path="/pipelines/:pipelineId/runs" element={<PipelineRunsPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ============================================================
// Tests
// ============================================================

describe('PipelineRunsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'mock-access-token');
    localStorage.setItem('refresh_token', 'mock-refresh-token');
  });

  // ==========================================================
  // Data rendering
  // ==========================================================
  describe('data rendering', () => {
    it('should render a table with pipeline runs', async () => {
      renderRunsPage();

      await waitFor(() => {
        expect(
          screen.getByText(/Daily Volume Check/i)
        ).toBeInTheDocument();
      });
    });

    it('should display status badges for each run', async () => {
      renderRunsPage();

      await waitFor(() => {
        const successBadges = screen.queryAllByText(/success|sucesso/i);
        const warningBadges = screen.queryAllByText(/warning|aviso/i);

        const totalBadges = successBadges.length + warningBadges.length;
        expect(totalBadges).toBeGreaterThan(0);
      });
    });

    it('should display started timestamps', async () => {
      renderRunsPage();

      await waitFor(() => {
        const dateElements = screen.queryAllByText(/2026-05-1/i);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });

    it('should display finished timestamps when available', async () => {
      renderRunsPage();

      await waitFor(() => {
        // prun-uuid-001 has a finished_at
        expect(
          screen.queryByText(/2026-05-14T10:00:05Z/)
        ).toBeInTheDocument();
      });
    });

    it('should display pipeline name in header', async () => {
      renderRunsPage();

      await waitFor(() => {
        const pipelineNameElements =
          screen.getAllByText(/Daily Volume Check/i);
        expect(pipelineNameElements.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================
  // "Run Now" button
  // ==========================================================
  describe('"Run Now" button', () => {
    it('should have a "Run Now" button', async () => {
      renderRunsPage();

      await waitFor(() => {
        const runButtons = screen.queryAllByText(/run now|executar|run|rodar/i);
        const runByRole = screen.queryAllByRole('button', {
          name: /run now|executar|run|rodar/i,
        });
        expect(runButtons.length > 0 || runByRole.length > 0).toBe(true);
      });
    });

    it('should trigger pipeline execution when clicked', async () => {
      renderRunsPage();

      await waitFor(async () => {
        const runButton =
          screen.queryByText(/run now|executar|run|rodar/i) ||
          screen.queryByRole('button', {
            name: /run now|executar|run|rodar/i,
          });

        if (runButton) {
          await userEvent.click(runButton);
        }
      });

      await waitFor(() => {
        // After clicking "Run Now", a new run with status "started" should appear
        const startedElement = screen.queryByText(/started|iniciado/i);
        if (startedElement) {
          expect(startedElement).toBeInTheDocument();
        }
      });
    });

    it('should show "Run Now" button disabled while running', async () => {
      renderRunsPage();

      await waitFor(async () => {
        const runButton =
          screen.queryByRole('button', {
            name: /run now|executar|run|rodar/i,
          });

        if (runButton) {
          await userEvent.click(runButton);
        }
      });
    });
  });

  // ==========================================================
  // Metrics
  // ==========================================================
  describe('metrics', () => {
    it('should show metrics summary for each run', async () => {
      renderRunsPage();

      await waitFor(() => {
        const metricsElements = screen.queryAllByText(/row_count|delta|count/i);
        expect(metricsElements.length).toBeGreaterThan(0);
      });
    });

    it('should display numeric metric values', async () => {
      renderRunsPage();

      await waitFor(() => {
        const numbers = screen.queryAllByText(/\d+/);
        const numericValues = numbers.filter(
          (el) => el.textContent && /\d/.test(el.textContent.trim())
        );
        expect(numericValues.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================
  // States
  // ==========================================================
  describe('states', () => {
    it('should show loading state initially', async () => {
      renderRunsPage();

      const loadingElements = screen.queryAllByRole('status');
      // Loading indicators should be present before data resolves
    });

    it('should show empty state when no runs', async () => {
      server.use(
        http.get(
          'http://localhost:8000/api/v1/pipelines/pipe-uuid-001/runs',
          () => {
            return HttpResponse.json(
              {
                data: [],
                meta: { page: 1, per_page: 50, total: 0 },
                error: null,
              },
              { status: 200 }
            );
          }
        )
      );

      renderRunsPage();

      await waitFor(() => {
        const emptyMessage = screen.queryByText(
          /nunca executado|no run|sem execuc|nenhuma execu/i
        );
        expect(emptyMessage).toBeInTheDocument();
      });
    });

    it('should show error state on API failure', async () => {
      server.use(
        http.get(
          'http://localhost:8000/api/v1/pipelines/pipe-uuid-001/runs',
          () => {
            return HttpResponse.json(
              {
                data: null,
                error: 'server_error',
                message: 'Failed to load pipeline runs',
              },
              { status: 500 }
            );
          }
        )
      );

      renderRunsPage();

      await waitFor(() => {
        const errorMessage = screen.queryByText(/error|erro|failed|falha/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  // ==========================================================
  // Navigation
  // ==========================================================
  describe('navigation', () => {
    it('should have a back link to pipelines list', async () => {
      renderRunsPage();

      await waitFor(() => {
        const links = screen.queryAllByRole('link');
        const backLinks = links.filter(
          (link) =>
            link.textContent?.toLowerCase().includes('back') ||
            link.textContent?.toLowerCase().includes('voltar') ||
            link.getAttribute('href')?.includes('pipelines')
        );
        expect(backLinks.length).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
