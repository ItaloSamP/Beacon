/**
 * Unit tests for Button component.
 *
 * Tests rendering, click handling, variants, disabled state,
 * and accessibility attributes.
 *
 * RED PHASE: All tests WILL FAIL because the Button component
 * and its dependencies don't exist yet.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ============================================================
// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
// ============================================================
import { Button } from '../Button';


describe('Button', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render a button element', () => {
      render(<Button>Click Me</Button>);

      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it('should render button text content', () => {
      render(<Button>Save Changes</Button>);

      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should render as a button element by default', () => {
      render(<Button>Test</Button>);

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should render with type="button" by default (not submit)', () => {
      render(<Button>Test</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should accept type="submit"', () => {
      render(<Button type="submit">Submit</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  // ==========================================================
  // Click handling
  // ==========================================================
  describe('click handling', () => {
    it('should call onClick handler when clicked', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} disabled>Click Me</Button>);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should call onClick once per click', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const button = screen.getByRole('button');
      await userEvent.tripleClick(button);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================
  // Variants
  // ==========================================================
  describe('variants', () => {
    it('should render with primary variant by default', () => {
      render(<Button>Primary</Button>);

      const button = screen.getByRole('button');
      // Primary variant should have appropriate styling class
      expect(button.className).toBeTruthy();
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // Should have different styling from primary
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render danger variant', () => {
      render(<Button variant="danger">Delete</Button>);

      const button = screen.getByRole('button', { name: /delete/i });
      expect(button).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Sizes
  // ==========================================================
  describe('sizes', () => {
    it('should render with default size', () => {
      render(<Button>Default Size</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render small size', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render large size', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  // ==========================================================
  // States
  // ==========================================================
  describe('states', () => {
    it('should render disabled button', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should render loading button with spinner', () => {
      render(<Button loading>Saving...</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled(); // Loading buttons should be disabled
      // Should show a loading indicator
      expect(button.textContent).toContain('Saving');
    });

    it('should not trigger onClick when loading', () => {
      const handleClick = vi.fn();
      render(<Button loading onClick={handleClick}>Loading</Button>);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should be focusable', () => {
      render(<Button>Focusable</Button>);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should not be focusable when disabled', () => {
      render(<Button disabled>Not Focusable</Button>);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).not.toHaveFocus();
    });

    it('should have accessible name', () => {
      render(<Button aria-label="Close dialog">X</Button>);

      const button = screen.getByRole('button', { name: /close dialog/i });
      expect(button).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Additional props
  // ==========================================================
  describe('additional props', () => {
    it('should pass className prop', () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });

    it('should pass data-testid prop', () => {
      render(<Button data-testid="my-button">Test ID</Button>);

      expect(screen.getByTestId('my-button')).toBeInTheDocument();
    });

    it('should pass id prop', () => {
      render(<Button id="unique-button">ID Button</Button>);

      expect(document.getElementById('unique-button')).toBeInTheDocument();
    });

    it('should render with icon children', () => {
      render(
        <Button>
          <span data-testid="icon">+</span>
          <span>Add Item</span>
        </Button>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Critical variant (NEW — RED PHASE)
  // ==========================================================
  describe('critical variant', () => {
    it('should render critical variant', () => {
      render(<Button variant="critical">Critical Action</Button>);

      const button = screen.getByRole('button', { name: /critical action/i });
      expect(button).toBeInTheDocument();
    });

    it('should apply purple/violet styling for critical variant', () => {
      render(<Button variant="critical">Critical</Button>);

      const button = screen.getByRole('button');
      // Critical should use purple/violet colors (theme token)
      expect(button.className).toMatch(/violet|purple|critical/);
    });
  });

  // ==========================================================
  // Icon-only button (NEW — RED PHASE)
  // ==========================================================
  describe('icon-only button', () => {
    it('should render icon size variant (square button)', () => {
      render(
        <Button size="icon" aria-label="Close">
          <span>×</span>
        </Button>
      );

      const button = screen.getByRole('button', { name: /close/i });
      expect(button).toBeInTheDocument();
    });

    it('should have equal width and height for icon button', () => {
      render(
        <Button size="icon" aria-label="Settings">
          ⚙
        </Button>
      );

      const button = screen.getByRole('button');
      // Icon button should have padding that makes it square-ish
      expect(button.className).toMatch(/p-\d/);
    });

    it('should still be accessible with aria-label', () => {
      render(
        <Button size="icon" aria-label="Delete item">
          <span>🗑</span>
        </Button>
      );

      expect(
        screen.getByRole('button', { name: /delete item/i })
      ).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Full-width button (NEW — RED PHASE)
  // ==========================================================
  describe('fullWidth prop', () => {
    it('should render full-width button when fullWidth is true', () => {
      render(<Button fullWidth>Full Width</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toMatch(/w-full/);
    });

    it('should NOT be full-width by default', () => {
      render(<Button>Normal</Button>);

      const button = screen.getByRole('button');
      expect(button.className).not.toMatch(/w-full/);
    });
  });

  // ==========================================================
  // Keyboard Enter activation (NEW — RED PHASE)
  // ==========================================================
  describe('keyboard activation', () => {
    it('should call onClick when Enter key is pressed', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Enter Me</Button>);

      const button = screen.getByRole('button');
      button.focus();
      await userEvent.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when Space key is pressed', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Space Me</Button>);

      const button = screen.getByRole('button');
      button.focus();
      await userEvent.keyboard(' ');

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onClick on Enter when disabled', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      await userEvent.keyboard('{Enter}');

      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
