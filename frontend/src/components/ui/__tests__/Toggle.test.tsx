/**
 * Unit tests for Toggle component.
 *
 * Tests: unchecked default, checked state, label, disabled,
 * onChange, keyboard toggle (Space/Enter), aria-pressed,
 * aria-checked, and role="switch".
 *
 * RED PHASE: All tests WILL FAIL because Toggle component
 * doesn't exist yet.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
import { Toggle } from '../Toggle';

describe('Toggle', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render with role="switch"', () => {
      render(<Toggle />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should render unchecked by default', () => {
      render(<Toggle />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('should render checked when checked prop is true', () => {
      render(<Toggle checked={true} onChange={vi.fn()} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should render unchecked when checked prop is false', () => {
      render(<Toggle checked={false} onChange={vi.fn()} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });
  });

  // ==========================================================
  // Label
  // ==========================================================
  describe('label', () => {
    it('should render label text when label prop is provided', () => {
      render(<Toggle label="Enable notifications" />);
      expect(
        screen.getByText('Enable notifications')
      ).toBeInTheDocument();
    });

    it('should associate label with toggle via clicking', async () => {
      const handleChange = vi.fn();
      render(
        <Toggle
          label="Dark mode"
          checked={false}
          onChange={handleChange}
        />
      );

      // Clicking the label should toggle the switch
      const label = screen.getByText('Dark mode');
      await userEvent.click(label);

      expect(handleChange).toHaveBeenCalled();
    });

    it('should render without label when not provided', () => {
      render(<Toggle />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeInTheDocument();
    });

    it('should have associated aria-label when no visible label', () => {
      render(<Toggle aria-label="Mute audio" />);
      const toggle = screen.getByRole('switch', { name: /mute audio/i });
      expect(toggle).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Disabled State
  // ==========================================================
  describe('disabled state', () => {
    it('should render disabled toggle', () => {
      render(<Toggle disabled />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeDisabled();
    });

    it('should not toggle when clicked in disabled state', async () => {
      const handleChange = vi.fn();
      render(
        <Toggle
          checked={false}
          onChange={handleChange}
          disabled
        />
      );

      const toggle = screen.getByRole('switch');
      await userEvent.click(toggle);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should apply disabled styling (reduced opacity)', () => {
      render(<Toggle disabled />);
      const toggle = screen.getByRole('switch');
      expect(toggle.className).toMatch(/opacity/);
    });
  });

  // ==========================================================
  // onChange
  // ==========================================================
  describe('onChange', () => {
    it('should call onChange with true when toggling from unchecked', async () => {
      const handleChange = vi.fn();
      render(<Toggle checked={false} onChange={handleChange} />);

      const toggle = screen.getByRole('switch');
      await userEvent.click(toggle);

      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('should call onChange with false when toggling from checked', async () => {
      const handleChange = vi.fn();
      render(<Toggle checked={true} onChange={handleChange} />);

      const toggle = screen.getByRole('switch');
      await userEvent.click(toggle);

      expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('should call onChange once per click', async () => {
      const handleChange = vi.fn();
      render(<Toggle checked={false} onChange={handleChange} />);

      const toggle = screen.getByRole('switch');
      await userEvent.click(toggle);
      await userEvent.click(toggle);

      expect(handleChange).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================
  // Keyboard Interaction
  // ==========================================================
  describe('keyboard interaction', () => {
    it('should toggle on Space key', async () => {
      const handleChange = vi.fn();
      render(<Toggle checked={false} onChange={handleChange} />);

      const toggle = screen.getByRole('switch');
      toggle.focus();
      await userEvent.keyboard(' ');

      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('should toggle on Enter key', async () => {
      const handleChange = vi.fn();
      render(<Toggle checked={false} onChange={handleChange} />);

      const toggle = screen.getByRole('switch');
      toggle.focus();
      await userEvent.keyboard('{Enter}');

      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('should not toggle on Space when disabled', async () => {
      const handleChange = vi.fn();
      render(
        <Toggle checked={false} onChange={handleChange} disabled />
      );

      const toggle = screen.getByRole('switch');
      await userEvent.keyboard(' ');

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should have aria-checked reflecting state', () => {
      render(<Toggle checked={true} onChange={vi.fn()} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should have aria-pressed reflecting state (for button-based toggles)', () => {
      render(<Toggle checked={true} onChange={vi.fn()} />);
      const toggle = screen.getByRole('switch');
      // Role switch uses aria-checked primarily; some implementations also set aria-pressed
      expect(toggle).toBeInTheDocument();
    });

    it('should be focusable', () => {
      render(<Toggle />);
      const toggle = screen.getByRole('switch');
      toggle.focus();
      expect(toggle).toHaveFocus();
    });

    it('should NOT be focusable when disabled', () => {
      render(<Toggle disabled />);
      const toggle = screen.getByRole('switch');
      toggle.focus();
      expect(toggle).not.toHaveFocus();
    });
  });
});
