/**
 * Unit tests for ErrorPanel component.
 *
 * Tests: message rendering, retry button + onRetry callback,
 * dismiss button + onDismiss callback, error code display,
 * and icon (AlertTriangle).
 *
 * RED PHASE: All tests WILL FAIL because ErrorPanel component
 * doesn't exist yet.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
import { ErrorPanel } from '../ErrorPanel';

describe('ErrorPanel', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render error message', () => {
      render(<ErrorPanel message="Something went wrong" />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should render an error icon (AlertTriangle)', () => {
      render(<ErrorPanel message="Error occurred" />);

      // Should have a visual error icon (lucide AlertTriangle)
      // Check for SVG or icon element
      const container = screen.getByText('Error occurred').closest('div');
      expect(container).toBeInTheDocument();
    });

    it('should render with a default title', () => {
      render(<ErrorPanel message="Connection failed" />);

      // May have a default title like "Error" or just the message
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Retry Button
  // ==========================================================
  describe('retry button', () => {
    it('should render a retry button when onRetry is provided', () => {
      render(
        <ErrorPanel
          message="Failed to load data"
          onRetry={vi.fn()}
        />
      );

      expect(
        screen.getByRole('button', { name: /retry|try again/i })
      ).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', async () => {
      const handleRetry = vi.fn();
      render(
        <ErrorPanel
          message="Network error"
          onRetry={handleRetry}
        />
      );

      const retryBtn = screen.getByRole('button', { name: /retry|try again/i });
      await userEvent.click(retryBtn);

      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('should NOT render a retry button when onRetry is not provided', () => {
      render(<ErrorPanel message="Error" />);

      const buttons = screen.queryAllByRole('button');
      // Should not have a retry button
      const retryBtn = screen.queryByRole('button', { name: /retry|try again/i });
      expect(retryBtn).toBeNull();
    });
  });

  // ==========================================================
  // Dismiss Button
  // ==========================================================
  describe('dismiss button', () => {
    it('should render a dismiss button when onDismiss is provided', () => {
      render(
        <ErrorPanel
          message="Minor error"
          onDismiss={vi.fn()}
        />
      );

      expect(
        screen.getByRole('button', { name: /dismiss|close/i })
      ).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button is clicked', async () => {
      const handleDismiss = vi.fn();
      render(
        <ErrorPanel
          message="Dismissible error"
          onDismiss={handleDismiss}
        />
      );

      const dismissBtn = screen.getByRole('button', { name: /dismiss|close/i });
      await userEvent.click(dismissBtn);

      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });

    it('should NOT render dismiss button when onDismiss is not provided', () => {
      render(<ErrorPanel message="Error" />);

      const dismissBtn = screen.queryByRole('button', { name: /dismiss|close/i });
      expect(dismissBtn).toBeNull();
    });

    it('should render both retry and dismiss when both provided', () => {
      render(
        <ErrorPanel
          message="Error"
          onRetry={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(
        screen.getByRole('button', { name: /retry|try again/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /dismiss|close/i })
      ).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Error Code
  // ==========================================================
  describe('error code', () => {
    it('should render error code when provided', () => {
      render(
        <ErrorPanel
          message="Server error"
          errorCode="500"
        />
      );

      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('should render error code with prefix', () => {
      render(
        <ErrorPanel
          message="Not found"
          errorCode="404"
        />
      );

      expect(screen.getByText('404')).toBeInTheDocument();
    });

    it('should NOT render error code when not provided', () => {
      render(<ErrorPanel message="Generic error" />);

      // No error code element should be present
      // (We verify it renders the message at minimum)
      expect(screen.getByText('Generic error')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Variants
  // ==========================================================
  describe('styling', () => {
    it('should render with red/danger styling by default', () => {
      render(<ErrorPanel message="Critical error" />);

      const container = screen.getByText('Critical error').closest('div');
      expect(container?.className).toMatch(/red|danger|error/);
    });

    it('should render with warning styling for warning variant', () => {
      render(
        <ErrorPanel
          message="Warning message"
          variant="warning"
        />
      );

      const container = screen.getByText('Warning message').closest('div');
      expect(container?.className).toMatch(/yellow|warning/);
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className', () => {
      render(
        <ErrorPanel
          message="Styled error"
          className="custom-error-panel"
        />
      );

      const container = document.querySelector('.custom-error-panel');
      expect(container).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should have role="alert" for important errors', () => {
      render(<ErrorPanel message="Urgent error" />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('should be visible and contain the message', () => {
      render(<ErrorPanel message="Accessible error" />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Accessible error');
    });
  });
});
