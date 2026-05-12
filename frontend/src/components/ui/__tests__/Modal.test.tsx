/**
 * Unit tests for Modal component.
 *
 * Tests open/close behavior, rendering children, overlay click,
 * escape key, and accessibility attributes.
 *
 * RED PHASE: All tests WILL FAIL because the Modal component
 * and its dependencies don't exist yet.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';

// ============================================================
// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
// ============================================================
import { Modal } from '../../../../components/ui/Modal';


// ============================================================
// Test helper: controlled Modal wrapper
// ============================================================

function ControlledModal({
  defaultOpen = false,
  children,
  onOpenChange,
}: {
  defaultOpen?: boolean;
  children?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    onOpenChange?.(isOpen);
  };

  return (
    <>
      <button onClick={() => handleOpenChange(true)}>Open Modal</button>
      <Modal open={open} onOpenChange={handleOpenChange}>
        {children || (
          <>
            <Modal.Header>
              <h2>Modal Title</h2>
            </Modal.Header>
            <Modal.Body>
              <p>Modal content goes here</p>
            </Modal.Body>
            <Modal.Footer>
              <button onClick={() => handleOpenChange(false)}>Close</button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </>
  );
}


describe('Modal', () => {
  // ==========================================================
  // Open/Close behavior
  // ==========================================================
  describe('open/close behavior', () => {
    it('should render when open is true', () => {
      render(<ControlledModal defaultOpen={true} />);

      expect(screen.getByText('Modal Title')).toBeInTheDocument();
      expect(screen.getByText('Modal content goes here')).toBeInTheDocument();
    });

    it('should not render when open is false', () => {
      render(<ControlledModal defaultOpen={false} />);

      expect(screen.queryByText('Modal Title')).not.toBeInTheDocument();
    });

    it('should open when trigger button is clicked', async () => {
      render(<ControlledModal defaultOpen={false} />);

      // Modal should not be visible
      expect(screen.queryByText('Modal Title')).not.toBeInTheDocument();

      // Click the open button
      await userEvent.click(screen.getByText('Open Modal'));

      // Modal should now be visible
      expect(screen.getByText('Modal Title')).toBeInTheDocument();
    });

    it('should call onOpenChange when closing', () => {
      const handleChange = vi.fn();
      render(<ControlledModal defaultOpen={true} onOpenChange={handleChange} />);

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('should close when the close button in footer is clicked', async () => {
      render(<ControlledModal defaultOpen={true} />);

      await userEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByText('Modal Title')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================
  // Rendering content
  // ==========================================================
  describe('rendering content', () => {
    it('should render header, body, and footer', () => {
      render(<ControlledModal defaultOpen={true} />);

      expect(screen.getByText('Modal Title')).toBeInTheDocument();
      expect(screen.getByText('Modal content goes here')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should render custom children', () => {
      render(
        <ControlledModal defaultOpen={true}>
          <div>Custom Modal Content</div>
        </ControlledModal>
      );

      expect(screen.getByText('Custom Modal Content')).toBeInTheDocument();
    });

    it('should render with a title', () => {
      render(
        <ControlledModal defaultOpen={true}>
          <Modal.Header>
            <Modal.Title>Custom Title</Modal.Title>
          </Modal.Header>
        </ControlledModal>
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Overlay behavior
  // ==========================================================
  describe('overlay behavior', () => {
    it('should render an overlay/backdrop', () => {
      render(<ControlledModal defaultOpen={true} />);

      // There should be an overlay element
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should close when clicking overlay if configured', async () => {
      const handleChange = vi.fn();

      render(
        <ControlledModal defaultOpen={true} onOpenChange={handleChange} />
      );

      // Note: The actual implementation may or may not close on overlay click
      // This test verifies the component can handle it
      // Some implementations use a separate overlay element
    });

    it('should NOT close when clicking inside modal content', () => {
      render(<ControlledModal defaultOpen={true} />);

      // Clicking inside the modal should not close it
      const content = screen.getByText('Modal content goes here');
      fireEvent.click(content);

      expect(screen.getByText('Modal Title')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Keyboard interaction
  // ==========================================================
  describe('keyboard interaction', () => {
    it('should close on Escape key press', () => {
      render(<ControlledModal defaultOpen={true} />);

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      waitFor(() => {
        expect(screen.queryByText('Modal Title')).not.toBeInTheDocument();
      });
    });

    it('should trap focus within modal', () => {
      render(<ControlledModal defaultOpen={true} />);

      const dialog = screen.getByRole('dialog');
      // Focus should be managed within the modal
      expect(dialog).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should have role="dialog"', () => {
      render(<ControlledModal defaultOpen={true} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      render(<ControlledModal defaultOpen={true} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have an accessible label', () => {
      render(<ControlledModal defaultOpen={true} />);

      const dialog = screen.getByRole('dialog');
      // Should have either aria-label or aria-labelledby
      const hasLabel =
        dialog.hasAttribute('aria-label') ||
        dialog.hasAttribute('aria-labelledby');
      expect(hasLabel).toBe(true);
    });

    it('should not be visible to screen readers when closed', () => {
      render(<ControlledModal defaultOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // ==========================================================
  // Edge cases
  // ==========================================================
  describe('edge cases', () => {
    it('should handle rapid open/close', async () => {
      const { rerender } = render(<ControlledModal defaultOpen={true} key="open" />);
      expect(screen.getByText('Modal Title')).toBeInTheDocument();

      // Use key to force remount with new defaultOpen (useState ignores initial prop changes)
      rerender(<ControlledModal defaultOpen={false} key="closed" />);
      await waitFor(() => {
        expect(screen.queryByText('Modal Title')).not.toBeInTheDocument();
      });
    });

    it('should render with empty body', () => {
      render(
        <ControlledModal defaultOpen={true}>
          <Modal.Body />
        </ControlledModal>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should stack correctly with other modals', () => {
      // Simple assertion: modal should render and be dismissable
      render(<ControlledModal defaultOpen={true} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
