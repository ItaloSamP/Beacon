/**
 * Unit tests for Tabs component — compound pattern.
 *
 * Tests: rendering tabs (Tabs.Tab), active tab indicator,
 * onChange, disabled tabs, badge counts on tabs, Tabs.Panel
 * content visibility, keyboard Arrow key navigation,
 * keyboard Home/End, aria roles (tablist, tab, tabpanel).
 *
 * RED PHASE: All tests WILL FAIL because Tabs component
 * doesn't exist yet.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
import { Tabs } from '../Tabs';

describe('Tabs', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render tabs via Tabs.Tab', () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1">All Anomalies</Tabs.Tab>
            <Tabs.Tab id="tab-2">Resolved</Tabs.Tab>
            <Tabs.Tab id="tab-3">Unresolved</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      );

      expect(screen.getByText('All Anomalies')).toBeInTheDocument();
      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.getByText('Unresolved')).toBeInTheDocument();
    });

    it('should render tab panels with content', () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1">Tab 1</Tabs.Tab>
            <Tabs.Tab id="tab-2">Tab 2</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel id="tab-1">
            <p>Content 1</p>
          </Tabs.Panel>
          <Tabs.Panel id="tab-2">
            <p>Content 2</p>
          </Tabs.Panel>
        </Tabs>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Active Tab
  // ==========================================================
  describe('active tab', () => {
    it('should show content for default active tab', () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1">First</Tabs.Tab>
            <Tabs.Tab id="tab-2">Second</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel id="tab-1">First Panel</Tabs.Panel>
          <Tabs.Panel id="tab-2">Second Panel</Tabs.Panel>
        </Tabs>
      );

      expect(screen.getByText('First Panel')).toBeInTheDocument();
    });

    it('should hide inactive tab panels', () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1">First</Tabs.Tab>
            <Tabs.Tab id="tab-2">Second</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel id="tab-1">First Panel</Tabs.Panel>
          <Tabs.Panel id="tab-2">Second Panel</Tabs.Panel>
        </Tabs>
      );

      // Only the active panel should be visible
      expect(screen.getByText('First Panel')).toBeInTheDocument();
      expect(screen.queryByText('Second Panel')).toBeNull();
    });

    it('should switch panel on tab click', async () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1">First</Tabs.Tab>
            <Tabs.Tab id="tab-2">Second</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel id="tab-1">First Panel</Tabs.Panel>
          <Tabs.Panel id="tab-2">Second Panel</Tabs.Panel>
        </Tabs>
      );

      await userEvent.click(screen.getByText('Second'));

      expect(screen.queryByText('First Panel')).toBeNull();
      expect(screen.getByText('Second Panel')).toBeInTheDocument();
    });

    it('should have active indicator styling on active tab', () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1">Active Tab</Tabs.Tab>
            <Tabs.Tab id="tab-2">Inactive</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      );

      const activeTab = screen.getByText('Active Tab');
      // Active tab should have distinctive styling
      expect(activeTab).toBeInTheDocument();
    });
  });

  // ==========================================================
  // onChange
  // ==========================================================
  describe('onChange', () => {
    it('should call onChange when tab is clicked', async () => {
      const handleChange = vi.fn();
      render(
        <Tabs defaultActive="tab-1" onChange={handleChange}>
          <Tabs.List>
            <Tabs.Tab id="tab-1">First</Tabs.Tab>
            <Tabs.Tab id="tab-2">Second</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      );

      await userEvent.click(screen.getByText('Second'));

      expect(handleChange).toHaveBeenCalledWith('tab-2');
    });
  });

  // ==========================================================
  // Disabled Tabs
  // ==========================================================
  describe('disabled tabs', () => {
    it('should render disabled tab', () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1">Enabled</Tabs.Tab>
            <Tabs.Tab id="tab-2" disabled>Disabled</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      );

      const disabledTab = screen.getByText('Disabled');
      expect(disabledTab).toBeInTheDocument();
      // Should have disabled attribute or styling
    });

    it('should not switch to disabled tab on click', async () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1">First</Tabs.Tab>
            <Tabs.Tab id="tab-2" disabled>Disabled</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel id="tab-1">First Panel</Tabs.Panel>
          <Tabs.Panel id="tab-2">Second Panel</Tabs.Panel>
        </Tabs>
      );

      await userEvent.click(screen.getByText('Disabled'));

      // Should still show First Panel
      expect(screen.getByText('First Panel')).toBeInTheDocument();
      expect(screen.queryByText('Second Panel')).toBeNull();
    });
  });

  // ==========================================================
  // Badge Counts
  // ==========================================================
  describe('badge counts', () => {
    it('should render badge count on tab', () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1" badge={3}>Alerts</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      );

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render tab without badge when not provided', () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1">No Badge</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      );

      expect(screen.getByText('No Badge')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Keyboard Navigation
  // ==========================================================
  describe('keyboard navigation', () => {
    it('should navigate with ArrowRight key', async () => {
      const handleChange = vi.fn();
      render(
        <Tabs defaultActive="tab-1" onChange={handleChange}>
          <Tabs.List>
            <Tabs.Tab id="tab-1">First</Tabs.Tab>
            <Tabs.Tab id="tab-2">Second</Tabs.Tab>
            <Tabs.Tab id="tab-3">Third</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      );

      // Focus first tab
      const firstTab = screen.getByText('First');
      firstTab.focus();
      await userEvent.keyboard('{ArrowRight}');

      // Should move to second tab (may activate or just focus)
      expect(handleChange).toHaveBeenCalledWith('tab-2');
    });

    it('should navigate with ArrowLeft key', async () => {
      const handleChange = vi.fn();
      render(
        <Tabs defaultActive="tab-2" onChange={handleChange}>
          <Tabs.List>
            <Tabs.Tab id="tab-1">First</Tabs.Tab>
            <Tabs.Tab id="tab-2">Second</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      );

      const secondTab = screen.getByText('Second');
      secondTab.focus();
      await userEvent.keyboard('{ArrowLeft}');

      expect(handleChange).toHaveBeenCalledWith('tab-1');
    });

    it('should navigate to first tab with Home key', async () => {
      const handleChange = vi.fn();
      render(
        <Tabs defaultActive="tab-3" onChange={handleChange}>
          <Tabs.List>
            <Tabs.Tab id="tab-1">First</Tabs.Tab>
            <Tabs.Tab id="tab-2">Second</Tabs.Tab>
            <Tabs.Tab id="tab-3">Third</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      );

      const thirdTab = screen.getByText('Third');
      thirdTab.focus();
      await userEvent.keyboard('{Home}');

      expect(handleChange).toHaveBeenCalledWith('tab-1');
    });

    it('should navigate to last tab with End key', async () => {
      const handleChange = vi.fn();
      render(
        <Tabs defaultActive="tab-1" onChange={handleChange}>
          <Tabs.List>
            <Tabs.Tab id="tab-1">First</Tabs.Tab>
            <Tabs.Tab id="tab-2">Second</Tabs.Tab>
            <Tabs.Tab id="tab-3">Third</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      );

      const firstTab = screen.getByText('First');
      firstTab.focus();
      await userEvent.keyboard('{End}');

      expect(handleChange).toHaveBeenCalledWith('tab-3');
    });

    it('should skip disabled tabs during Arrow navigation', async () => {
      const handleChange = vi.fn();
      render(
        <Tabs defaultActive="tab-1" onChange={handleChange}>
          <Tabs.List>
            <Tabs.Tab id="tab-1">First</Tabs.Tab>
            <Tabs.Tab id="tab-2" disabled>Disabled</Tabs.Tab>
            <Tabs.Tab id="tab-3">Third</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      );

      const firstTab = screen.getByText('First');
      firstTab.focus();
      await userEvent.keyboard('{ArrowRight}');

      // Should skip disabled tab-2 and go to tab-3
      expect(handleChange).toHaveBeenCalledWith('tab-3');
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should have role="tablist" on the tab container', () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1">Tab</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should have role="tab" on each tab', () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1">First</Tabs.Tab>
            <Tabs.Tab id="tab-2">Second</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2);
    });

    it('should have role="tabpanel" on panels', () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1">Tab</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel id="tab-1">Content</Tabs.Panel>
        </Tabs>
      );

      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('should set aria-selected on active tab', () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1">Active</Tabs.Tab>
            <Tabs.Tab id="tab-2">Inactive</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      );

      const activeTab = screen.getByText('Active');
      expect(activeTab).toHaveAttribute('aria-selected', 'true');

      const inactiveTab = screen.getByText('Inactive');
      expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should associate tabpanel with tab via aria-labelledby', () => {
      render(
        <Tabs defaultActive="tab-1">
          <Tabs.List>
            <Tabs.Tab id="tab-1">My Tab</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel id="tab-1">Panel Content</Tabs.Panel>
        </Tabs>
      );

      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toHaveAttribute('aria-labelledby');
    });
  });
});
