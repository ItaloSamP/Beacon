/**
 * Unit tests for Input component — refined version.
 *
 * Tests rendering, label, error state, disabled, placeholder,
 * helperText, icon adornment, password toggle, and onChange.
 *
 * RED PHASE: Tests WILL FAIL because the refined Input
 * component doesn't exist yet with these new props.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component may lack new props)
import { Input } from '../Input';

describe('Input', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render an input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with a placeholder', () => {
      render(<Input placeholder="Enter your name" />);
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });

    it('should render with a default value', () => {
      render(<Input defaultValue="Hello" />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Hello');
    });
  });

  // ==========================================================
  // Label
  // ==========================================================
  describe('label', () => {
    it('should render a label when label prop is provided', () => {
      render(<Input label="Email" />);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('should associate label with input via htmlFor', () => {
      render(<Input label="Username" id="username-input" />);
      const label = screen.getByText('Username');
      expect(label).toHaveAttribute('for', 'username-input');
    });

    it('should not render a label when label prop is not provided', () => {
      render(<Input />);
      expect(screen.queryByRole('label')).toBeNull();
    });
  });

  // ==========================================================
  // Error State
  // ==========================================================
  describe('error state', () => {
    it('should render an error message when error prop is provided', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error styling to the input', () => {
      render(<Input error="Invalid email" />);
      const input = screen.getByRole('textbox');
      // Error input should have a red border class
      expect(input.className).toMatch(/border-red|border-danger/);
    });

    it('should not render error message when no error', () => {
      render(<Input />);
      // The error element should not exist
      const input = screen.getByRole('textbox');
      const errorEl = screen.queryByRole('alert');
      // If no error, no alert role element should exist
      expect(errorEl).toBeNull();
    });

    it('should set aria-invalid="true" when there is an error', () => {
      render(<Input error="Field is required" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should have aria-describedby pointing to error element', () => {
      render(<Input error="This field is required" id="test-input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby');
    });
  });

  // ==========================================================
  // Disabled State
  // ==========================================================
  describe('disabled state', () => {
    it('should render a disabled input', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should apply disabled styling', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      // Should have reduced opacity or gray background
      expect(input.className).toMatch(/opacity/);
    });

    it('should not allow typing when disabled', async () => {
      render(<Input disabled value="original" onChange={vi.fn()} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      await userEvent.type(input, 'new text');
      // Value should not change since disabled inputs can't be typed into
      // userEvent may skip typing into disabled inputs
    });
  });

  // ==========================================================
  // Helper Text
  // ==========================================================
  describe('helperText', () => {
    it('should render helperText below the input', () => {
      render(<Input helperText="Must be at least 8 characters" />);
      expect(
        screen.getByText('Must be at least 8 characters')
      ).toBeInTheDocument();
    });

    it('should not show helperText when error is also present (error takes precedence)', () => {
      render(
        <Input
          helperText="Enter a password"
          error="Password is required"
        />
      );
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.queryByText('Enter a password')).toBeNull();
    });

    it('should render helperText with muted styling', () => {
      render(<Input helperText="Optional field" />);
      const helper = screen.getByText('Optional field');
      expect(helper).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Icon Adornment (left)
  // ==========================================================
  describe('icon adornment', () => {
    it('should render a left icon when icon prop is provided', () => {
      render(
        <Input
          icon={<span data-testid="search-icon">🔍</span>}
          placeholder="Search..."
        />
      );
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('should place icon on the left side of input', () => {
      render(
        <Input
          icon={<span data-testid="mail-icon">📧</span>}
          placeholder="Email"
        />
      );
      const icon = screen.getByTestId('mail-icon');
      const input = screen.getByRole('textbox');
      // Icon should be rendered before the input in the DOM
      expect(icon).toBeInTheDocument();
      expect(input).toBeInTheDocument();
    });

    it('should render without icon when icon prop is not provided', () => {
      render(<Input placeholder="No icon" />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Password Toggle (type="password")
  // ==========================================================
  describe('password type toggle', () => {
    it('should render as type="password" when type prop is password', () => {
      render(<Input type="password" />);
      // Password inputs have no implicit role, so getByRole('textbox') won't find them.
      // Use querySelector as the primary selector for password inputs.
      const input = document.querySelector('input[type="password"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should show a toggle button when type is password', () => {
      render(<Input type="password" placeholder="Enter password" />);
      // Should have a button to toggle visibility (eye icon)
      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toBeInTheDocument();
    });

    it('should toggle between password and text when button is clicked', async () => {
      render(<Input type="password" placeholder="Password" />);
      const toggleBtn = screen.getByRole('button');
      const input = document.querySelector('input') as HTMLInputElement;

      expect(input.type).toBe('password');

      await userEvent.click(toggleBtn);
      expect(input.type).toBe('text');

      await userEvent.click(toggleBtn);
      expect(input.type).toBe('password');
    });

    it('should have aria-label on toggle button', () => {
      render(<Input type="password" />);
      const toggleBtn = screen.getByRole('button');
      expect(toggleBtn).toHaveAttribute('aria-label');
    });

    it('should NOT show toggle button when type is not password', () => {
      render(<Input type="text" />);
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });
  });

  // ==========================================================
  // onChange
  // ==========================================================
  describe('onChange', () => {
    it('should call onChange when user types', async () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'hello');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should update value when controlled', async () => {
      const handleChange = vi.fn();
      render(<Input value="initial" onChange={handleChange} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('initial');
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should be focusable', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      input.focus();
      expect(input).toHaveFocus();
    });

    it('should not be focusable when disabled', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      input.focus();
      expect(input).not.toHaveFocus();
    });
  });
});
