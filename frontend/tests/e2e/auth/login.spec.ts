import { test, expect } from '@playwright/test';

test.describe('Auth — Login', () => {
  test('renders login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Should see the Beacon branding
    await expect(page.locator('h1')).toContainText('Beacon');

    // Should have email and password inputs
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // Should have sign in button
    await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill valid credentials (seeded via API by auth fixture or direct call)
    const email = `e2e-login-${Date.now()}@beacon-e2e.dev`;
    const password = 'ValidPass123!';

    // Register the user first via API
    const regRes = await page.request.post('http://localhost:8000/api/v1/auth/register', {
      data: { email, password, name: 'Login Test User' },
    });
    expect(regRes.ok(), `Registration failed: ${await regRes.text()}`).toBeTruthy();

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard (via HomePage → Navigate to /dashboard)
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);

    // Dashboard should be loaded
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
  });

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill invalid credentials
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'WrongPass123!');
    await page.click('button[type="submit"]');

    // Should show error message (role="alert")
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
    const alertText = await page.locator('[role="alert"]').textContent();
    expect(alertText).toBeTruthy();

    // Should NOT have navigated away from login page
    await expect(page).toHaveURL(/\/login/);
  });
});
