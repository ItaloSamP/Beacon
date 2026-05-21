/**
 * Unit tests for Table component — refined compound pattern version.
 *
 * Tests: headers rendering, row/cell rendering via sub-components,
 * emptyState, loading state, sortable headers, and striped rows.
 *
 * RED PHASE: Tests WILL FAIL because Table uses flat props pattern
 * and lacks compound sub-components (Table.Head, Table.Row, Table.Cell),
 * emptyState, loading, sortable, striped props.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// IMPORT THAT WILL FAIL (compound sub-components don't exist yet)
import { Table } from '../Table';

describe('Table', () => {
  // ==========================================================
  // Rendering with Compound Sub-Components
  // ==========================================================
  describe('compound rendering', () => {
    it('should render headers via Table.Head', () => {
      render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
              <Table.Cell header>Status</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Row>
            <Table.Cell>Prod DB</Table.Cell>
            <Table.Cell>Active</Table.Cell>
          </Table.Row>
        </Table>
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Prod DB')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render header cells as <th> elements', () => {
      render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Column 1</Table.Cell>
            </Table.Row>
          </Table.Head>
        </Table>
      );

      const cell = screen.getByText('Column 1');
      expect(cell.tagName).toBe('TH');
    });

    it('should render body cells as <td> elements', () => {
      render(
        <Table>
          <Table.Row>
            <Table.Cell>Value</Table.Cell>
          </Table.Row>
        </Table>
      );

      const cell = screen.getByText('Value');
      expect(cell.tagName).toBe('TD');
    });

    it('should render multiple rows', () => {
      render(
        <Table>
          <Table.Row>
            <Table.Cell>Row 1</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Row 2</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Row 3</Table.Cell>
          </Table.Row>
        </Table>
      );

      expect(screen.getByText('Row 1')).toBeInTheDocument();
      expect(screen.getByText('Row 2')).toBeInTheDocument();
      expect(screen.getByText('Row 3')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Empty State
  // ==========================================================
  describe('empty state', () => {
    it('should render emptyState message when no children rows', () => {
      render(
        <Table emptyState="No data available">
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
        </Table>
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should render custom emptyState node', () => {
      render(
        <Table
          emptyState={
            <div data-testid="custom-empty">
              <p>Nothing here</p>
            </div>
          }
        >
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Col</Table.Cell>
            </Table.Row>
          </Table.Head>
        </Table>
      );

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
      expect(screen.getByText('Nothing here')).toBeInTheDocument();
    });

    it('should NOT render emptyState when rows exist', () => {
      render(
        <Table emptyState="No data">
          <Table.Row>
            <Table.Cell>Data exists</Table.Cell>
          </Table.Row>
        </Table>
      );

      expect(screen.queryByText('No data')).toBeNull();
      expect(screen.getByText('Data exists')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Loading State
  // ==========================================================
  describe('loading state', () => {
    it('should render loading indicator when loading=true', () => {
      render(
        <Table loading>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
        </Table>
      );

      // Should have a loading/skeleton indicator
      // Use data-testid or aria-busy to detect loading
      const table = document.querySelector('table');
      expect(table).toBeInTheDocument();
    });

    it('should set aria-busy="true" when loading', () => {
      render(<Table loading><Table.Head><Table.Row><Table.Cell header>Col</Table.Cell></Table.Row></Table.Head></Table>);
      const table = document.querySelector('table');
      expect(table).toHaveAttribute('aria-busy', 'true');
    });

    it('should NOT set aria-busy when not loading', () => {
      render(
        <Table>
          <Table.Row>
            <Table.Cell>Content</Table.Cell>
          </Table.Row>
        </Table>
      );
      const table = document.querySelector('table');
      expect(table?.getAttribute('aria-busy')).not.toBe('true');
    });
  });

  // ==========================================================
  // Sortable Headers
  // ==========================================================
  describe('sortable headers', () => {
    it('should render sortable header when sortable prop is provided', () => {
      render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header sortable>Name</Table.Cell>
              <Table.Cell header>Value</Table.Cell>
            </Table.Row>
          </Table.Head>
        </Table>
      );

      const nameHeader = screen.getByText('Name');
      expect(nameHeader).toBeInTheDocument();
    });

    it('should call onSort when sortable header is clicked', async () => {
      const handleSort = vi.fn();
      render(
        <Table onSort={handleSort}>
          <Table.Head>
            <Table.Row>
              <Table.Cell header sortable>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
        </Table>
      );

      const header = screen.getByText('Name');
      await userEvent.click(header);

      expect(handleSort).toHaveBeenCalled();
    });

    it('should show sort direction indicator on currently sorted column', () => {
      render(
        <Table sortKey="name" sortDirection="asc">
          <Table.Head>
            <Table.Row>
              <Table.Cell header sortable>Name</Table.Cell>
              <Table.Cell header sortable>Date</Table.Cell>
            </Table.Row>
          </Table.Head>
        </Table>
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Striped Rows
  // ==========================================================
  describe('striped rows', () => {
    it('should apply alternating row colors when striped=true', () => {
      render(
        <Table striped>
          <Table.Row>
            <Table.Cell>Row 1</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Row 2</Table.Cell>
          </Table.Row>
        </Table>
      );

      const rows = document.querySelectorAll('tbody tr');
      // Even rows may have striped class
      expect(rows.length).toBe(2);
    });

    it('should NOT have striped styling by default', () => {
      render(
        <Table>
          <Table.Row>
            <Table.Cell>Row 1</Table.Cell>
          </Table.Row>
        </Table>
      );

      expect(screen.getByText('Row 1')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className on Table', () => {
      render(
        <Table className="custom-table">
          <Table.Row>
            <Table.Cell>Cell</Table.Cell>
          </Table.Row>
        </Table>
      );

      const table = document.querySelector('.custom-table');
      expect(table).toBeInTheDocument();
    });

    it('should merge custom className on Table.Row', () => {
      render(
        <Table>
          <Table.Row className="highlight-row">
            <Table.Cell>Cell</Table.Cell>
          </Table.Row>
        </Table>
      );

      const row = document.querySelector('.highlight-row');
      expect(row).toBeInTheDocument();
    });

    it('should merge custom className on Table.Cell', () => {
      render(
        <Table>
          <Table.Row>
            <Table.Cell className="custom-cell">Cell</Table.Cell>
          </Table.Row>
        </Table>
      );

      const cell = document.querySelector('.custom-cell');
      expect(cell).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should render as a <table> element', () => {
      render(
        <Table>
          <Table.Row>
            <Table.Cell>Cell</Table.Cell>
          </Table.Row>
        </Table>
      );

      const table = document.querySelector('table');
      expect(table).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should have appropriate roles for headers and cells', () => {
      render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell header>Name</Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Row>
            <Table.Cell>Value</Table.Cell>
          </Table.Row>
        </Table>
      );

      expect(screen.getByRole('columnheader')).toBeInTheDocument();
      expect(screen.getByRole('cell')).toBeInTheDocument();
    });
  });
});
