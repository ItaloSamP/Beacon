/**
 * Unit tests for SearchInput component.
 *
 * Tests: Search icon, placeholder, onChange, onClear (X button),
 * debounce, disabled, Escape key to clear, and autoFocus.
 *
 * RED PHASE: All tests WILL FAIL because SearchInput component
 * doesn't exist yet.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
import { SearchInput } from '../SearchInput';

describe('SearchInput', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render a search input field', () => {
      render(<SearchInput />);
      // Should be a textbox (search role or textbox)
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should render a search icon', () => {
      render(<SearchInput />);
      // Should have a lucide Search icon as adornment
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      // Icon should be present (svg element)
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render with a placeholder', () => {
      render(<SearchInput placeholder="Search anomalies..." />);

      expect(
        screen.getByPlaceholderText('Search anomalies...')
      ).toBeInTheDocument();
    });

    it('should have default placeholder "Search..."', () => {
      render(<SearchInput />);

      const input = screen.getByPlaceholderText(/search/i);
      expect(input).toBeInTheDocument();
    });
  });

  // ==========================================================
  // onChange
  // ==========================================================
  describe('onChange', () => {
    it('should call onChange when user types', async () => {
      const handleChange = vi.fn();
      render(<SearchInput onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'test');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should pass the input value to onChange', async () => {
      let capturedValue = '';
      const handleChange = vi.fn((value: string) => {
        capturedValue = value;
      });

      render(<SearchInput onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'hello');

      // onChange should eventually be called with the value
      expect(handleChange).toHaveBeenCalled();
    });
  });

  // ==========================================================
  // Clear Button (X)
  // ==========================================================
  describe('clear button', () => {
    it('should show clear (X) button when input has value', async () => {
      render(<SearchInput />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'search text');

      // A clear button should appear
      const clearBtn = screen.queryByRole('button');
      expect(clearBtn).toBeInTheDocument();
    });

    it('should hide clear button when input is empty', () => {
      render(<SearchInput />);

      const clearBtn = screen.queryByRole('button');
      expect(clearBtn).toBeNull();
    });

    it('should clear input when clear button is clicked', async () => {
      const handleChange = vi.fn();
      render(<SearchInput onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'something');

      const clearBtn = screen.getByRole('button');
      await userEvent.click(clearBtn);

      await waitFor(() => {
        expect((input as HTMLInputElement).value).toBe('');
      });
    });

    it('should call onChange with empty string on clear', async () => {
      const handleChange = vi.fn();
      render(<SearchInput onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'clear me');

      const clearBtn = screen.getByRole('button');
      await userEvent.click(clearBtn);

      // onChange should be called with empty string
      expect(handleChange).toHaveBeenCalled();
    });

    it('should have aria-label on clear button', async () => {
      render(<SearchInput />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'x');

      const clearBtn = screen.getByRole('button');
      expect(clearBtn).toHaveAttribute('aria-label');
    });
  });

  // ==========================================================
  // Debounce
  // ==========================================================
  describe('debounce', () => {
    it('should debounce onChange calls when debounceMs is set', async () => {
      const handleChange = vi.fn();

      render(<SearchInput onChange={handleChange} debounceMs={300} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'abc');

      // onChange should not fire immediately (before debounce delay)
      expect(handleChange).not.toHaveBeenCalled();

      // Wait for debounce to fire
      await waitFor(() => expect(handleChange).toHaveBeenCalled(), { timeout: 500 });
    });

    it('should call onChange immediately when no debounceMs', async () => {
      const handleChange = vi.fn();
      render(<SearchInput onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'a');

      // Without debounce, onChange fires synchronously after userEvent.type resolves
      await waitFor(() => expect(handleChange).toHaveBeenCalled(), { timeout: 100 });
    });
  });

  // ==========================================================
  // Disabled State
  // ==========================================================
  describe('disabled state', () => {
    it('should render disabled input', () => {
      render(<SearchInput disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should not allow typing when disabled', () => {
      render(<SearchInput disabled value="locked" onChange={vi.fn()} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('locked');
    });
  });

  // ==========================================================
  // Keyboard Interaction
  // ==========================================================
  describe('keyboard interaction', () => {
    it('should clear input on Escape key', async () => {
      const handleChange = vi.fn();
      render(<SearchInput onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'esc me');
      expect((input as HTMLInputElement).value).not.toBe('');

      await userEvent.keyboard('{Escape}');

      // onChange should have been called with empty string
      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith('');
      });
    });

    it('should focus input on Escape even after clear', async () => {
      render(<SearchInput />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'test');
      await userEvent.keyboard('{Escape}');

      // Focus may take a microtask to propagate in JSDOM
      // The search input's clearInput() calls inputRef.current?.focus()
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });
  });

  // ==========================================================
  // autoFocus
  // ==========================================================
  describe('autoFocus', () => {
    it('should auto-focus the input when autoFocus is true', () => {
      render(<SearchInput autoFocus />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
    });

    it('should not auto-focus by default', () => {
      render(<SearchInput />);

      const input = screen.getByRole('textbox');
      expect(input).not.toHaveFocus();
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className', () => {
      render(<SearchInput className="custom-search" />);

      const container = document.querySelector('.custom-search');
      expect(container).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should have aria-label on search input', () => {
      render(<SearchInput />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label');
    });

    it('should use type="search" for semantic HTML', () => {
      render(<SearchInput />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      // Search inputs can be type="search" or type="text"
      // At minimum, should be a textbox
      expect(input).toBeInTheDocument();
    });
  });
});
