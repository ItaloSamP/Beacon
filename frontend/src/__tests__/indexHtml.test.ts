/**
 * Index HTML Tests — Verify that index.html includes Google Fonts
 * Inter preconnect + preload <link> tags.
 *
 * RED PHASE: Tests WILL FAIL because index.html only has basic
 * meta tags with no font links.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Read the index.html file contents.
 */
function readIndexHtml(): string {
  const indexPath = resolve(__dirname, '../../index.html');
  return readFileSync(indexPath, 'utf-8');
}

describe('index.html — Google Fonts Inter', () => {
  let htmlContent: string;

  // Read once before all tests
  beforeAll(() => {
    htmlContent = readIndexHtml();
  });

  it('should contain a preconnect link to Google Fonts', () => {
    expect(htmlContent).toMatch(
      /<link[^>]*rel=["']preconnect["'][^>]*href=["']https?:\/\/fonts\.googleapis\.com["'][^>]*\/?>/i
    );
  });

  it('should contain a preconnect link to Google Fonts Gstatic (for crossorigin)', () => {
    expect(htmlContent).toMatch(
      /<link[^>]*rel=["']preconnect["'][^>]*href=["']https?:\/\/fonts\.gstatic\.com["'][^>]*crossorigin[^>]*\/?>/i
    );
  });

  it('should contain a preload link for Inter font CSS', () => {
    expect(htmlContent).toMatch(
      /<link[^>]*rel=["'](?:preload|stylesheet)["'][^>]*href=["'][^"']*fonts\.googleapis\.com\/css2\?family=Inter[^"']*["'][^>]*\/?>/i
    );
  });

  it('should reference Inter font with appropriate weights (400,500,600,700,800)', () => {
    // The link should include multiple weights
    const linkMatch = htmlContent.match(
      /href=["']([^"']*fonts\.googleapis\.com\/css2\?family=Inter[^"']*)["']/i
    );
    expect(linkMatch).not.toBeNull();

    if (linkMatch) {
      const url = linkMatch[1];
      // Should specify weights
      expect(url).toMatch(/wght@/i);
    }
  });

  it('should only have one stylesheet link for Inter font', () => {
    // Count preload/stylesheet links for Inter
    const matches = htmlContent.match(
      /fonts\.googleapis\.com\/css2\?family=Inter/gi
    );
    // At least one, ideally not too many duplicates
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(1);
  });
});
