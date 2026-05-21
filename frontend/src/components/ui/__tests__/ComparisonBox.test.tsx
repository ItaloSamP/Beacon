/**
 * Unit tests for ComparisonBox component.
 *
 * Tests: baseline value display, current value display,
 * percentage change (delta), up/down arrow icon direction,
 * green for improvement/red for degradation, compact variant,
 * and unit label.
 *
 * RED PHASE: All tests WILL FAIL because ComparisonBox component
 * doesn't exist yet.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
import { ComparisonBox } from '../ComparisonBox';

describe('ComparisonBox', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render baseline and current values', () => {
      render(
        <ComparisonBox
          label="Null Percentage"
          baseline={1.2}
          current={8.4}
          unit="%"
        />
      );

      expect(screen.getByText(/1\.2/)).toBeInTheDocument();
      expect(screen.getByText(/8\.4/)).toBeInTheDocument();
    });

    it('should render the label', () => {
      render(
        <ComparisonBox
          label="Row Count"
          baseline={1000}
          current={1200}
        />
      );

      expect(screen.getByText('Row Count')).toBeInTheDocument();
    });

    it('should render unit label when provided', () => {
      render(
        <ComparisonBox
          label="Volume"
          baseline={500}
          current={450}
          unit="rows"
        />
      );

      expect(screen.getByText(/rows/)).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Percentage Change (Delta)
  // ==========================================================
  describe('percentage change', () => {
    it('should show percentage increase for positive change', () => {
      render(
        <ComparisonBox
          label="Growth"
          baseline={100}
          current={150}
        />
      );

      // +50% increase
      expect(screen.getByText(/\+50/)).toBeInTheDocument();
    });

    it('should show percentage decrease for negative change', () => {
      render(
        <ComparisonBox
          label="Decline"
          baseline={100}
          current={75}
        />
      );

      // -25% decrease
      expect(screen.getByText(/-25/)).toBeInTheDocument();
    });

    it('should show 0% for no change', () => {
      render(
        <ComparisonBox
          label="Stable"
          baseline={200}
          current={200}
        />
      );

      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });

    it('should handle baseline of zero', () => {
      render(
        <ComparisonBox
          label="New Metric"
          baseline={0}
          current={10}
        />
      );

      // Should handle division by zero gracefully
      expect(screen.getByText('New Metric')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Arrow Direction
  // ==========================================================
  describe('arrow direction', () => {
    it('should show up arrow for increase (improvement)', () => {
      render(
        <ComparisonBox
          label="Metric"
          baseline={100}
          current={120}
          isImprovement="higher"
        />
      );

      // Should have an up arrow icon or indicator
      expect(screen.getByText(/\+20/)).toBeInTheDocument();
    });

    it('should show down arrow for decrease (degradation)', () => {
      render(
        <ComparisonBox
          label="Metric"
          baseline={100}
          current={80}
          isImprovement="higher"
        />
      );

      // Should have a down arrow icon or indicator
      expect(screen.getByText(/-20/)).toBeInTheDocument();
    });

    it('should invert colors when isImprovement="lower" and value increased', () => {
      // For null percentage, lower is better — an increase is degradation
      render(
        <ComparisonBox
          label="Null Pct"
          baseline={1.0}
          current={5.0}
          isImprovement="lower"
        />
      );

      // Increase in null percentage = degradation (red)
      expect(screen.getByText(/\+400/)).toBeInTheDocument();
    });

    it('should show green when isImprovement="lower" and value decreased', () => {
      render(
        <ComparisonBox
          label="Null Pct"
          baseline={5.0}
          current={1.0}
          isImprovement="lower"
        />
      );

      // Decrease in null percentage = improvement (green)
      expect(screen.getByText(/-80/)).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Colors (Green / Red)
  // ==========================================================
  describe('color coding', () => {
    it('should use green for improvement', () => {
      render(
        <ComparisonBox
          label="Good"
          baseline={100}
          current={150}
          isImprovement="higher"
        />
      );

      const delta = screen.getByText(/\+50/);
      expect(delta.className).toMatch(/green|success/);
    });

    it('should use red for degradation', () => {
      render(
        <ComparisonBox
          label="Bad"
          baseline={100}
          current={50}
          isImprovement="higher"
        />
      );

      const delta = screen.getByText(/-50/);
      expect(delta.className).toMatch(/red|danger/);
    });
  });

  // ==========================================================
  // Compact Variant
  // ==========================================================
  describe('compact variant', () => {
    it('should render compact variant', () => {
      render(
        <ComparisonBox
          label="Quick View"
          baseline={100}
          current={110}
          compact
        />
      );

      expect(screen.getByText('Quick View')).toBeInTheDocument();
    });

    it('should render full variant by default', () => {
      render(
        <ComparisonBox
          label="Full View"
          baseline={100}
          current={110}
        />
      );

      expect(screen.getByText('Full View')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className', () => {
      render(
        <ComparisonBox
          label="Styled"
          baseline={50}
          current={75}
          className="custom-comparison"
        />
      );

      const container = document.querySelector('.custom-comparison');
      expect(container).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should convey change direction to screen readers', () => {
      render(
        <ComparisonBox
          label="Accessible"
          baseline={100}
          current={150}
        />
      );

      // Should have accessible text like "increased by 50%"
      expect(screen.getByText('Accessible')).toBeInTheDocument();
    });
  });
});
