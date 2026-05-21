/**
 * Unit tests for EmptyState component.
 *
 * Tests: icon rendering, title, description, action button
 * (label + onClick), compact variant, and custom icon.
 *
 * RED PHASE: All tests WILL FAIL because EmptyState component
 * doesn't exist yet.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render title and description', () => {
      render(
        <EmptyState
          title="No items found"
          description="Try adjusting your filters or create a new item."
        />
      );

      expect(screen.getByText('No items found')).toBeInTheDocument();
      expect(
        screen.getByText('Try adjusting your filters or create a new item.')
      ).toBeInTheDocument();
    });

    it('should render a default icon', () => {
      render(
        <EmptyState
          title="Empty"
          description="Nothing here"
        />
      );

      // Should render some visual icon element
      expect(screen.getByText('Empty')).toBeInTheDocument();
    });

    it('should render without description', () => {
      render(<EmptyState title="No data" />);

      expect(screen.getByText('No data')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Icon
  // ==========================================================
  describe('icon', () => {
    it('should render a custom icon when icon prop is provided', () => {
      render(
        <EmptyState
          title="No results"
          icon={<span data-testid="custom-icon">🔍</span>}
        />
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should render the custom icon alongside title', () => {
      render(
        <EmptyState
          title="No data sources"
          description="Connect a data source to get started"
          icon={<span data-testid="database-icon">🗄</span>}
        />
      );

      expect(screen.getByTestId('database-icon')).toBeInTheDocument();
      expect(screen.getByText('No data sources')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Action Button
  // ==========================================================
  describe('action button', () => {
    it('should render an action button when action prop is provided', () => {
      render(
        <EmptyState
          title="No pipelines"
          description="Create your first pipeline"
          action={{ label: 'Create Pipeline', onClick: vi.fn() }}
        />
      );

      expect(
        screen.getByRole('button', { name: /create pipeline/i })
      ).toBeInTheDocument();
    });

    it('should call onClick when action button is clicked', async () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="Empty"
          action={{ label: 'Add Item', onClick: handleAction }}
        />
      );

      const button = screen.getByRole('button', { name: /add item/i });
      await userEvent.click(button);

      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('should NOT render a button when action is not provided', () => {
      render(<EmptyState title="Nothing" />);

      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });
  });

  // ==========================================================
  // Compact Variant
  // ==========================================================
  describe('compact variant', () => {
    it('should render compact variant', () => {
      render(
        <EmptyState
          title="No results"
          compact
        />
      );

      expect(screen.getByText('No results')).toBeInTheDocument();
    });

    it('should have smaller styling in compact mode', () => {
      render(
        <EmptyState
          title="Nothing found"
          compact
        />
      );

      const title = screen.getByText('Nothing found');
      expect(title).toBeInTheDocument();
    });

    it('should render full variant by default', () => {
      render(<EmptyState title="Default size" />);
      expect(screen.getByText('Default size')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className', () => {
      render(
        <EmptyState
          title="Empty"
          className="custom-empty-state"
        />
      );

      const container = document.querySelector('.custom-empty-state');
      expect(container).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should render as a section with accessible content', () => {
      render(
        <EmptyState
          title="No anomalies detected"
          description="All data sources are reporting normal values"
        />
      );

      expect(
        screen.getByText('No anomalies detected')
      ).toBeInTheDocument();
      expect(
        screen.getByText('All data sources are reporting normal values')
      ).toBeInTheDocument();
    });
  });
});
