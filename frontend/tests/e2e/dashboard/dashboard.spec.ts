import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Log in via API and set tokens before each test
    const email = `e2e-dash-${Date.now()}@beacon.test`;
    const password = 'DashPass123!';

    await page.request.post('http://localhost:8000/api/v1/auth/register', {
      data: { email, password, name: 'Dashboard User' },
    });

    const loginRes = await page.request.post('http://localhost:8000/api/v1/auth/login', {
      data: { email, password },
    });
    const body = await loginRes.json();

    if (body.data) {
      await page.goto('/');
      await page.evaluate(
        ({ access, refresh, u }) => {
          localStorage.setItem('access_token', access);
          localStorage.setItem('refresh_token', refresh);
          localStorage.setItem('beacon_user', JSON.stringify(u));
        },
        {
          access: body.data.access_token,
          refresh: body.data.refresh_token,
          u: body.data.user,
        },
      );
    }
  });

  test('dashboard renders with health cards and feed', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Dashboard testid should be visible
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15000 });

    // Should contain health indicator section
    const healthSection = page.locator('section[aria-label="Health indicator"]');
    await expect(healthSection).toBeVisible({ timeout: 10000 });

    // Should contain Data Sources section
    await expect(page.locator('#ds-heading')).toBeVisible({ timeout: 5000 });

    // Should contain Recent Activity section
    await expect(page.locator('#feed-heading')).toBeVisible({ timeout: 5000 });
  });

  test('sidebar navigation switches pages', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for sidebar
    const sidebar = page.locator('nav[aria-label="Main navigation"]');
    await expect(sidebar).toBeVisible();

    // Click Agents in sidebar
    await sidebar.locator('a', { hasText: 'Agents' }).click();
    await page.waitForURL(/\/agents/);
    await expect(page).toHaveURL(/\/agents/);

    // Click DataSources in sidebar
    await sidebar.locator('a', { hasText: 'DataSources' }).click();
    await page.waitForURL(/\/datasources/);
    await expect(page).toHaveURL(/\/datasources/);

    // Click Pipelines in sidebar
    await sidebar.locator('a', { hasText: 'Pipelines' }).click();
    await page.waitForURL(/\/pipelines/);
    await expect(page).toHaveURL(/\/pipelines/);

    // Click Anomalies in sidebar
    await sidebar.locator('a', { hasText: 'Anomalies' }).click();
    await page.waitForURL(/\/anomalies/);
    await expect(page).toHaveURL(/\/anomalies/);
  });

  test('logout redirects to landing', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click logout button (aria-label="Sair")
    const logoutBtn = page.locator('button[aria-label="Sair"]');
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
    await logoutBtn.click();

    // Should redirect to landing page (/) — which may redirect to /login
    await page.waitForURL(/\//, { timeout: 10000 });

    // Tokens should be cleared
    const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(accessToken).toBeNull();
  });
});
