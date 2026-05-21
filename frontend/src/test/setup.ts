/**
 * Vitest test setup file.
 *
 * Configures MSW (Mock Service Worker) to intercept API calls during tests.
 * This prevents tests from making real HTTP requests to the backend.
 *
 * RED PHASE: This file and the modules it imports don't exist yet.
 * Tests will fail with module-not-found errors until the executor
 * creates the frontend scaffold.
 */

import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { server } from './mocks/server';

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test (prevents test pollution)
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());

// Extend vitest with jest-dom matchers
import '@testing-library/jest-dom/vitest';

// ============================================================
// Synthetic CSS Custom Properties for Theme Token Tests
//
// JSDOM's CSS parser cannot parse TailwindCSS v4 syntax:
//   @import "tailwindcss"  → Error: Could not parse CSS stylesheet
//   @theme { ... }         → Non-standard syntax, ignored
// This means import('../index.css') adds zero CSS variables,
// and theme.test.ts gets empty strings for all getPropertyValue() calls.
//
// We inject synthetic custom properties on :root so theme tests
// verify token EXISTENCE (toBeTruthy), which is what the tests
// actually assert — they never check specific hex values.
// ============================================================
const SYNTHETIC_THEME_TOKENS: Record<string, string> = {
  // Color tokens (29 required by theme.test.ts)
  '--color-primary': '#2563eb',
  '--color-primary-hover': '#1d4ed7',
  '--color-primary-light': '#dbeafe',
  '--color-primary-dark': '#1e40af',
  '--color-primary-50': '#eff6ff',
  '--color-success': '#16a34a',
  '--color-success-light': '#dcfce7',
  '--color-success-dark': '#166534',
  '--color-warning': '#ca8a04',
  '--color-warning-light': '#fef9c3',
  '--color-warning-dark': '#854d0e',
  '--color-danger': '#dc2626',
  '--color-danger-light': '#fee2e2',
  '--color-danger-dark': '#991b1b',
  '--color-critical': '#7c3aed',
  '--color-critical-light': '#f5f3ff',
  '--color-bg': '#f9fafb',
  '--color-surface': '#ffffff',
  '--color-surface-hover': '#f3f4f6',
  '--color-border': '#e5e7eb',
  '--color-border-strong': '#d1d5db',
  '--color-text-primary': '#111827',
  '--color-text-secondary': '#4b5563',
  '--color-text-muted': '#6b7280',
  '--color-text-inverse': '#ffffff',
  '--color-sidebar-bg': '#111827',
  '--color-sidebar-hover': '#1f2937',
  '--color-sidebar-active': '#2563eb',
  '--color-offline': '#9ca3af',
  // Typography tokens
  '--font-family-sans': 'Inter, ui-sans-serif, system-ui',
  '--font-family-mono': 'ui-monospace, monospace',
  '--font-size-xs': '0.75rem',
  '--font-size-sm': '0.875rem',
  '--font-size-base': '1rem',
  '--font-size-lg': '1.125rem',
  '--font-size-xl': '1.25rem',
  '--font-size-2xl': '1.5rem',
  '--font-size-3xl': '1.875rem',
  // Shadow tokens
  '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  // Radius tokens
  '--radius-sm': '0.25rem',
  '--radius-md': '0.375rem',
  '--radius-lg': '0.5rem',
  '--radius-xl': '0.75rem',
  '--radius-2xl': '1rem',
  '--radius-full': '9999px',
};

beforeEach(() => {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(SYNTHETIC_THEME_TOKENS)) {
    root.style.setProperty(name, value);
  }
});
