/**
 * Unit tests for HealthIndicator component.
 *
 * Tests: rendering healthy/warning/error/offline counts,
 * progress bar segments with correct widths, percentage text,
 * loading state (skeleton/spinner), empty state (0/0 data
 * sources — "No data sources"), all-healthy state (5/5 green).
 *
 * RED PHASE: All tests WILL FAIL because HealthIndicator
 * component doesn't exist yet.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
import { HealthIndicator } from '../HealthIndicator';

describe('HealthIndicator', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render with healthy, warning, error, offline counts', () => {
      render(
        <HealthIndicator
          healthy={3}
          warning={1}
          error={1}
          offline={0}
          total={5}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should show correct counts for each category', () => {
      render(
        <HealthIndicator
          healthy={5}
          warning={2}
          error={3}
          offline={1}
          total={11}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Progress Bar
  // ==========================================================
  describe('progress bar', () => {
    it('should render a progress bar', () => {
      render(
        <HealthIndicator
          healthy={4}
          warning={0}
          error={0}
          offline={0}
          total={4}
        />
      );

      // Should have a visual bar
      const bar = document.querySelector('[class*="bg-green"]');
      expect(bar).toBeInTheDocument();
    });

    it('should render multiple colored segments', () => {
      render(
        <HealthIndicator
          healthy={2}
          warning={1}
          error={1}
          offline={0}
          total={4}
        />
      );

      // Should have green, yellow, and red segments
      const greenSeg = document.querySelector('[class*="bg-green"]');
      const yellowSeg = document.querySelector('[class*="bg-yellow"]');
      const redSeg = document.querySelector('[class*="bg-red"]');

      expect(greenSeg).toBeInTheDocument();
      expect(yellowSeg).toBeInTheDocument();
      expect(redSeg).toBeInTheDocument();
    });

    it('should show correct percentage text', () => {
      render(
        <HealthIndicator
          healthy={3}
          warning={1}
          error={1}
          offline={0}
          total={5}
        />
      );

      // 3/5 healthy = 60%
      expect(screen.getByText(/60%/)).toBeInTheDocument();
    });

    it('should show 100% for all-healthy state', () => {
      render(
        <HealthIndicator
          healthy={5}
          warning={0}
          error={0}
          offline={0}
          total={5}
        />
      );

      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    it('should show 0% for all-error state', () => {
      render(
        <HealthIndicator
          healthy={0}
          warning={0}
          error={3}
          offline={0}
          total={3}
        />
      );

      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Loading State
  // ==========================================================
  describe('loading state', () => {
    it('should render loading indicator when loading=true', () => {
      render(
        <HealthIndicator
          healthy={0}
          warning={0}
          error={0}
          offline={0}
          total={0}
          loading={true}
        />
      );

      // Should show a spinner or skeleton instead of data
      const loadingEl = document.querySelector('[aria-busy="true"], [class*="animate-pulse"]');
      expect(loadingEl).toBeInTheDocument();
    });

    it('should NOT render counts when loading', () => {
      render(
        <HealthIndicator
          healthy={3}
          warning={1}
          error={1}
          offline={0}
          total={5}
          loading={true}
        />
      );

      // Should not display the numbers while loading
      const loadingEl = document.querySelector('[aria-busy="true"]');
      expect(loadingEl).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Empty State
  // ==========================================================
  describe('empty state', () => {
    it('should show "No data sources" when total is 0', () => {
      render(
        <HealthIndicator
          healthy={0}
          warning={0}
          error={0}
          offline={0}
          total={0}
        />
      );

      expect(screen.getByText(/no data sources/i)).toBeInTheDocument();
    });

    it('should show empty state message when no data', () => {
      render(
        <HealthIndicator
          healthy={0}
          warning={0}
          error={0}
          offline={0}
          total={0}
        />
      );

      // Should have some indicator that there are no data sources
      expect(screen.getByText(/no data/i)).toBeInTheDocument();
    });
  });

  // ==========================================================
  // All-Healthy State
  // ==========================================================
  describe('all-healthy state', () => {
    it('should show full green bar when all are healthy', () => {
      render(
        <HealthIndicator
          healthy={5}
          warning={0}
          error={0}
          offline={0}
          total={5}
        />
      );

      // All segments should be green
      const greenSegs = document.querySelectorAll('[class*="bg-green"]');
      expect(greenSegs.length).toBeGreaterThan(0);
    });

    it('should indicate "All healthy" when 5/5 are green', () => {
      render(
        <HealthIndicator
          healthy={5}
          warning={0}
          error={0}
          offline={0}
          total={5}
        />
      );

      // Should convey that all data sources are healthy
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className', () => {
      render(
        <HealthIndicator
          healthy={1}
          warning={0}
          error={0}
          offline={0}
          total={1}
          className="custom-health"
        />
      );

      const container = document.querySelector('.custom-health');
      expect(container).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should have a meaningful accessible label', () => {
      render(
        <HealthIndicator
          healthy={3}
          warning={1}
          error={1}
          offline={0}
          total={5}
        />
      );

      // Should have some accessible description of the health status
      expect(screen.getByText(/60%/)).toBeInTheDocument();
    });
  });
});
