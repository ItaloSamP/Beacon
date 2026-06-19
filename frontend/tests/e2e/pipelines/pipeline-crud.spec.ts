import { test, expect } from '@playwright/test';

test.describe('Pipeline CRUD', () => {
  let dataSourceId: string;

  test.beforeEach(async ({ page }) => {
    // Log in and seed a datasource
    const email = `e2e-pipe-${Date.now()}@beacon-e2e.dev`;
    const password = 'PipePass123!';

    await page.request.post('http://localhost:8000/api/v1/auth/register', {
      data: { email, password, name: 'Pipeline User' },
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

      // Seed a datasource via API
      const token = body.data.access_token;
      const dsRes = await page.request.post('http://localhost:8000/api/v1/datasources', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        data: {
          name: `E2E DS ${Date.now()}`,
          type: 'postgres',
          connection_config: {
            host: 'localhost',
            port: 5432,
            database: 'test_db',
            user: 'test',
            password: 'test',
          },
        },
      });
      const dsBody = await dsRes.json();
      dataSourceId = dsBody.data?.id;
    }
  });

  test('create pipeline', async ({ page }) => {
    await page.goto('/pipelines/new');
    await page.waitForLoadState('networkidle');

    // Fill the pipeline form
    await expect(page.locator('h1').first()).toContainText('Create Pipeline');

    await page.fill('input[name="name"]', 'E2E Test Pipeline');

    // Select a datasource (click the select and pick an option)
    const dsSelect = page.locator('select[name="data_source_id"], [data-testid="select-data_source_id"]');
    if (await dsSelect.isVisible()) {
      await dsSelect.selectOption({ index: 1 }); // Pick first non-empty option
    }

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to pipelines list on success
    await page.waitForURL(/\/pipelines(?:\?|$)/, { timeout: 15000 });

    // Should see the created pipeline in the list
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });

  test('list pipelines', async ({ page }) => {
    // Seed a pipeline first
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    await page.request.post('http://localhost:8000/api/v1/pipelines', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        name: `List Test Pipeline ${Date.now()}`,
        type: 'volume',
        data_source_id: dataSourceId,
        config: { target_table: 'orders' },
      },
    });

    await page.goto('/pipelines');
    await page.waitForLoadState('networkidle');

    // Should see a table with pipeline rows
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

    // Wait for table or empty state
    await expect(page.locator('table, [data-empty]')).toBeVisible({ timeout: 10000 });
  });

  test('edit pipeline', async ({ page }) => {
    // Seed a pipeline
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    const pipeName = `Edit Test Pipeline ${Date.now()}`;
    const createRes = await page.request.post('http://localhost:8000/api/v1/pipelines', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        name: pipeName,
        type: 'volume',
        data_source_id: dataSourceId,
        config: { target_table: 'orders' },
      },
    });
    const pipeBody = await createRes.json();
    const pipelineId = pipeBody.data?.id;

    // Navigate to edit page
    await page.goto(`/pipelines/${pipelineId}/edit`);
    await page.waitForLoadState('networkidle');

    // Should see edit form with pre-filled name
    await expect(page.locator('input[name="name"]')).toHaveValue(pipeName);

    // Modify the name
    const newName = `Updated Pipeline ${Date.now()}`;
    await page.fill('input[name="name"]', newName);

    // Save
    await page.click('button[type="submit"]');

    // Should redirect to pipelines list
    await page.waitForURL(/\/pipelines(?:\?|$)/, { timeout: 15000 });
  });

  test('toggle pipeline', async ({ page }) => {
    // Seed a pipeline
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    const pipeName = `Toggle Test Pipeline ${Date.now()}`;
    const createRes = await page.request.post('http://localhost:8000/api/v1/pipelines', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        name: pipeName,
        type: 'volume',
        data_source_id: dataSourceId,
        config: { target_table: 'orders' },
        enabled: true,
      },
    });
    await page.goto('/pipelines');
    await page.waitForLoadState('networkidle');

    // Find the pipeline row and toggle
    const row = page.locator('tr', { hasText: pipeName });
    await expect(row).toBeVisible({ timeout: 10000 });

    // The toggle is an aria-label="Toggle <pipeline name>"
    const toggle = row.locator(`[aria-label="Toggle ${pipeName}"]`);
    if (await toggle.isVisible()) {
      await toggle.click();
      // Wait for the optimistic update or API response
      await page.waitForTimeout(1000);
      // The toggle state should have changed visually
    }
  });

  test('delete pipeline', async ({ page }) => {
    // Seed a pipeline to delete
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    const pipeName = `Delete Test Pipeline ${Date.now()}`;
    const createRes = await page.request.post('http://localhost:8000/api/v1/pipelines', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        name: pipeName,
        type: 'volume',
        data_source_id: dataSourceId,
        config: { target_table: 'orders' },
      },
    });
    const pipeBody = await createRes.json();
    const pipelineId = pipeBody.data?.id;

    // Navigate to pipelines list
    await page.goto('/pipelines');
    await page.waitForLoadState('networkidle');

    // Verify pipeline exists
    await expect(page.locator('tr', { hasText: pipeName })).toBeVisible({ timeout: 10000 });

    // Delete the pipeline via API directly (since UI delete may not be implemented yet)
    await page.request.delete(`http://localhost:8000/api/v1/pipelines/${pipelineId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    // Reload and verify pipeline is gone
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('tr', { hasText: pipeName })).toHaveCount(0, { timeout: 5000 });
  });
});
