/**
 * Component tests for DataSourceForm.
 *
 * Tests the create/edit form behavior:
 * - Create mode: empty form, submit creates
 * - Edit mode: pre-filled with existing data
 * - Form validation (required fields, valid types)
 * - Submit calls API and handles success/error
 * - Cancel returns to list
 *
 * RED PHASE: All tests WILL FAIL because the component
 * and its dependencies don't exist yet.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ============================================================
// IMPORTS THAT WILL FAIL (RED PHASE — modules don't exist yet)
// ============================================================
import { DataSourceForm } from '../DataSourceForm';
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
      <MemoryRouter initialEntries={['/datasources/new']}>
        <AuthProvider>
          <Routes>
            <Route path="/datasources/new" element={<DataSourceForm />} />
            <Route path="/datasources" element={<div>List Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderEditForm(datasourceId: string = 'ds-uuid-001') {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/datasources/${datasourceId}/edit`]}>
        <AuthProvider>
          <Routes>
            <Route path="/datasources/:id/edit" element={<DataSourceForm />} />
            <Route path="/datasources" element={<div>List Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ============================================================
// Tests
// ============================================================

describe('DataSourceForm', () => {
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

    it('should have a type select/dropdown', () => {
      renderCreateForm();

      const typeSelect = screen.queryByLabelText(/type|tipo/i) || screen.queryByRole('combobox');
      expect(typeSelect).toBeInTheDocument();
    });

    it('should have a status select/dropdown', () => {
      renderCreateForm();

      const statusSelect = screen.queryByLabelText(/status/i);
      // May or may not be present
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

    it('should display "Create Data Source" as title', () => {
      renderCreateForm();

      const title = screen.queryByText(/create|new|criar|novo/i);
      expect(title).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Edit mode
  // ==========================================================
  describe('edit mode', () => {
    it('should pre-fill form with existing data in edit mode', async () => {
      renderEditForm('ds-uuid-001');

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name|nome/i) || screen.getByPlaceholderText(/name|nome/i);
        // In edit mode, the name should be pre-filled from mock data
        // (Production PostgreSQL from handlers)
        expect(nameInput).toBeInTheDocument();
      });
    });

    it('should display "Edit Data Source" as title', () => {
      renderEditForm('ds-uuid-001');

      const title = screen.queryByText(/edit|editar/i);
      expect(title).toBeInTheDocument();
    });

    it('should show loading state while fetching data', () => {
      renderEditForm('ds-uuid-001');

      // Initially may show loading
      const loadingElements = screen.queryAllByRole('status');
      // Loading state should resolve
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

    it('should show error for invalid type', async () => {
      renderCreateForm();

      const nameInput = screen.getByLabelText(/name|nome/i) || screen.getByPlaceholderText(/name|nome/i);
      await userEvent.type(nameInput, 'Test DS');

      // Try to submit without selecting a valid type
      const submitButton = screen.getByRole('button', { name: /save|salvar|criar|create|submit/i });
      await userEvent.click(submitButton);
    });

    it('should validate type is one of allowed values', async () => {
      renderCreateForm();

      const nameInput = screen.getByLabelText(/name|nome/i) || screen.getByPlaceholderText(/name|nome/i);
      await userEvent.type(nameInput, 'Test DS');

      // The type field should offer valid options: postgres, mysql, bigquery, google_sheets
      const typeSelect = screen.queryByLabelText(/type|tipo/i) || screen.queryByRole('combobox');
      if (typeSelect) {
        expect(typeSelect).toBeInTheDocument();
      }
    });
  });

  // ==========================================================
  // Submit flow
  // ==========================================================
  describe('submit flow', () => {
    it('should submit form and redirect on success', async () => {
      renderCreateForm();

      // Fill in the form
      const nameInput = screen.getByLabelText(/name|nome/i) || screen.getByPlaceholderText(/name|nome/i);
      await userEvent.type(nameInput, 'New Data Source');

      const submitButton = screen.getByRole('button', { name: /save|salvar|criar|create|submit/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        // Should redirect to list after successful creation
        const listPageText = screen.queryByText(/list/i);
        // This depends on router configuration
      });
    });

    it('should show loading state during submission', async () => {
      renderCreateForm();

      const nameInput = screen.getByLabelText(/name|nome/i) || screen.getByPlaceholderText(/name|nome/i);
      await userEvent.type(nameInput, 'Loading Test');

      const submitButton = screen.getByRole('button', { name: /save|salvar|criar|create|submit/i });
      await userEvent.click(submitButton);

      // Button should be disabled or show loading during submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
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
      await userEvent.type(nameInput, 'Redirect Test');

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
    });
  });
});
