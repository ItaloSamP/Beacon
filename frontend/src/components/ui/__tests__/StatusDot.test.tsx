/**
 * Unit tests for StatusDot component.
 *
 * Tests: online variant (green + pulse), offline variant (gray),
 * warning variant (yellow), error variant (red), size variants
 * (sm/md/lg), label text, and aria-label.
 *
 * RED PHASE: All tests WILL FAIL because StatusDot component
 * doesn't exist yet.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
import { StatusDot } from '../StatusDot';

describe('StatusDot', () => {
  // ==========================================================
  // Rendering & Variants
  // ==========================================================
  describe('variants', () => {
    it('should render online variant (green)', () => {
      render(<StatusDot variant="online" />);

      const dot = document.querySelector('[class*="bg-green"]');
      expect(dot).toBeInTheDocument();
    });

    it('should render offline variant (gray)', () => {
      render(<StatusDot variant="offline" />);

      const dot = document.querySelector('[class*="bg-gray"]');
      expect(dot).toBeInTheDocument();
    });

    it('should render warning variant (yellow)', () => {
      render(<StatusDot variant="warning" />);

      const dot = document.querySelector('[class*="bg-yellow"]');
      expect(dot).toBeInTheDocument();
    });

    it('should render error variant (red)', () => {
      render(<StatusDot variant="error" />);

      const dot = document.querySelector('[class*="bg-red"]');
      expect(dot).toBeInTheDocument();
    });

    it('should default to offline variant', () => {
      render(<StatusDot />);
      // Should render something
      const dot = document.querySelector('[class*="rounded-full"]');
      expect(dot).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Pulse Animation (Online)
  // ==========================================================
  describe('pulse animation', () => {
    it('should show pulse animation for online variant', () => {
      render(<StatusDot variant="online" />);

      const pulseEl = document.querySelector('[class*="animate-ping"]');
      expect(pulseEl).toBeInTheDocument();
    });

    it('should NOT show pulse animation for offline variant', () => {
      render(<StatusDot variant="offline" />);

      const pulseEl = document.querySelector('[class*="animate-ping"]');
      expect(pulseEl).toBeNull();
    });

    it('should NOT show pulse animation for warning variant', () => {
      render(<StatusDot variant="warning" />);

      const pulseEl = document.querySelector('[class*="animate-ping"]');
      expect(pulseEl).toBeNull();
    });

    it('should NOT show pulse animation for error variant', () => {
      render(<StatusDot variant="error" />);

      const pulseEl = document.querySelector('[class*="animate-ping"]');
      expect(pulseEl).toBeNull();
    });
  });

  // ==========================================================
  // Sizes
  // ==========================================================
  describe('sizes', () => {
    it('should render sm (small) size', () => {
      render(<StatusDot variant="online" size="sm" />);
      const dot = document.querySelector('[class*="rounded-full"]');
      expect(dot).toBeInTheDocument();
    });

    it('should render md (medium) size', () => {
      render(<StatusDot variant="online" size="md" />);
      const dot = document.querySelector('[class*="rounded-full"]');
      expect(dot).toBeInTheDocument();
    });

    it('should render lg (large) size', () => {
      render(<StatusDot variant="online" size="lg" />);
      const dot = document.querySelector('[class*="rounded-full"]');
      expect(dot).toBeInTheDocument();
    });

    it('should use md as default size', () => {
      render(<StatusDot variant="online" />);
      const dot = document.querySelector('[class*="rounded-full"]');
      expect(dot).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Label Text
  // ==========================================================
  describe('label', () => {
    it('should render label text alongside the dot', () => {
      render(<StatusDot variant="online" label="Online" />);

      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should render dot and label together', () => {
      render(<StatusDot variant="offline" label="Offline" />);

      const dot = document.querySelector('[class*="rounded-full"]');
      expect(dot).toBeInTheDocument();
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should render without label when not provided', () => {
      render(<StatusDot variant="online" />);

      // Should still render the dot
      const dot = document.querySelector('[class*="rounded-full"]');
      expect(dot).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should have aria-label when no visible label', () => {
      render(<StatusDot variant="online" />);

      const dot = document.querySelector('[class*="rounded-full"]');
      // Should have aria-label for screen readers
      expect(dot).toHaveAttribute('aria-label');
    });

    it('should have descriptive aria-label for each variant', () => {
      const { rerender } = render(<StatusDot variant="online" />);
      let dot = document.querySelector('[class*="rounded-full"]');
      const onlineLabel = dot?.getAttribute('aria-label')?.toLowerCase() || '';
      expect(onlineLabel).toContain('online');

      rerender(<StatusDot variant="error" />);
      dot = document.querySelector('[class*="rounded-full"]');
      const errorLabel = dot?.getAttribute('aria-label')?.toLowerCase() || '';
      expect(errorLabel).toContain('error');
    });

    it('should use label text as aria-label when label is provided', () => {
      render(<StatusDot variant="warning" label="Degraded" />);

      // The label text provides the description
      expect(screen.getByText('Degraded')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className', () => {
      render(<StatusDot variant="online" className="custom-dot" />);

      const container = document.querySelector('.custom-dot');
      expect(container).toBeInTheDocument();
    });
  });
});
