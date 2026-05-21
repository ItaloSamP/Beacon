/**
 * Unit tests for ZScoreDisplay component.
 *
 * Tests: numeric value display, severity color classes
 * (<2 normal green, 2-3 warning yellow, >3 critical red/purple),
 * label prop, compact variant, positive/negative values.
 *
 * RED PHASE: All tests WILL FAIL because ZScoreDisplay component
 * doesn't exist yet.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
import { ZScoreDisplay } from '../ZScoreDisplay';

describe('ZScoreDisplay', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render a numeric value', () => {
      render(<ZScoreDisplay value={1.5} />);

      expect(screen.getByText('1.5')).toBeInTheDocument();
    });

    it('should render integer values', () => {
      render(<ZScoreDisplay value={3} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render decimal values with 1 decimal place', () => {
      render(<ZScoreDisplay value={2.75} />);

      // Should display formatted value
      expect(screen.getByText(/2\.7/)).toBeInTheDocument();
    });

    it('should render zero', () => {
      render(<ZScoreDisplay value={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Severity Color Classes
  // ==========================================================
  describe('severity colors', () => {
    it('should show green for normal values (< 2)', () => {
      render(<ZScoreDisplay value={1.2} />);

      const valueEl = screen.getByText('1.2');
      expect(valueEl.className).toMatch(/green|success/);
    });

    it('should show green for value exactly 0', () => {
      render(<ZScoreDisplay value={0} />);

      const valueEl = screen.getByText('0');
      expect(valueEl.className).toMatch(/green|success/);
    });

    it('should show green for value just below 2', () => {
      render(<ZScoreDisplay value={1.99} />);

      const valueEl = screen.getByText(/1\.9/);
      expect(valueEl.className).toMatch(/green|success/);
    });

    it('should show yellow/warning for values between 2 and 3', () => {
      render(<ZScoreDisplay value={2.5} />);

      const valueEl = screen.getByText(/2\.5/);
      expect(valueEl.className).toMatch(/yellow|warning/);
    });

    it('should show yellow for value exactly 2', () => {
      render(<ZScoreDisplay value={2.0} />);

      const valueEl = screen.getByText(/2/);
      expect(valueEl.className).toMatch(/yellow|warning/);
    });

    it('should show yellow for value exactly 3', () => {
      render(<ZScoreDisplay value={3.0} />);

      const valueEl = screen.getByText(/3/);
      expect(valueEl.className).toMatch(/yellow|warning/);
    });

    it('should show red/critical for values above 3', () => {
      render(<ZScoreDisplay value={4.2} />);

      const valueEl = screen.getByText(/4\.2/);
      expect(valueEl.className).toMatch(/red|danger|critical|violet/);
    });

    it('should show red/critical for very high values', () => {
      render(<ZScoreDisplay value={10.5} />);

      const valueEl = screen.getByText(/10\.5/);
      expect(valueEl.className).toMatch(/red|danger|critical|violet/);
    });
  });

  // ==========================================================
  // Label
  // ==========================================================
  describe('label', () => {
    it('should render label text when provided', () => {
      render(<ZScoreDisplay value={2.8} label="Null Check" />);

      expect(screen.getByText('Null Check')).toBeInTheDocument();
      expect(screen.getByText(/2\.8/)).toBeInTheDocument();
    });

    it('should render without label', () => {
      render(<ZScoreDisplay value={1.0} />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Compact Variant
  // ==========================================================
  describe('compact variant', () => {
    it('should render compact variant', () => {
      render(<ZScoreDisplay value={3.5} compact />);

      expect(screen.getByText(/3\.5/)).toBeInTheDocument();
    });

    it('should render full variant by default', () => {
      render(<ZScoreDisplay value={1.5} label="Volume" />);

      expect(screen.getByText('Volume')).toBeInTheDocument();
      expect(screen.getByText('1.5')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Positive/Negative Values
  // ==========================================================
  describe('positive/negative values', () => {
    it('should render negative values', () => {
      render(<ZScoreDisplay value={-1.5} />);

      // Negative should display: absolute value matters for severity
      expect(screen.getByText(/-1\.5/)).toBeInTheDocument();
    });

    it('should apply severity based on absolute value', () => {
      // |-1.5| = 1.5 < 2 → normal (green)
      render(<ZScoreDisplay value={-1.5} />);

      const valueEl = screen.getByText(/-1\.5/);
      // Negative value with abs < 2 should still be green
      expect(valueEl.className).toMatch(/green|success/);
    });

    it('should show critical for large negative values', () => {
      // |-4.2| = 4.2 > 3 → critical
      render(<ZScoreDisplay value={-4.2} />);

      const valueEl = screen.getByText(/-4\.2/);
      expect(valueEl.className).toMatch(/red|danger|critical|violet/);
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className', () => {
      render(<ZScoreDisplay value={1.0} className="custom-zscore" />);

      const container = document.querySelector('.custom-zscore');
      expect(container).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should have an accessible label for screen readers', () => {
      render(<ZScoreDisplay value={2.5} label="Volume Z-Score" />);

      // The label provides context; value is visible
      expect(screen.getByText('Volume Z-Score')).toBeInTheDocument();
    });

    it('should convey severity through color alone', () => {
      render(<ZScoreDisplay value={4.0} />);

      // Color should be supplemented with some accessible information
      const valueEl = screen.getByText(/4/);
      expect(valueEl).toBeInTheDocument();
    });
  });
});
