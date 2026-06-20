/**
 * Component tests for AlertRulesSection.
 *
 * Tests the alert rules CRUD UI:
 * - Renders section title and empty/loading/error states
 * - Lists existing rules with metric, operator, threshold
 * - Add Rule button in edit mode, disabled helper text in create mode
 * - Inline add form with metric/operator/threshold fields
 * - Inline edit mode with pre-filled values
 * - Optimistic delete removal
 * - Cancel button closes form without changes
 * - Error handling on API failure
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/mocks/server';

import { AlertRulesSection } from '../AlertRulesSection';
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

interface RenderOptions {
  pipelineId?: string;
  isEditing?: boolean;
}

function renderSection({ pipelineId = 'pipe-uuid-001', isEditing = true }: RenderOptions = {}) {
  const queryClient = createTestQueryClient();

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <AlertRulesSection pipelineId={pipelineId} isEditing={isEditing} />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  };
}

// ============================================================
// Tests
// ============================================================

describe('AlertRulesSection', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'mock-access-token');
    localStorage.setItem('refresh_token', 'mock-refresh-token');
  });

  // ==========================================================
  // Rendering and states
  // ==========================================================
  describe('rendering and states', () => {
    it('renders section title "Alert Rules"', async () => {
      renderSection();

      await waitFor(() => {
        expect(screen.getByText('Alert Rules')).toBeInTheDocument();
      });
    });

    it('renders empty state message when no rules exist', async () => {
      server.use(
        http.get('/api/v1/pipelines/:pipelineId/rules', () => {
          return HttpResponse.json({ data: [], error: null }, { status: 200 });
        })
      );

      renderSection();

      await waitFor(() => {
        expect(screen.getByText('No alert rules configured yet.')).toBeInTheDocument();
      });
    });

    it('renders list of rules with metric name, operator, and threshold', async () => {
      renderSection();

      await waitFor(() => {
        // Rule 1: Z-Score, >, 3.0
        expect(screen.getByText('Z-Score')).toBeInTheDocument();
        expect(screen.getByText('> 3')).toBeInTheDocument();
        // Rule 2: Null %, ≥, 5.5
        expect(screen.getByText('Null %')).toBeInTheDocument();
        // Rule 3: Volume Delta %, <, 10.0
        expect(screen.getByText('Volume Delta %')).toBeInTheDocument();
      });
    });

    it('shows loading spinner while fetching', async () => {
      server.use(
        http.get('/api/v1/pipelines/:pipelineId/rules', async () => {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return HttpResponse.json({ data: [], error: null }, { status: 200 });
        })
      );

      renderSection();

      // Loading spinner should appear
      const spinner = screen.getByLabelText('Loading rules');
      expect(spinner).toBeInTheDocument();
    });

    it('shows error state on API failure', async () => {
      server.use(
        http.get('/api/v1/pipelines/:pipelineId/rules', () => {
          return HttpResponse.json(
            { data: null, error: 'Failed to load alert rules' },
            { status: 500 }
          );
        })
      );

      renderSection();

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load alert rules/i)
        ).toBeInTheDocument();
      });
    });
  });

  // ==========================================================
  // Edit mode vs create mode
  // ==========================================================
  describe('edit mode vs create mode', () => {
    it('shows "Add Rule" button in edit mode', async () => {
      renderSection({ isEditing: true });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /add rule/i })
        ).toBeInTheDocument();
      });
    });

    it('shows disabled helper text in create mode', async () => {
      renderSection({ isEditing: false });

      await waitFor(() => {
        expect(
          screen.getByText('Save the pipeline first to add rules')
        ).toBeInTheDocument();
      });
    });

    it('does not show "Add Rule" button in create mode', async () => {
      renderSection({ isEditing: false });

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /add rule/i })
        ).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================
  // Add rule flow
  // ==========================================================
  describe('add rule flow', () => {
    it('opens inline form when clicking "Add Rule"', async () => {
      renderSection();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /add rule/i })
        ).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /add rule/i }));

      // Form fields should appear
      await waitFor(() => {
        expect(screen.getByLabelText('Metric')).toBeInTheDocument();
        expect(screen.getByLabelText('Operator')).toBeInTheDocument();
        expect(screen.getByLabelText('Threshold')).toBeInTheDocument();
      });
    });

    it('fills form and submits to create a rule', async () => {
      renderSection();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /add rule/i })
        ).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /add rule/i }));

      // Form should be visible
      await waitFor(() => {
        expect(screen.getByLabelText('Metric')).toBeInTheDocument();
      });

      // Set threshold to a valid value
      const thresholdInput = screen.getByLabelText('Threshold');
      await userEvent.clear(thresholdInput);
      await userEvent.type(thresholdInput, '4.5');

      // Submit
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      // Form should close after successful submit
      await waitFor(() => {
        expect(screen.queryByLabelText('Metric')).not.toBeInTheDocument();
      });
    });

    it('shows validation error for invalid threshold', async () => {
      renderSection();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /add rule/i })
        ).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /add rule/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Threshold')).toBeInTheDocument();
      });

      const thresholdInput = screen.getByLabelText('Threshold');
      await userEvent.clear(thresholdInput);
      await userEvent.type(thresholdInput, '-5');

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(
          screen.getByText('Threshold must be greater than 0')
        ).toBeInTheDocument();
      });
    });
  });

  // ==========================================================
  // Edit rule flow
  // ==========================================================
  describe('edit rule flow', () => {
    it('switches to inline edit mode when clicking Edit', async () => {
      renderSection();

      await waitFor(() => {
        const editButtons = screen.getAllByLabelText(/edit rule/i);
        expect(editButtons.length).toBeGreaterThan(0);
      });

      await userEvent.click(screen.getAllByLabelText(/edit rule/i)[0]);

      // Form should appear with pre-filled values
      await waitFor(() => {
        expect(screen.getByLabelText('Metric')).toBeInTheDocument();
        expect(screen.getByLabelText('Operator')).toBeInTheDocument();
        expect(screen.getByLabelText('Threshold')).toBeInTheDocument();
      });
    });

    it('submits edit and updates the rule', async () => {
      renderSection();

      await waitFor(() => {
        const editButtons = screen.getAllByLabelText(/edit rule/i);
        expect(editButtons.length).toBeGreaterThan(0);
      });

      await userEvent.click(screen.getAllByLabelText(/edit rule/i)[0]);

      await waitFor(() => {
        expect(screen.getByLabelText('Threshold')).toBeInTheDocument();
      });

      const thresholdInput = screen.getByLabelText('Threshold');
      await userEvent.clear(thresholdInput);
      await userEvent.type(thresholdInput, '7.5');

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      // Form should close after successful submit
      await waitFor(() => {
        expect(screen.queryByLabelText('Metric')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================
  // Delete rule flow (optimistic)
  // ==========================================================
  describe('delete rule flow', () => {
    it('removes rule from list when clicking Delete', async () => {
      renderSection();

      // Wait for rules to load
      await waitFor(() => {
        const zScoreBadges = screen.getAllByText('Z-Score');
        expect(zScoreBadges.length).toBeGreaterThan(0);
      });

      const initialCount = screen.getAllByText('Z-Score').length;
      const deleteButtons = screen.getAllByLabelText(/delete rule/i);
      expect(deleteButtons.length).toBeGreaterThan(0);

      await userEvent.click(deleteButtons[0]);

      // Rule should be removed optimistically
      await waitFor(() => {
        const afterCount = screen.queryAllByText('Z-Score').length;
        expect(afterCount).toBeLessThan(initialCount);
      });
    });

    it('rolls back on delete failure', async () => {
      server.use(
        http.delete('/api/v1/pipelines/:pipelineId/rules/:ruleId', () => {
          return HttpResponse.json(
            { data: null, error: 'server_error' },
            { status: 500 }
          );
        })
      );

      renderSection();

      await waitFor(() => {
        const zScoreBadges = screen.getAllByText('Z-Score');
        expect(zScoreBadges.length).toBeGreaterThan(0);
      });

      const initialCount = screen.getAllByText('Z-Score').length;
      const deleteButtons = screen.getAllByLabelText(/delete rule/i);
      await userEvent.click(deleteButtons[0]);

      // Rule should reappear after rollback (same count as before)
      await waitFor(() => {
        const afterCount = screen.queryAllByText('Z-Score').length;
        expect(afterCount).toBe(initialCount);
      }, { timeout: 5000 });
    });
  });

  // ==========================================================
  // Cancel button
  // ==========================================================
  describe('cancel button', () => {
    it('closes add form without changes', async () => {
      renderSection();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /add rule/i })
        ).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /add rule/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Metric')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      // Form should disappear
      await waitFor(() => {
        expect(screen.queryByLabelText('Metric')).not.toBeInTheDocument();
      });

      // Add Rule button should be visible again
      expect(
        screen.getByRole('button', { name: /add rule/i })
      ).toBeInTheDocument();
    });

    it('closes edit form without saving changes', async () => {
      renderSection();

      await waitFor(() => {
        const editButtons = screen.getAllByLabelText(/edit rule/i);
        expect(editButtons.length).toBeGreaterThan(0);
      });

      await userEvent.click(screen.getAllByLabelText(/edit rule/i)[0]);

      await waitFor(() => {
        expect(screen.getByLabelText('Threshold')).toBeInTheDocument();
      });

      // Change threshold but cancel
      const thresholdInput = screen.getByLabelText('Threshold');
      await userEvent.clear(thresholdInput);
      await userEvent.type(thresholdInput, '99.9');

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      // Form should close, rules list should be visible again
      await waitFor(() => {
        expect(screen.queryByLabelText('Metric')).not.toBeInTheDocument();
      });

      // Rules list items should be visible (the form closed without saving)
      const ruleCards = document.querySelectorAll('ul[role="list"] li');
      expect(ruleCards.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================
  // Error handling during mutations
  // ==========================================================
  describe('mutation error handling', () => {
    it('displays error message on create failure', async () => {
      server.use(
        http.post('/api/v1/pipelines/:pipelineId/rules', () => {
          return HttpResponse.json(
            { data: null, error: 'server_error', message: 'Database unavailable' },
            { status: 500 }
          );
        })
      );

      renderSection();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /add rule/i })
        ).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /add rule/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Threshold')).toBeInTheDocument();
      });

      const thresholdInput = screen.getByLabelText('Threshold');
      await userEvent.clear(thresholdInput);
      await userEvent.type(thresholdInput, '5');

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(
          screen.getByText('Database unavailable')
        ).toBeInTheDocument();
      });
    });

    it('displays error message on update failure', async () => {
      server.use(
        http.put('/api/v1/pipelines/:pipelineId/rules/:ruleId', () => {
          return HttpResponse.json(
            { data: null, error: 'server_error', message: 'Update failed' },
            { status: 500 }
          );
        })
      );

      renderSection();

      await waitFor(() => {
        const editButtons = screen.getAllByLabelText(/edit rule/i);
        expect(editButtons.length).toBeGreaterThan(0);
      });

      await userEvent.click(screen.getAllByLabelText(/edit rule/i)[0]);

      await waitFor(() => {
        expect(screen.getByLabelText('Threshold')).toBeInTheDocument();
      });

      const thresholdInput = screen.getByLabelText('Threshold');
      await userEvent.clear(thresholdInput);
      await userEvent.type(thresholdInput, '8');

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });
    });
  });
});
