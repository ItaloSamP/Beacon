import { test as base, expect } from '@playwright/test';

const API_BASE = process.env.VITE_BACKEND_URL || 'http://localhost:8000/api/v1';

export interface AuthFixtures {
  authenticatedPage: void;
}

/**
 * Auth fixture that logs in via the API and sets the auth token
 * in localStorage before each test that depends on authentication.
 *
 * Usage:
 *   import { test } from '../fixtures/auth.fixture';
 *   test('my test', async ({ page }) => { ... });
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: [
    async ({ page }, use) => {
      // Register a test user first (idempotent — ignore if already exists)
      const email = `e2e-${Date.now()}@beacon-e2e.dev`;
      const password = 'E2eTestPass123!';

      let registerResponse = await page.request.post(`${API_BASE}/auth/register`, {
        data: { email, password, name: 'E2E Test User' },
      });

      // If user already exists, log in instead
      if (registerResponse.status() === 409) {
        registerResponse = await page.request.post(`${API_BASE}/auth/login`, {
          data: { email, password },
        });
      }

      // For new registrations, the response includes tokens
      if (registerResponse.ok()) {
        const body = await registerResponse.json();
        if (body.data) {
          const { access_token, refresh_token, user } = body.data;

          // Set tokens and user in localStorage (matching useAuth.tsx)
          await page.goto('/');
          await page.evaluate(
            ({ access, refresh, u }) => {
              localStorage.setItem('access_token', access);
              localStorage.setItem('refresh_token', refresh);
              localStorage.setItem('beacon_user', JSON.stringify(u));
            },
            {
              access: access_token,
              refresh: refresh_token,
              u: user,
            },
          );
        }
      } else {
        // Fallback: try login
        const loginResponse = await page.request.post(`${API_BASE}/auth/login`, {
          data: { email, password },
        });
        if (loginResponse.ok()) {
          const body = await loginResponse.json();
          if (body.data) {
            const { access_token, refresh_token, user } = body.data;
            await page.goto('/');
            await page.evaluate(
              ({ access, refresh, u }) => {
                localStorage.setItem('access_token', access);
                localStorage.setItem('refresh_token', refresh);
                localStorage.setItem('beacon_user', JSON.stringify(u));
              },
              {
                access: access_token,
                refresh: refresh_token,
                u: user,
              },
            );
          }
        }
      }

      await use();
    },
    { auto: false },
  ],
});

export { expect };
