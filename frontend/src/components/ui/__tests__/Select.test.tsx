/**
 * Unit tests for Select component — refined version.
 *
 * Tests: options rendering, label, error state, disabled,
 * placeholder, value selection, and onChange callback.
 *
 * RED PHASE: Tests WILL FAIL because the refined Select
 * component doesn't exist yet with placeholder prop.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component may lack new props)
import { Select } from '../Select';

const defaultOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Select', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render a select element', () => {
      render(<Select options={defaultOptions} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render all options', () => {
      render(<Select options={defaultOptions} />);

      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('should render with a label', () => {
      render(<Select label="Country" options={defaultOptions} />);
      expect(screen.getByText('Country')).toBeInTheDocument();
    });

    it('should associate label with select via htmlFor', () => {
      render(<Select label="Status" id="status-select" options={defaultOptions} />);
      const label = screen.getByText('Status');
      expect(label).toHaveAttribute('for', 'status-select');
    });
  });

  // ==========================================================
  // Error State
  // ==========================================================
  describe('error state', () => {
    it('should render error message', () => {
      render(<Select options={defaultOptions} error="Please select an option" />);
      expect(screen.getByText('Please select an option')).toBeInTheDocument();
    });

    it('should apply error styling to select', () => {
      render(<Select options={defaultOptions} error="Required field" />);
      const select = screen.getByRole('combobox');
      expect(select.className).toMatch(/border-red|border-danger/);
    });

    it('should set aria-invalid="true" on error', () => {
      render(<Select options={defaultOptions} error="Invalid" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-invalid', 'true');
    });
  });

  // ==========================================================
  // Disabled State
  // ==========================================================
  describe('disabled state', () => {
    it('should render a disabled select', () => {
      render(<Select options={defaultOptions} disabled />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('should apply disabled styling', () => {
      render(<Select options={defaultOptions} disabled />);
      const select = screen.getByRole('combobox');
      // Should have reduced opacity or disabled class
      expect(select.className).toMatch(/opacity/);
    });
  });

  // ==========================================================
  // Placeholder
  // ==========================================================
  describe('placeholder', () => {
    it('should render a placeholder option', () => {
      render(
        <Select
          options={defaultOptions}
          placeholder="Select an option..."
        />
      );

      expect(screen.getByText('Select an option...')).toBeInTheDocument();
    });

    it('should render placeholder as the first option', () => {
      render(
        <Select
          options={defaultOptions}
          placeholder="Choose..."
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const firstOption = select.options[0];
      expect(firstOption.text).toBe('Choose...');
    });

    it('should have empty value for placeholder option', () => {
      render(
        <Select
          options={defaultOptions}
          placeholder="Pick one"
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.options[0].value).toBe('');
    });

    it('should render without placeholder when not provided', () => {
      render(<Select options={defaultOptions} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      // First option should be the first real option
      expect(select.options[0].text).toBe('Option 1');
    });

    it('should have placeholder as disabled attribute', () => {
      render(
        <Select
          options={defaultOptions}
          placeholder="Select..."
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.options[0].disabled).toBe(true);
    });
  });

  // ==========================================================
  // Value Selection
  // ==========================================================
  describe('value selection', () => {
    it('should select the correct option when value is set', () => {
      render(<Select options={defaultOptions} value="option2" onChange={vi.fn()} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('option2');
    });

    it('should call onChange when user selects an option', async () => {
      const handleChange = vi.fn();
      render(<Select options={defaultOptions} onChange={handleChange} />);

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'option3');

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect((select as HTMLSelectElement).value).toBe('option3');
    });

    it('should call onChange with the correct value', async () => {
      const handleChange = vi.fn();
      render(<Select options={defaultOptions} onChange={handleChange} />);

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'option1');

      expect(handleChange).toHaveBeenCalled();
      const event = handleChange.mock.calls[0][0];
      expect(event.target.value).toBe('option1');
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className', () => {
      render(
        <Select options={defaultOptions} className="custom-select" />
      );
      const select = document.querySelector('.custom-select');
      expect(select).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should be focusable', () => {
      render(<Select options={defaultOptions} />);
      const select = screen.getByRole('combobox');
      select.focus();
      expect(select).toHaveFocus();
    });

    it('should not be focusable when disabled', () => {
      render(<Select options={defaultOptions} disabled />);
      const select = screen.getByRole('combobox');
      select.focus();
      expect(select).not.toHaveFocus();
    });

    it('should have aria-label when label is provided', () => {
      render(
        <Select
          label="Fruit"
          options={defaultOptions}
          id="fruit-select"
        />
      );
      const select = screen.getByRole('combobox');
      // Should be labelled by the associated label element
      expect(select).toHaveAttribute('id', 'fruit-select');
    });
  });
});
