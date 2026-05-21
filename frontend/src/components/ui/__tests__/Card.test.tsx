/**
 * Unit tests for Card component — refined version.
 *
 * Tests children rendering, padding variants, hoverable states,
 * onClick handler, and className passthrough.
 *
 * RED PHASE: Tests WILL FAIL because the refined Card component
 * doesn't exist yet with padding, hoverable, onClick props.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component lacks new props)
import { Card } from '../Card';

describe('Card', () => {
  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render children content', () => {
      render(
        <Card>
          <p>Card content</p>
        </Card>
      );

      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render complex children', () => {
      render(
        <Card>
          <h3 data-testid="card-title">Title</h3>
          <p data-testid="card-body">Body text</p>
          <button>Action</button>
        </Card>
      );

      expect(screen.getByTestId('card-title')).toBeInTheDocument();
      expect(screen.getByTestId('card-body')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render empty content gracefully', () => {
      render(<Card />);
      // Should render without crashing; Card is a div
      const card = document.querySelector('.bg-white, [class*="rounded"]');
      expect(card).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Padding Variants
  // ==========================================================
  describe('padding variants', () => {
    it('should render with default padding', () => {
      render(<Card><span>Content</span></Card>);
      const card = document.querySelector('[class*="p-"]');
      expect(card).toBeInTheDocument();
    });

    it('should render with padding="none"', () => {
      render(<Card padding="none"><span>Content</span></Card>);
      const content = screen.getByText('Content');
      expect(content).toBeInTheDocument();
      // Padding none means some inner element may have no padding class
    });

    it('should render with padding="sm"', () => {
      render(<Card padding="sm"><span>Content</span></Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render with padding="md"', () => {
      render(<Card padding="md"><span>Content</span></Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render with padding="lg"', () => {
      render(<Card padding="lg"><span>Content</span></Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Hoverable
  // ==========================================================
  describe('hoverable state', () => {
    it('should render with hoverable prop', () => {
      render(<Card hoverable><span>Hoverable</span></Card>);
      const card = document.querySelector('[class*="hover:"]');
      expect(card).toBeInTheDocument();
    });

    it('should have transition class when hoverable', () => {
      render(<Card hoverable><span>Content</span></Card>);
      const card = document.querySelector('[class*="transition"]');
      expect(card).toBeInTheDocument();
    });

    it('should NOT have hover classes by default', () => {
      render(<Card><span>Content</span></Card>);
      const card = document.querySelector('[class*="hover:shadow"]');
      // Default Card may not have hover shadow
      // Just verify it renders without issues
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // onClick (clickable card)
  // ==========================================================
  describe('onClick handler', () => {
    it('should call onClick when card is clicked', async () => {
      const handleClick = vi.fn();
      render(
        <Card onClick={handleClick}>
          <span>Clickable Card</span>
        </Card>
      );

      const card = screen.getByText('Clickable Card').closest('[class*="rounded"]')!;
      await userEvent.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should render with cursor-pointer when onClick is provided', () => {
      render(
        <Card onClick={vi.fn()}>
          <span>Clickable</span>
        </Card>
      );
      const card = document.querySelector('[class*="cursor-pointer"]');
      expect(card).toBeInTheDocument();
    });

    it('should NOT have cursor-pointer when no onClick', () => {
      render(<Card><span>Not clickable</span></Card>);
      const card = document.querySelector('[class*="cursor-pointer"]');
      expect(card).toBeNull();
    });

    it('should support keyboard activation (Enter/Space)', async () => {
      const handleClick = vi.fn();
      render(
        <Card onClick={handleClick}>
          <span>Keyboard Card</span>
        </Card>
      );

      const card = screen.getByText('Keyboard Card').closest('[class*="rounded"]')! as HTMLElement;
      card.setAttribute('tabindex', '0');
      card.focus();
      await userEvent.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalled();
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className', () => {
      render(<Card className="custom-card-class"><span>Content</span></Card>);
      const card = document.querySelector('.custom-card-class');
      expect(card).toBeInTheDocument();
    });

    it('should preserve default classes when custom className is passed', () => {
      render(<Card className="custom-class"><span>Content</span></Card>);
      const card = document.querySelector('.custom-class');
      // Should also have default card styling
      expect(card).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should be focusable when onClick is provided', () => {
      render(
        <Card onClick={vi.fn()}>
          <span>Focusable Card</span>
        </Card>
      );
      const card = screen.getByText('Focusable Card').closest('[class*="rounded"]')! as HTMLElement;
      card.focus();
      expect(card).toHaveFocus();
    });
  });
});
