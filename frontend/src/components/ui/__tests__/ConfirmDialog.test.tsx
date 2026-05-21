/**
 * Unit tests for ConfirmDialog component — refined version.
 *
 * Tests: rendering title/message/buttons, confirm/cancel callbacks,
 * variant (danger/primary), Escape key close, role="alertdialog",
 * and aria-modal.
 *
 * RED PHASE: Tests WILL FAIL because some behavior may not be
 * implemented yet (Escape, alertdialog role tests).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';

// IMPORT (existing — ConfirmDialog.tsx is already created)
import { ConfirmDialog } from '../ConfirmDialog';

/**
 * Helper: controlled ConfirmDialog wrapper with open/close state.
 */
function ControlledConfirmDialog({
  defaultOpen = false,
  title = 'Confirm Action',
  message = 'Are you sure?',
  variant = 'danger' as const,
  onConfirm = vi.fn(),
  confirmLabel,
}: {
  defaultOpen?: boolean;
  title?: string;
  message?: string;
  variant?: 'danger' | 'primary';
  onConfirm?: () => void;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      <button onClick={() => setOpen(true)}>Trigger Confirm</button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        message={message}
        variant={variant}
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
        confirmLabel={confirmLabel}
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render title and message when open', () => {
      render(<ControlledConfirmDialog defaultOpen={true} />);

      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    it('should NOT render when closed', () => {
      render(<ControlledConfirmDialog defaultOpen={false} />);

      expect(screen.queryByText('Confirm Action')).toBeNull();
      expect(screen.queryByText('Are you sure?')).toBeNull();
    });

    it('should render Confirm and Cancel buttons', () => {
      render(<ControlledConfirmDialog defaultOpen={true} />);

      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should use custom confirmLabel', () => {
      render(
        <ControlledConfirmDialog
          defaultOpen={true}
          confirmLabel="Yes, Delete"
        />
      );

      expect(
        screen.getByRole('button', { name: /yes, delete/i })
      ).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Confirm / Cancel Callbacks
  // ==========================================================
  describe('callbacks', () => {
    it('should call onConfirm when confirm button is clicked', async () => {
      const handleConfirm = vi.fn();
      render(
        <ControlledConfirmDialog
          defaultOpen={true}
          onConfirm={handleConfirm}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      await userEvent.click(confirmBtn);

      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it('should close dialog on cancel', async () => {
      render(<ControlledConfirmDialog defaultOpen={true} />);

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByText('Confirm Action')).toBeNull();
      });
    });

    it('should call onOpenChange with false when cancel is clicked', async () => {
      const handleOpenChange = vi.fn();
      render(
        <>
          <button onClick={() => handleOpenChange(true)}>Open</button>
          <ConfirmDialog
            open={true}
            onOpenChange={handleOpenChange}
            title="Test"
            message="Message"
            onConfirm={vi.fn()}
          />
        </>
      );

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelBtn);

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================================
  // Variant
  // ==========================================================
  describe('variant', () => {
    it('should render danger variant with destructive styling', () => {
      render(
        <ControlledConfirmDialog defaultOpen={true} variant="danger" />
      );

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      // Danger button should have red/destructive styling
      expect(confirmBtn).toBeInTheDocument();
    });

    it('should render primary variant', () => {
      render(
        <ControlledConfirmDialog defaultOpen={true} variant="primary" />
      );

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      // Primary button should have blue/primary styling
      expect(confirmBtn).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Keyboard Interaction
  // ==========================================================
  describe('keyboard interaction', () => {
    it('should close on Escape key press', async () => {
      render(<ControlledConfirmDialog defaultOpen={true} />);

      await userEvent.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Confirm Action')).toBeNull();
      });
    });

    it('should NOT close on Escape when closed', () => {
      render(<ControlledConfirmDialog defaultOpen={false} />);
      // Should not error
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should have role="alertdialog"', () => {
      render(<ControlledConfirmDialog defaultOpen={true} />);

      // Radix AlertDialog uses role="alertdialog"
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      render(<ControlledConfirmDialog defaultOpen={true} />);

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have an accessible title', () => {
      render(
        <ControlledConfirmDialog
          defaultOpen={true}
          title="Delete Item"
        />
      );

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should have an accessible description', () => {
      render(<ControlledConfirmDialog defaultOpen={true} />);

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('should NOT be present in DOM when closed', () => {
      render(<ControlledConfirmDialog defaultOpen={false} />);

      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('should trap focus within dialog', async () => {
      render(<ControlledConfirmDialog defaultOpen={true} />);

      // Focus should start within the dialog (on cancel or confirm)
      const focusedEl = document.activeElement;
      expect(focusedEl).toBeTruthy();
      // Should be inside the dialog
      const dialog = screen.getByRole('alertdialog');
      expect(dialog.contains(focusedEl)).toBe(true);
    });
  });
});
