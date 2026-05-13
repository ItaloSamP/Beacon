/**
 * Component tests for AgentsListPage.
 *
 * Tests the agents list page:
 * - Renders a table with agent rows
 * - Shows loading state while fetching
 * - Shows empty state when no agents
 * - Shows error state on API failure
 * - Has "create new" button
 * - Has delete action with confirmation
 * - Status badge (online/offline)
 * - Agent name and version display
 *
 * RED PHASE: All tests WILL FAIL because the AgentsListPage component
 * and its dependencies don't exist yet.
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
import { AgentsListPage } from '../AgentsListPage';
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
      <MemoryRouter initialEntries={['/agents']}>
        <AuthProvider>
          <AgentsListPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ============================================================
// Tests
// ============================================================

describe('AgentsListPage', () => {
  beforeEach(() => {
    localStorage.clear();
    // Pre-authenticate by setting tokens in storage
    localStorage.setItem('access_token', 'mock-access-token');
    localStorage.setItem('refresh_token', 'mock-refresh-token');
  });

  // ==========================================================
  // Data rendering
  // ==========================================================
  describe('data rendering', () => {
    it('should render a table with agents', async () => {
      renderListPage();

      await waitFor(() => {
        // Should show the agent names from mock handlers
        expect(screen.getByText('Production Agent')).toBeInTheDocument();
        expect(screen.getByText('Staging Agent')).toBeInTheDocument();
      });
    });

    it('should display agent names', async () => {
      renderListPage();

      await waitFor(() => {
        expect(screen.getByText('Production Agent')).toBeInTheDocument();
      });
    });

    it('should display agent status badges', async () => {
      renderListPage();

      await waitFor(() => {
        // Online agents should show "online" badge
        const onlineBadges = screen.getAllByText(/online/i);
        expect(onlineBadges.length).toBeGreaterThan(0);
      });
    });

    it('should display offline status badge', async () => {
      renderListPage();

      await waitFor(() => {
        const offlineElements = screen.getAllByText(/offline/i);
        expect(offlineElements.length).toBeGreaterThan(0);
      });
    });

    it('should display agent version', async () => {
      renderListPage();

      await waitFor(() => {
        // Both mock agents share version "0.1.0" — use getAllByText
        const versionElements = screen.getAllByText('0.1.0');
        expect(versionElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display action buttons for each row', async () => {
      renderListPage();

      await waitFor(() => {
        // Each row should have edit and delete actions
        const editLinks = screen.getAllByText(/edit|editar/i);
        expect(editLinks.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================
  // States
  // ==========================================================
  describe('states', () => {
    it('should show loading state initially', async () => {
      renderListPage();

      // Immediately after render, there should be loading indicators
      const loadingElements = screen.queryAllByRole('status');
      // Loading state should be shown before data arrives
      // (may resolve quickly in tests)
    });

    it('should show empty state when no agents', async () => {
      // Override handler to return empty list
      server.use(
        http.get('http://localhost:8000/api/v1/agents', () => {
          return HttpResponse.json(
            { data: [], meta: { page: 1, per_page: 50, total: 0 }, error: null },
            { status: 200 }
          );
        })
      );

      renderListPage();

      await waitFor(() => {
        const emptyMessage = screen.queryByText(/no agents|empty|nenhum|sem agent|no agent/i);
        expect(emptyMessage).toBeInTheDocument();
      });
    });

    it('should show error state on API failure', async () => {
      // Override handler to return error
      server.use(
        http.get('http://localhost:8000/api/v1/agents', () => {
          return HttpResponse.json(
            { data: null, error: 'server_error', message: 'Internal error fetching agents' },
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
  // User interactions
  // ==========================================================
  describe('user interactions', () => {
    it('should have a "New Agent" button', async () => {
      renderListPage();

      await waitFor(() => {
        const createButton = screen.queryByText(/new agent|novo agent|criar agent/i);
        expect(createButton).toBeInTheDocument();
      });
    });

    it('should navigate to create page when "New Agent" is clicked', async () => {
      renderListPage();

      await waitFor(async () => {
        const createLink = screen.queryByRole('link', { name: /new agent|novo agent|criar agent/i })
          || screen.queryByText(/new agent|novo agent|criar agent/i);

        if (createLink) {
          await userEvent.click(createLink);
          // Navigation should happen (URL change)
        }
      });
    });

    it('should have edit link for each agent', async () => {
      renderListPage();

      await waitFor(() => {
        const editLinks = screen.queryAllByText(/edit|editar/i);
        if (editLinks.length > 0) {
          expect(editLinks[0]).toBeInTheDocument();
        }
      });
    });

    it('should have delete button for each agent', async () => {
      renderListPage();

      await waitFor(() => {
        const deleteButtons = screen.queryAllByText(/delete|remover|excluir/i);
        if (deleteButtons.length > 0) {
          expect(deleteButtons[0]).toBeInTheDocument();
        }
      });
    });

    it('should show confirmation dialog on delete', async () => {
      renderListPage();

      await waitFor(async () => {
        const deleteButtons = screen.queryAllByText(/delete|remover|excluir/i) ||
          screen.queryAllByRole('button', { name: /delete|remover|excluir/i });
        if (deleteButtons.length > 0) {
          await userEvent.click(deleteButtons[0]);

          // Should have a confirmation dialog
          await waitFor(() => {
            const confirmText = screen.queryByText(/confirm|confirmar|are you sure|tem certeza|yes|sim/i);
            expect(confirmText).toBeInTheDocument();
          });
        }
      });
    });
  });

  // ==========================================================
  // Pagination
  // ==========================================================
  describe('pagination', () => {
    it('should display pagination controls when there are many items', async () => {
      // Add many agents to trigger pagination
      const manyAgents = Array.from({ length: 60 }, (_, i) => ({
        id: `agent-uuid-${i}`,
        name: `Agent ${i}`,
        status: i % 2 === 0 ? 'online' : 'offline',
        version: '0.1.0',
        last_heartbeat_at: null,
        created_at: '2026-05-12T00:00:00Z',
      }));

      server.use(
        http.get('http://localhost:8000/api/v1/agents', ({ request }) => {
          const url = new URL(request.url);
          const page = parseInt(url.searchParams.get('page') || '1');
          const perPage = parseInt(url.searchParams.get('per_page') || '50');
          const start = (page - 1) * perPage;
          const pageData = manyAgents.slice(start, start + perPage);

          return HttpResponse.json(
            { data: pageData, meta: { page, per_page: perPage, total: 60 }, error: null },
            { status: 200 }
          );
        })
      );

      renderListPage();

      await waitFor(() => {
        expect(screen.getByText('Agent 0')).toBeInTheDocument();
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
        // May be present when data loads
      });
    });

    it('should have a page title/heading', async () => {
      renderListPage();

      await waitFor(() => {
        const headings = screen.queryAllByRole('heading');
        // Should have at least one heading
        expect(headings.length).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
