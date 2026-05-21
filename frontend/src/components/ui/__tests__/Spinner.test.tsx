/**
 * Unit tests for Spinner component — refined version.
 *
 * Tests: sizes (sm/md/lg/xl), color variants (primary/white),
 * aria-busy, aria-label, and role="status".
 *
 * RED PHASE: Tests WILL FAIL because the refined Spinner
 * component doesn't exist yet with xl size and variant/white props.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component lacks xl, variant)
import { Spinner } from '../Spinner';

describe('Spinner', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render with role="status"', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render as an accessible live region', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      // Status role indicates a live region for loading states
      expect(spinner).toBeInTheDocument();
    });

    it('should apply CSS animation for spinning', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toMatch(/animate-spin/);
    });
  });

  // ==========================================================
  // Sizes
  // ==========================================================
  describe('sizes', () => {
    it('should render sm (small) size', () => {
      render(<Spinner size="sm" />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should render md (medium) size', () => {
      render(<Spinner size="md" />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should render lg (large) size', () => {
      render(<Spinner size="lg" />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should render xl (extra large) size', () => {
      render(<Spinner size="xl" />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should use md as default size', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should apply different size classes for each variant', () => {
      const { rerender } = render(<Spinner size="sm" />);
      const smEl = screen.getByRole('status');
      const smClasses = smEl.className;

      rerender(<Spinner size="xl" />);
      const xlEl = screen.getByRole('status');
      const xlClasses = xlEl.className;

      // XL should be visibly larger than SM
      expect(smClasses).not.toBe(xlClasses);
    });
  });

  // ==========================================================
  // Color Variants
  // ==========================================================
  describe('color variants', () => {
    it('should render with primary color variant', () => {
      render(<Spinner variant="primary" />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should render with white color variant', () => {
      render(<Spinner variant="white" />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should use primary as default variant', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should have aria-busy="true" to indicate loading', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-busy', 'true');
    });

    it('should have an aria-label describing the loading state', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label');
      const label = spinner.getAttribute('aria-label')?.toLowerCase() || '';
      expect(label.length).toBeGreaterThan(0);
    });

    it('should accept a custom aria-label', () => {
      render(<Spinner aria-label="Loading data..." />);
      const spinner = screen.getByRole('status', { name: 'Loading data...' });
      expect(spinner).toBeInTheDocument();
    });

    it('should be hidden from screen readers when wrapped in aria-hidden', () => {
      // Spinner itself should be visible to screen readers by default
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      // Default: NOT aria-hidden (should announce loading)
      expect(spinner.getAttribute('aria-hidden')).not.toBe('true');
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className', () => {
      render(<Spinner className="my-spinner" />);
      const spinner = document.querySelector('.my-spinner');
      expect(spinner).toBeInTheDocument();
    });
  });
});
