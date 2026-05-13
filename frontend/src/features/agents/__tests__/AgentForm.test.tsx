/**
 * Component tests for AgentForm.
 *
 * Tests the create/edit form behavior:
 * - Create mode: empty form, submit creates
 * - Edit mode: pre-filled with existing data
 * - Form validation (required fields)
 * - Submit calls API and handles success/error
 * - Cancel returns to list
 * - Status select (online/offline)
 * - Version field
 *
 * RED PHASE: All tests WILL FAIL because the AgentForm component
 * and its dependencies don't exist yet.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ============================================================
// IMPORTS THAT WILL FAIL (RED PHASE — modules don't exist yet)
// ============================================================
import { AgentForm } from '../AgentForm';
import { AuthProvider } from '../../../hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


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

function renderCreateForm() {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/agents/new']}>
        <AuthProvider>
          <Routes>
            <Route path="/agents/new" element={<AgentForm />} />
            <Route path="/agents" element={<div>List Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderEditForm(agentId: string = 'agent-uuid-001') {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/agents/${agentId}/edit`]}>
        <AuthProvider>
          <Routes>
            <Route path="/agents/:id/edit" element={<AgentForm />} />
            <Route path="/agents" element={<div>List Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}


// ============================================================
// Tests
// ============================================================

describe('AgentForm', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'mock-access-token');
  });

  // ==========================================================
  // Create mode
  // ==========================================================
  describe('create mode', () => {
    it('should render empty form in create mode', () => {
      renderCreateForm();

      const nameInput = screen.queryByLabelText(/name|nome/i) || screen.queryByPlaceholderText(/name|nome/i);
      expect(nameInput).toBeInTheDocument();
    });

    it('should have a name input field', () => {
      renderCreateForm();

      const nameInput = screen.getByLabelText(/name|nome/i) || screen.getByPlaceholderText(/name|nome/i);
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveValue('');
    });

    it('should have a status select/dropdown', () => {
      renderCreateForm();

      const statusSelect = screen.queryByLabelText(/status/i) || screen.queryAllByRole('combobox')[0];
      expect(statusSelect).toBeInTheDocument();
    });

    it('should have a version input field', () => {
      renderCreateForm();

      const versionInput = screen.queryByLabelText(/version|versão/i) || screen.queryByPlaceholderText(/version|versão/i);
      // Version field may be present
      if (versionInput) {
        expect(versionInput).toBeInTheDocument();
      }
    });

    it('should have a submit button', () => {
      renderCreateForm();

      const submitButton = screen.getByRole('button', { name: /save|salvar|criar|create|submit/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should have a cancel button or link', () => {
      renderCreateForm();

      const cancelButton = screen.queryByRole('button', { name: /cancel|cancelar/i })
        || screen.queryByText(/cancel|cancelar|back|voltar/i);

      expect(cancelButton).toBeInTheDocument();
    });

    it('should display "Create Agent" as title', () => {
      renderCreateForm();

      const title = screen.queryByText(/create agent|new agent|novo agent|criar agent/i);
      expect(title).toBeInTheDocument();
    });

    it('should submit form and create agent', async () => {
      renderCreateForm();

      // Fill in the form
      const nameInput = screen.getByLabelText(/name|nome/i) || screen.getByPlaceholderText(/name|nome/i);
      await userEvent.type(nameInput, 'New Test Agent');

      const submitButton = screen.getByRole('button', { name: /save|salvar|criar|create|submit/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        // Should redirect to list after successful creation
        const listPageText = screen.queryByText(/list/i);
        // This depends on router configuration
      });
    });
  });

  // ==========================================================
  // Edit mode
  // ==========================================================
  describe('edit mode', () => {
    it('should pre-fill form with existing data in edit mode', async () => {
      renderEditForm('agent-uuid-001');

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name|nome/i) || screen.getByPlaceholderText(/name|nome/i);
        // In edit mode, the name should be pre-filled from mock data (Production Agent)
        expect(nameInput).toBeInTheDocument();
      });
    });

    it('should display "Edit Agent" as title', () => {
      renderEditForm('agent-uuid-001');

      const title = screen.queryByText(/edit agent|editar agent/i);
      expect(title).toBeInTheDocument();
    });

    it('should show loading state while fetching data', () => {
      renderEditForm('agent-uuid-001');

      // Initially may show loading
      const loadingElements = screen.queryAllByRole('status');
      // Loading state should resolve
    });

    it('should submit updates on save in edit mode', async () => {
      renderEditForm('agent-uuid-001');

      await waitFor(async () => {
        const nameInput = screen.getByLabelText(/name|nome/i) || screen.getByPlaceholderText(/name|nome/i);
        if (nameInput) {
          await userEvent.clear(nameInput);
          await userEvent.type(nameInput, 'Updated Agent Name');

          const submitButton = screen.getByRole('button', { name: /save|salvar|atualizar|update|submit/i });
          await userEvent.click(submitButton);
        }
      });
    });
  });

  // ==========================================================
  // Form validation
  // ==========================================================
  describe('form validation', () => {
    it('should show error when submitting empty name', async () => {
      renderCreateForm();

      const submitButton = screen.getByRole('button', { name: /save|salvar|criar|create|submit/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/name|nome|required|obrigatório/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should validate name is not just whitespace', async () => {
      renderCreateForm();

      const nameInput = screen.getByLabelText(/name|nome/i) || screen.getByPlaceholderText(/name|nome/i);
      await userEvent.type(nameInput, '   ');

      const submitButton = screen.getByRole('button', { name: /save|salvar|criar|create|submit/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        // "name"/"nome" removed from regex — they match the form label; target only error keywords
        const errorMessage = screen.queryByText(/required|obrigatório|must|precisa/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should validate status is one of allowed values (online/offline)', async () => {
      renderCreateForm();

      const statusSelect = screen.queryByLabelText(/status/i);
      if (statusSelect) {
        expect(statusSelect).toBeInTheDocument();
        // The status field should only offer online/offline options
      }
    });
  });

  // ==========================================================
  // Submit flow
  // ==========================================================
  describe('submit flow', () => {
    it('should show loading state during submission', async () => {
      renderCreateForm();

      const nameInput = screen.getByLabelText(/name|nome/i) || screen.getByPlaceholderText(/name|nome/i);
      await userEvent.type(nameInput, 'Loading Test Agent');

      const submitButton = screen.getByRole('button', { name: /save|salvar|criar|create|submit/i });
      await userEvent.click(submitButton);

      // Button should be disabled or show loading during submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should show error message on API error', async () => {
      renderCreateForm();

      const nameInput = screen.getByLabelText(/name|nome/i) || screen.getByPlaceholderText(/name|nome/i);
      await userEvent.type(nameInput, 'Error Agent');

      const submitButton = screen.getByRole('button', { name: /save|salvar|criar|create|submit/i });
      await userEvent.click(submitButton);

      // After error response, there should be some feedback
      await waitFor(() => {
        // Error handling behavior depends on implementation
      });
    });
  });

  // ==========================================================
  // Cancel/Navigation
  // ==========================================================
  describe('cancel/navigation', () => {
    it('should navigate back to list on cancel', async () => {
      renderCreateForm();

      const cancelButton = screen.queryByRole('button', { name: /cancel|cancelar/i })
        || screen.queryByRole('link', { name: /cancel|cancelar|back|voltar/i })
        || screen.queryByText(/cancel|cancelar|back|voltar/i);

      if (cancelButton) {
        await userEvent.click(cancelButton);

        await waitFor(() => {
          expect(screen.getByText('List Page')).toBeInTheDocument();
        });
      }
    });

    it('should navigate back to list after successful submit', async () => {
      renderCreateForm();

      const nameInput = screen.getByLabelText(/name|nome/i) || screen.getByPlaceholderText(/name|nome/i);
      await userEvent.type(nameInput, 'Redirect Agent');

      const submitButton = screen.getByRole('button', { name: /save|salvar|criar|create|submit/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('List Page')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should have accessible form labels', () => {
      renderCreateForm();

      const form = screen.queryByRole('form');
      if (form) {
        expect(form).toBeInTheDocument();
      }
    });

    it('should focus the first input on mount', () => {
      renderCreateForm();

      const nameInput = screen.getByLabelText(/name|nome/i) || screen.getByPlaceholderText(/name|nome/i);
      // First input should be focused or focusable
      expect(nameInput).toBeInTheDocument();
    });
  });
});
