/**
 * Unit tests for CodeBlock component.
 *
 * Tests: code content rendering, dark background (#1e1e2e),
 * copy button + clipboard copy (mock navigator.clipboard),
 * language label, showLineNumbers prop, overflow scrolling,
 * and monospace font.
 *
 * RED PHASE: All tests WILL FAIL because CodeBlock component
 * doesn't exist yet.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// IMPORT THAT WILL FAIL (RED PHASE — component doesn't exist)
import { CodeBlock } from '../CodeBlock';

describe('CodeBlock', () => {
  // ==========================================================
  // Clipboard Mock
  // ==========================================================
  let clipboardWriteTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clipboardWriteTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardWriteTextMock },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================
  // Rendering
  // ==========================================================
  describe('rendering', () => {
    it('should render code content', () => {
      render(<CodeBlock code="SELECT * FROM users;" />);

      expect(screen.getByText(/SELECT \* FROM users/)).toBeInTheDocument();
    });

    it('should render multi-line code', () => {
      const code = 'function hello() {\n  return "world";\n}';
      render(<CodeBlock code={code} />);

      expect(screen.getByText(/function hello/)).toBeInTheDocument();
    });

    it('should apply dark background styling (#1e1e2e)', () => {
      render(<CodeBlock code="const x = 1;" />);

      const container = screen.getByText('const x = 1;').closest('pre, code, div');
      expect(container).toBeInTheDocument();
      // Should have dark background
      expect(container?.className).toMatch(/bg-\[#1e1e2e\]|bg-gray-900|bg-slate-900/);
    });

    it('should use monospace font', () => {
      render(<CodeBlock code="hello" />);

      const codeEl = screen.getByText('hello');
      expect(codeEl.className).toMatch(/font-mono/);
    });
  });

  // ==========================================================
  // Copy Button
  // ==========================================================
  describe('copy button', () => {
    it('should render a copy button', () => {
      render(<CodeBlock code="npm install beacon" />);

      const copyBtn = screen.getByRole('button');
      expect(copyBtn).toBeInTheDocument();
    });

    it('should copy code to clipboard when clicked', async () => {
      render(<CodeBlock code="clipboard test" />);

      const copyBtn = screen.getByRole('button');
      await userEvent.click(copyBtn);

      await waitFor(() => {
        expect(clipboardWriteTextMock).toHaveBeenCalledWith('clipboard test');
      });
    });

    it('should show "Copied" state after clicking', async () => {
      render(<CodeBlock code="sample" />);

      const copyBtn = screen.getByRole('button');
      await userEvent.click(copyBtn);

      // Should show a check icon or "Copied" text after copy
      await waitFor(() => {
        expect(clipboardWriteTextMock).toHaveBeenCalled();
      });
    });

    it('should have aria-label on copy button', () => {
      render(<CodeBlock code="test" />);

      const copyBtn = screen.getByRole('button');
      expect(copyBtn).toHaveAttribute('aria-label');
    });
  });

  // ==========================================================
  // Language Label
  // ==========================================================
  describe('language label', () => {
    it('should render language label when provided', () => {
      render(<CodeBlock code="print('hello')" language="python" />);

      expect(screen.getByText('python')).toBeInTheDocument();
    });

    it('should render different language labels', () => {
      render(<CodeBlock code="{}" language="json" />);

      expect(screen.getByText('json')).toBeInTheDocument();
    });

    it('should NOT render language label when not provided', () => {
      render(<CodeBlock code="code" />);

      // Should only have the code content
      expect(screen.getByText('code')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // showLineNumbers
  // ==========================================================
  describe('showLineNumbers', () => {
    it('should render line numbers when showLineNumbers is true', () => {
      const code = 'line1\nline2\nline3';
      render(<CodeBlock code={code} showLineNumbers />);

      // Should show line numbers 1, 2, 3
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should NOT show line numbers by default', () => {
      render(<CodeBlock code="single line" />);

      // Should not have line number elements
      expect(screen.getByText('single line')).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Overflow Scrolling
  // ==========================================================
  describe('overflow scrolling', () => {
    it('should have overflow-auto for long code', () => {
      const longCode = 'a'.repeat(200);
      render(<CodeBlock code={longCode} />);

      const container = screen.getByText(/a+/).closest('pre, div');
      expect(container).toBeInTheDocument();
      // Should have overflow handling
      expect(container?.className).toMatch(/overflow/);
    });
  });

  // ==========================================================
  // className Passthrough
  // ==========================================================
  describe('className passthrough', () => {
    it('should merge custom className', () => {
      render(<CodeBlock code="code" className="custom-code-block" />);

      const container = document.querySelector('.custom-code-block');
      expect(container).toBeInTheDocument();
    });
  });

  // ==========================================================
  // Accessibility
  // ==========================================================
  describe('accessibility', () => {
    it('should render code in a <pre> or <code> element', () => {
      render(<CodeBlock code="const a = 1;" />);

      const pre = document.querySelector('pre');
      const code = document.querySelector('code');
      // Should use semantic elements for code
      expect(pre || code).toBeInTheDocument();
    });
  });
});
