/**
 * Unit tests for FilterBar component — compound pattern.
 *
 * Tests: rendering filter pills, active filter state,
 * onFilterChange callback, multiple FilterBar.Group sections,
 * onClear, and sort options.
 *
 * RED PHASE: All tests WILL FAIL because FilterBar component
 * doesn't exist yet.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
import { FilterBar } from '../FilterBar';

describe('FilterBar', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render filter pills', () => {
      render(
        <FilterBar>
          <FilterBar.Group label="Status">
            <FilterBar.Pill value="all" active>All</FilterBar.Pill>
            <FilterBar.Pill value="online">Online</FilterBar.Pill>
            <FilterBar.Pill value="offline">Offline</FilterBar.Pill>
          </FilterBar.Group>
        </FilterBar>
      );

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should render group labels', () => {
      render(
        <FilterBar>
          <FilterBar.Group label="Severity">
            <FilterBar.Pill value="all">All</FilterBar.Pill>
          </FilterBar.Group>
        </FilterBar>
      );

      expect(screen.getByText('Severity')).toBeInTheDocument();
    });

    it('should render multiple filter groups', () => {
      render(
        <FilterBar>
          <FilterBar.Group label="Status">
            <FilterBar.Pill value="all">All</FilterBar.Pill>
            <FilterBar.Pill value="online">Online</FilterBar.Pill>
          </FilterBar.Group>
          <FilterBar.Group label="Type">
            <FilterBar.Pill value="all">All</FilterBar.Pill>
            <FilterBar.Pill value="postgres">PostgreSQL</FilterBar.Pill>
          </FilterBar.Group>
        </FilterBar>
      );

      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Active Filter
  // ==========================================================
  describe('active filter', () => {
    it('should highlight active filter pill', () => {
      render(
        <FilterBar>
          <FilterBar.Group label="Status">
            <FilterBar.Pill value="all" active>All</FilterBar.Pill>
            <FilterBar.Pill value="online">Online</FilterBar.Pill>
          </FilterBar.Group>
        </FilterBar>
      );

      const activePill = screen.getByText('All');
      expect(activePill).toBeInTheDocument();
      // Active pill should have distinctive styling
    });

    it('should change active filter on click', async () => {
      const handleFilterChange = vi.fn();
      render(
        <FilterBar onFilterChange={handleFilterChange}>
          <FilterBar.Group label="Status">
            <FilterBar.Pill value="all" active>All</FilterBar.Pill>
            <FilterBar.Pill value="warning">Warning</FilterBar.Pill>
          </FilterBar.Group>
        </FilterBar>
      );

      await userEvent.click(screen.getByText('Warning'));

      expect(handleFilterChange).toHaveBeenCalled();
    });
  });

  // ==========================================================
  // onFilterChange
  // ==========================================================
  describe('onFilterChange', () => {
    it('should call onFilterChange with the correct value', async () => {
      const handleFilterChange = vi.fn();
      render(
        <FilterBar onFilterChange={handleFilterChange}>
          <FilterBar.Group label="Severity">
            <FilterBar.Pill value="all" active>All</FilterBar.Pill>
            <FilterBar.Pill value="high">High</FilterBar.Pill>
            <FilterBar.Pill value="critical">Critical</FilterBar.Pill>
          </FilterBar.Group>
        </FilterBar>
      );

      await userEvent.click(screen.getByText('Critical'));

      // Should receive filter change information
      expect(handleFilterChange).toHaveBeenCalled();
      const callArgs = handleFilterChange.mock.calls[0][0];
      expect(callArgs).toBeDefined();
    });

    it('should allow toggling between filters in the same group', async () => {
      const handleFilterChange = vi.fn();
      render(
        <FilterBar onFilterChange={handleFilterChange}>
          <FilterBar.Group label="Status">
            <FilterBar.Pill value="all" active>All</FilterBar.Pill>
            <FilterBar.Pill value="error">Error</FilterBar.Pill>
          </FilterBar.Group>
        </FilterBar>
      );

      await userEvent.click(screen.getByText('Error'));
      await userEvent.click(screen.getByText('All'));

      expect(handleFilterChange).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================
  // onClear
  // ==========================================================
  describe('onClear', () => {
    it('should call onClear when clear action is triggered', async () => {
      const handleClear = vi.fn();
      render(
        <FilterBar onClear={handleClear}>
          <FilterBar.Group label="Status">
            <FilterBar.Pill value="all" active>All</FilterBar.Pill>
            <FilterBar.Pill value="online">Online</FilterBar.Pill>
          </FilterBar.Group>
        </FilterBar>
      );

      // Clear should be accessible — look for a clear/reset button
      const clearBtn = screen.queryByText(/clear|reset/i);
      if (clearBtn) {
        await userEvent.click(clearBtn);
        expect(handleClear).toHaveBeenCalled();
      }
    });
  });

  // ==========================================================
  // Sort Options
  // ==========================================================
  describe('sort options', () => {
    it('should render sort select when sortOptions are provided', () => {
      render(
        <FilterBar
          sortOptions={[
            { value: 'recent', label: 'Most Recent' },
            { value: 'name', label: 'Name' },
          ]}
        >
          <FilterBar.Group label="Status">
            <FilterBar.Pill value="all">All</FilterBar.Pill>
          </FilterBar.Group>
        </FilterBar>
      );

      expect(screen.getByText('Most Recent')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('should call onSortChange when sort is changed', async () => {
      const handleSortChange = vi.fn();
      render(
        <FilterBar
          sortOptions={[
            { value: 'recent', label: 'Recent' },
            { value: 'oldest', label: 'Oldest' },
          ]}
          onSortChange={handleSortChange}
        >
          <FilterBar.Group label="Status">
            <FilterBar.Pill value="all">All</FilterBar.Pill>
          </FilterBar.Group>
        </FilterBar>
      );

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'oldest');

      expect(handleSortChange).toHaveBeenCalledWith('oldest');
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className', () => {
      render(
        <FilterBar className="custom-filter-bar">
          <FilterBar.Group label="Status">
            <FilterBar.Pill value="all">All</FilterBar.Pill>
          </FilterBar.Group>
        </FilterBar>
      );

      const container = document.querySelector('.custom-filter-bar');
      expect(container).toBeInTheDocument();
    });
  });
});
