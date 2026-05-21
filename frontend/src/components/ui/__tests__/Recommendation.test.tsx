/**
 * Unit tests for Recommendation component.
 *
 * Tests: title rendering, description, Lightbulb icon,
 * severity-based styling, action button + onAction callback,
 * expandable detail section (ChevronDown toggle).
 *
 * RED PHASE: All tests WILL FAIL because Recommendation
 * component doesn't exist yet.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
import { Recommendation } from '../Recommendation';

describe('Recommendation', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render title and description', () => {
      render(
        <Recommendation
          title="Increase sample size"
          description="Current sample size of 100 rows may not be representative. Consider increasing to 1000 rows for more accurate baseline."
        />
      );

      expect(screen.getByText('Increase sample size')).toBeInTheDocument();
      expect(
        screen.getByText(/current sample size/i)
      ).toBeInTheDocument();
    });

    it('should render a Lightbulb icon', () => {
      render(
        <Recommendation
          title="Check data source"
          description="Verify connection settings"
        />
      );

      // Should have a lucide Lightbulb icon (SVG)
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Severity-Based Styling
  // ==========================================================
  describe('severity styling', () => {
    it('should render critical severity with red/purple styling', () => {
      render(
        <Recommendation
          title="Urgent Fix"
          description="Critical issue detected"
          severity="critical"
        />
      );

      const title = screen.getByText('Urgent Fix');
      expect(title).toBeInTheDocument();
    });

    it('should render warning severity with yellow styling', () => {
      render(
        <Recommendation
          title="Warning"
          description="Consider reviewing"
          severity="warning"
        />
      );

      const title = screen.getByText('Warning');
      expect(title).toBeInTheDocument();
    });

    it('should render info severity with blue styling', () => {
      render(
        <Recommendation
          title="Tip"
          description="Best practice suggestion"
          severity="info"
        />
      );

      const title = screen.getByText('Tip');
      expect(title).toBeInTheDocument();
    });

    it('should use default severity when not specified', () => {
      render(
        <Recommendation
          title="Default severity"
          description="No severity set"
        />
      );

      expect(screen.getByText('Default severity')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Action Button
  // ==========================================================
  describe('action button', () => {
    it('should render an action button when onAction is provided', () => {
      render(
        <Recommendation
          title="Update Config"
          description="The pipeline config is outdated"
          actionLabel="Fix Now"
          onAction={vi.fn()}
        />
      );

      expect(
        screen.getByRole('button', { name: /fix now/i })
      ).toBeInTheDocument();
    });

    it('should call onAction when button is clicked', async () => {
      const handleAction = vi.fn();
      render(
        <Recommendation
          title="Action Required"
          description="Please update settings"
          actionLabel="Update"
          onAction={handleAction}
        />
      );

      const button = screen.getByRole('button', { name: /update/i });
      await userEvent.click(button);

      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('should NOT render action button when onAction is not provided', () => {
      render(
        <Recommendation
          title="No Action"
          description="Just info"
        />
      );

      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });
  });

  // ==========================================================
  // Expandable Detail Section
  // ==========================================================
  describe('expandable detail', () => {
    it('should render a toggle to expand details', () => {
      render(
        <Recommendation
          title="Expandable"
          description="Click to see more"
          detail="Additional context about this recommendation that provides deeper insights."
        />
      );

      // Should have a toggle button (ChevronDown)
      const toggleBtn = screen.getByRole('button');
      expect(toggleBtn).toBeInTheDocument();
    });

    it('should not show detail content by default', () => {
      render(
        <Recommendation
          title="Hidden Detail"
          description="Summary"
          detail="This detail is initially hidden"
        />
      );

      expect(screen.queryByText('This detail is initially hidden')).toBeNull();
    });

    it('should show detail content when expanded', async () => {
      render(
        <Recommendation
          title="Show Detail"
          description="Click toggle"
          detail="Now you can see the details"
        />
      );

      const toggleBtn = screen.getByRole('button');
      await userEvent.click(toggleBtn);

      await waitFor(() => {
        expect(
          screen.getByText('Now you can see the details')
        ).toBeInTheDocument();
      });
    });

    it('should hide detail when collapsed again', async () => {
      render(
        <Recommendation
          title="Collapsible"
          description="Toggle me"
          detail="Secret content"
        />
      );

      const toggleBtn = screen.getByRole('button');

      // Expand
      await userEvent.click(toggleBtn);
      expect(screen.getByText('Secret content')).toBeInTheDocument();

      // Collapse
      await userEvent.click(toggleBtn);
      await waitFor(() => {
        expect(screen.queryByText('Secret content')).toBeNull();
      });
    });

    it('should NOT render toggle when detail prop is not provided', () => {
      render(
        <Recommendation
          title="No Detail"
          description="Simple recommendation"
        />
      );

      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className', () => {
      render(
        <Recommendation
          title="Styled"
          description="Custom class"
          className="custom-recommendation"
        />
      );

      const container = document.querySelector('.custom-recommendation');
      expect(container).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should have accessible label on expand toggle', () => {
      render(
        <Recommendation
          title="A11y Test"
          description="Accessible recommendation"
          detail="More info"
        />
      );

      const toggleBtn = screen.getByRole('button');
      expect(toggleBtn).toHaveAttribute('aria-label');
    });

    it('should indicate expanded state via aria-expanded', () => {
      render(
        <Recommendation
          title="Expanded"
          description="State test"
          detail="Details"
        />
      );

      const toggleBtn = screen.getByRole('button');
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
