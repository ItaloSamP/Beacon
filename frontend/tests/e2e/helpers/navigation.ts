import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Navigate to a path and wait for the page to be fully loaded.
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

/**
 * Click a sidebar navigation item by its label text.
 * Note: the Sidebar component uses NavLink with a span for the label.
 */
export async function clickSidebarItem(page: Page, label: string): Promise<void> {
  const sidebar = page.locator('nav[aria-label="Main navigation"]');
  // The NavLink renders as an <a> tag containing the label text
  const link = sidebar.locator('a', { hasText: label });
  await link.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Assert that the page heading (h1 or h2) contains the given title.
 */
export async function expectPageTitle(page: Page, title: string): Promise<void> {
  const heading = page.locator('h1').first();
  await expect(heading).toBeVisible();
  await expect(heading).toContainText(title);
}

/**
 * Click the logout button in the sidebar.
 */
export async function logout(page: Page): Promise<void> {
  const logoutButton = page.locator('button[aria-label="Sair"]');
  await logoutButton.click();
  await page.waitForLoadState('networkidle');
}
