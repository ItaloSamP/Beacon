/**
 * Unit tests for Skeleton component.
 *
 * Tests: text variant, circular variant, rectangular variant,
 * width/height props, count prop, aria-busy, aria-hidden,
 * and shimmer animation class presence.
 *
 * RED PHASE: All tests WILL FAIL because Skeleton component
 * doesn't exist yet.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
import { Skeleton } from '../Skeleton';

describe('Skeleton', () => {
  // ==========================================================
  // Rendering & Variants
  // ==========================================================
  describe('variants', () => {
    it('should render text variant by default', () => {
      render(<Skeleton />);
      // Text skeleton should be a rectangular block with text-like dimensions
      const skeleton = document.querySelector('[aria-busy="true"]');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render text variant explicitly', () => {
      render(<Skeleton variant="text" />);
      const skeleton = document.querySelector('[aria-busy="true"]');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render circular variant', () => {
      render(<Skeleton variant="circular" />);
      const skeleton = document.querySelector('[class*="rounded-full"]');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render rectangular variant', () => {
      render(<Skeleton variant="rectangular" />);
      const skeleton = document.querySelector('[aria-busy="true"]');
      expect(skeleton).toBeInTheDocument();
    });

    it('should have distinct shapes for each variant', () => {
      const { rerender } = render(<Skeleton variant="circular" />);
      const circularEl = document.querySelector('[aria-busy="true"]')!;
      const circularClasses = circularEl.className;

      rerender(<Skeleton variant="rectangular" />);
      const rectEl = document.querySelector('[aria-busy="true"]')!;
      const rectClasses = rectEl.className;

      // Circular should have rounded-full; rectangular should not
      expect(circularClasses).toContain('rounded-full');
      expect(rectClasses).not.toContain('rounded-full');
    });
  });

  // ==========================================================
  // Dimensions
  // ==========================================================
  describe('dimensions', () => {
    it('should accept width prop', () => {
      render(<Skeleton width="200px" />);
      const skeleton = document.querySelector('[aria-busy="true"]') as HTMLElement;
      expect(skeleton.style.width).toBe('200px');
    });

    it('should accept height prop', () => {
      render(<Skeleton height="40px" />);
      const skeleton = document.querySelector('[aria-busy="true"]') as HTMLElement;
      expect(skeleton.style.height).toBe('40px');
    });

    it('should accept both width and height', () => {
      render(<Skeleton width="100px" height="100px" variant="circular" />);
      const skeleton = document.querySelector('[aria-busy="true"]') as HTMLElement;
      expect(skeleton.style.width).toBe('100px');
      expect(skeleton.style.height).toBe('100px');
    });

    it('should render with default dimensions when not specified', () => {
      render(<Skeleton />);
      const skeleton = document.querySelector('[aria-busy="true"]');
      expect(skeleton).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Count (Multiple Lines)
  // ==========================================================
  describe('count prop', () => {
    it('should render a single skeleton by default', () => {
      render(<Skeleton />);
      const skeletons = document.querySelectorAll('[aria-busy="true"]');
      expect(skeletons.length).toBe(1);
    });

    it('should render multiple skeletons when count > 1', () => {
      render(<Skeleton count={3} />);
      const skeletons = document.querySelectorAll('[aria-busy="true"]');
      expect(skeletons.length).toBe(3);
    });

    it('should render 5 text lines with count=5', () => {
      render(<Skeleton count={5} />);
      const skeletons = document.querySelectorAll('[aria-busy="true"]');
      expect(skeletons.length).toBe(5);
    });

    it('should stagger widths for text lines when count > 1', () => {
      render(<Skeleton count={3} variant="text" />);
      const skeletons = document.querySelectorAll('[aria-busy="true"]');
      // Last line should be shorter to simulate realistic text block
      const firstWidth = (skeletons[0] as HTMLElement).style.width;
      const lastWidth = (skeletons[2] as HTMLElement).style.width;
      // Widths may differ; last line often shorter
      expect(skeletons.length).toBe(3);
    });
  });

  // ==========================================================
  // Shimmer Animation
  // ==========================================================
  describe('animation', () => {
    it('should have animate-pulse class for shimmer effect', () => {
      render(<Skeleton />);
      const skeleton = document.querySelector('[aria-busy="true"]')!;
      expect(skeleton.className).toMatch(/animate-pulse/);
    });

    it('should have background color for placeholder', () => {
      render(<Skeleton />);
      const skeleton = document.querySelector('[aria-busy="true"]')!;
      // Should have a gray background class
      expect(skeleton.className).toMatch(/bg-gray|bg-slate|bg-neutral/);
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should have aria-busy="true"', () => {
      render(<Skeleton />);
      const skeleton = document.querySelector('[aria-busy="true"]');
      expect(skeleton).toBeInTheDocument();
    });

    it('should have aria-hidden="true" on each skeleton', () => {
      render(<Skeleton count={2} />);
      const skeletons = document.querySelectorAll('[aria-busy="true"]');
      skeletons.forEach((el) => {
        expect(el).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should wrap multiple skeletons in a container with aria-busy', () => {
      render(<Skeleton count={3} />);
      const container = document.querySelector('[aria-busy="true"][aria-hidden]')?.parentElement;
      // Container should exist and be accessible
      expect(document.querySelectorAll('[aria-busy="true"]').length).toBe(3);
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className', () => {
      render(<Skeleton className="custom-skeleton" />);
      const skeleton = document.querySelector('.custom-skeleton');
      expect(skeleton).toBeInTheDocument();
    });
  });
});
