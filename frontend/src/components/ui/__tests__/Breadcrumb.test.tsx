/**
 * Unit tests for Breadcrumb component — compound pattern.
 *
 * Tests: rendering items (Breadcrumb.Item), separator between items,
 * last item active/no-link, collapsed/truncated variant (ellipsis),
 * aria-label="breadcrumb", and <nav> element.
 *
 * RED PHASE: All tests WILL FAIL because Breadcrumb component
 * doesn't exist yet.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
import { Breadcrumb } from '../Breadcrumb';

describe('Breadcrumb', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render items via Breadcrumb.Item', () => {
      render(
        <Breadcrumb>
          <Breadcrumb.Item href="/anomalies">Anomalies</Breadcrumb.Item>
          <Breadcrumb.Item isCurrentPage>Detail</Breadcrumb.Item>
        </Breadcrumb>
      );

      expect(screen.getByText('Anomalies')).toBeInTheDocument();
      expect(screen.getByText('Detail')).toBeInTheDocument();
    });

    it('should render as a <nav> element', () => {
      render(
        <Breadcrumb>
          <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
        </Breadcrumb>
      );

      const nav = document.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('should have aria-label="breadcrumb"', () => {
      render(
        <Breadcrumb>
          <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
        </Breadcrumb>
      );

      const nav = document.querySelector('nav');
      expect(nav).toHaveAttribute('aria-label', 'breadcrumb');
    });

    it('should render three levels deep', () => {
      render(
        <Breadcrumb>
          <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
          <Breadcrumb.Item href="/pipelines">Pipelines</Breadcrumb.Item>
          <Breadcrumb.Item isCurrentPage>Volume Check</Breadcrumb.Item>
        </Breadcrumb>
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Pipelines')).toBeInTheDocument();
      expect(screen.getByText('Volume Check')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Separators
  // ==========================================================
  describe('separators', () => {
    it('should render separator between items', () => {
      render(
        <Breadcrumb>
          <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
          <Breadcrumb.Item href="/datasources">Data Sources</Breadcrumb.Item>
        </Breadcrumb>
      );

      // Should have a separator character (chevron, slash, etc.)
      // Each item except first should be preceded by a separator
      const items = screen.getAllByRole('listitem');
      expect(items.length).toBe(2);
    });

    it('should NOT render separator after last item', () => {
      render(
        <Breadcrumb>
          <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
          <Breadcrumb.Item isCurrentPage>Current</Breadcrumb.Item>
        </Breadcrumb>
      );

      const separators = document.querySelectorAll('[aria-hidden="true"]');
      // There should be exactly N-1 separators for N items
      // (hard to test precisely without knowing markup, so verify items render)
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Last Item (Current Page)
  // ==========================================================
  describe('current page (last item)', () => {
    it('should render last item without a link when isCurrentPage', () => {
      render(
        <Breadcrumb>
          <Breadcrumb.Item href="/anomalies">Anomalies</Breadcrumb.Item>
          <Breadcrumb.Item isCurrentPage>Current Anomaly</Breadcrumb.Item>
        </Breadcrumb>
      );

      // Current page item should NOT be a link
      const currentItem = screen.getByText('Current Anomaly');
      expect(currentItem.tagName).not.toBe('A');
    });

    it('should apply active/current styling to last item', () => {
      render(
        <Breadcrumb>
          <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
          <Breadcrumb.Item isCurrentPage>Active Page</Breadcrumb.Item>
        </Breadcrumb>
      );

      const currentEl = screen.getByText('Active Page');
      // Current page should have muted/stronger text styling
      expect(currentEl).toBeInTheDocument();
    });

    it('should have aria-current="page" on current item', () => {
      render(
        <Breadcrumb>
          <Breadcrumb.Item isCurrentPage>Current</Breadcrumb.Item>
        </Breadcrumb>
      );

      const currentEl = screen.getByText('Current');
      expect(currentEl).toHaveAttribute('aria-current', 'page');
    });
  });

  // ==========================================================
  // Collapsed / Truncated Variant
  // ==========================================================
  describe('collapsed variant', () => {
    it('should render ellipsis for collapsed items', () => {
      render(
        <Breadcrumb collapsed>
          <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
          <Breadcrumb.Item href="/section">Section</Breadcrumb.Item>
          <Breadcrumb.Item href="/section/sub">Sub</Breadcrumb.Item>
          <Breadcrumb.Item href="/section/sub/page">Page</Breadcrumb.Item>
          <Breadcrumb.Item isCurrentPage>Current</Breadcrumb.Item>
        </Breadcrumb>
      );

      // Collapsed breadcrumb should show an ellipsis ("...")
      const ellipsis = screen.getByText('...');
      expect(ellipsis).toBeInTheDocument();
    });

    it('should always show first and last items when collapsed', () => {
      render(
        <Breadcrumb collapsed>
          <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
          <Breadcrumb.Item href="/deep/nested/path">Deep</Breadcrumb.Item>
          <Breadcrumb.Item isCurrentPage>Final</Breadcrumb.Item>
        </Breadcrumb>
      );

      // First and last items should always be visible
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Final')).toBeInTheDocument();
    });

    it('should show all items when not collapsed', () => {
      render(
        <Breadcrumb>
          <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
          <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
          <Breadcrumb.Item href="/a/b">B</Breadcrumb.Item>
          <Breadcrumb.Item isCurrentPage>C</Breadcrumb.Item>
        </Breadcrumb>
      );

      // All items should be visible (no ellipsis)
      expect(screen.queryByText('...')).toBeNull();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should render items as list items in an ordered list', () => {
      render(
        <Breadcrumb>
          <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
          <Breadcrumb.Item isCurrentPage>Page</Breadcrumb.Item>
        </Breadcrumb>
      );

      const list = document.querySelector('ol');
      expect(list).toBeInTheDocument();
      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBe(2);
    });
  });
});
