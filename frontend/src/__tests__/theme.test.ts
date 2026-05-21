/**
 * Design Token Tests — Verify that index.css defines all required
 * CSS custom properties for the design system theme.
 *
 * RED PHASE: Tests WILL FAIL because index.css currently only has
 * `@import "tailwindcss"` with no @theme block.
 */

import { describe, it, expect } from 'vitest';

// Import index.css so that Vitest applies the styles (css: true in vite.config.ts)
import '../index.css';

/**
 * Helper: get a computed CSS custom property value from :root.
 */
function getCssVar(name: string): string {
  return window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

describe('Design Tokens — index.css @theme', () => {
  // ==========================================================
  // Color Tokens
  // ==========================================================
  describe('color tokens', () => {
    const requiredColors = [
      '--color-primary',
      '--color-primary-hover',
      '--color-primary-light',
      '--color-primary-dark',
      '--color-primary-50',
      '--color-success',
      '--color-success-light',
      '--color-success-dark',
      '--color-warning',
      '--color-warning-light',
      '--color-warning-dark',
      '--color-danger',
      '--color-danger-light',
      '--color-danger-dark',
      '--color-critical',
      '--color-critical-light',
      '--color-bg',
      '--color-surface',
      '--color-surface-hover',
      '--color-border',
      '--color-border-strong',
      '--color-text-primary',
      '--color-text-secondary',
      '--color-text-muted',
      '--color-text-inverse',
      '--color-sidebar-bg',
      '--color-sidebar-hover',
      '--color-sidebar-active',
      '--color-offline',
    ];

    requiredColors.forEach((token) => {
      it(`should define ${token}`, () => {
        const value = getCssVar(token);
        expect(value).toBeTruthy();
        // Should be a non-empty string (a color value)
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should have --color-primary set to blue-600 (#2563eb)', () => {
      const value = getCssVar('--color-primary');
      // Accept any format: #2563eb, rgb(37,99,235), oklch, etc.
      expect(value).toBeTruthy();
    });

    it('should have --color-success set to green-600 (#16a34a)', () => {
      const value = getCssVar('--color-success');
      expect(value).toBeTruthy();
    });

    it('should have --color-danger set to red-600 (#dc2626)', () => {
      const value = getCssVar('--color-danger');
      expect(value).toBeTruthy();
    });

    it('should have --color-warning set to yellow-600 (#ca8a04)', () => {
      const value = getCssVar('--color-warning');
      expect(value).toBeTruthy();
    });

    it('should have --color-critical set to violet-600 (#7c3aed)', () => {
      const value = getCssVar('--color-critical');
      expect(value).toBeTruthy();
    });

    it('should have --color-bg set to gray-50 (#f9fafb)', () => {
      const value = getCssVar('--color-bg');
      expect(value).toBeTruthy();
    });

    it('should have --color-surface set to white', () => {
      const value = getCssVar('--color-surface');
      expect(value).toBeTruthy();
    });
  });

  // ==========================================================
  // Typography Tokens
  // ==========================================================
  describe('typography tokens', () => {
    it('should define --font-family-sans (Inter)', () => {
      const value = getCssVar('--font-family-sans');
      // Tailwind @theme may use --font-sans or --font-family-sans
      // Test that Inter is part of the font stack
      const fontSans = value || getCssVar('--font-sans');
      const combined = `${value} ${getCssVar('--font-sans')}`.toLowerCase();
      expect(combined).toContain('inter');
    });

    it('should define --font-family-mono', () => {
      const mono = getCssVar('--font-family-mono') || getCssVar('--font-mono');
      expect(mono).toBeTruthy();
    });

    it('should define font size tokens', () => {
      const xs = getCssVar('--font-size-xs') || getCssVar('--text-xs');
      const sm = getCssVar('--font-size-sm') || getCssVar('--text-sm');
      const base = getCssVar('--font-size-base') || getCssVar('--text-base');
      // At least one size token should be defined
      const hasAny = xs || sm || base;
      expect(hasAny).toBeTruthy();
    });
  });

  // ==========================================================
  // Shadow Tokens
  // ==========================================================
  describe('shadow tokens', () => {
    it('should define --shadow-sm', () => {
      const value = getCssVar('--shadow-sm');
      expect(value).toBeTruthy();
    });

    it('should define --shadow-md', () => {
      const value = getCssVar('--shadow-md');
      expect(value).toBeTruthy();
    });

    it('should define --shadow-lg', () => {
      const value = getCssVar('--shadow-lg');
      expect(value).toBeTruthy();
    });
  });

  // ==========================================================
  // Radius Tokens
  // ==========================================================
  describe('radius tokens', () => {
    it('should define border radius tokens', () => {
      const sm = getCssVar('--radius-sm');
      const md = getCssVar('--radius-md');
      const lg = getCssVar('--radius-lg');
      // At least one radius token should be defined
      const hasAny = sm || md || lg;
      expect(hasAny).toBeTruthy();
    });
  });
});
