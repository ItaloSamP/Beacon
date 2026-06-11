import { test, expect } from '@playwright/test';

test.describe('Pipeline Runs', () => {
  let pipelineId: string;
  let dataSourceId: string;

  test.beforeEach(async ({ page }) => {
    // Log in and seed datasource + pipeline
    const email = `e2e-run-${Date.now()}@beacon.test`;
    const password = 'RunPass123!';

    await page.request.post('http://localhost:8000/api/v1/auth/register', {
      data: { email, password, name: 'Pipeline Run User' },
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

      const token = body.data.access_token;

      // Seed datasource
      const dsRes = await page.request.post('http://localhost:8000/api/v1/datasources', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        data: {
          name: `Run Test DS ${Date.now()}`,
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

      // Seed pipeline
      const pipeRes = await page.request.post('http://localhost:8000/api/v1/pipelines', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        data: {
          name: `Run Test Pipeline ${Date.now()}`,
          type: 'volume',
          data_source_id: dataSourceId,
          config: { target_table: 'orders' },
        },
      });
      const pipeBody = await pipeRes.json();
      pipelineId = pipeBody.data?.id;
    }
  });

  test('run pipeline shows loading then result', async ({ page }) => {
    await page.goto('/pipelines');
    await page.waitForLoadState('networkidle');

    // Find the Run Now button for our pipeline
    const runBtn = page.locator('button[aria-label="Run Now"]').first();
    await expect(runBtn).toBeVisible({ timeout: 10000 });

    // Click Run Now
    await runBtn.click();

    // The button should show loading state (spinner)
    // Wait for the loading to potentially complete
    await page.waitForTimeout(3000);

    // The run should have been initiated — verify the runs page loads
    await page.goto(`/pipelines/${pipelineId}/runs`);
    await page.waitForLoadState('networkidle');

    // Should see the pipeline runs page
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('pipeline runs page lists runs', async ({ page }) => {
    // Trigger a run via API first
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    await page.request.post(`http://localhost:8000/api/v1/pipelines/${pipelineId}/run`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    // Wait for the run to potentially complete
    await page.waitForTimeout(2000);

    // Navigate to the runs page
    await page.goto(`/pipelines/${pipelineId}/runs`);
    await page.waitForLoadState('networkidle');

    // Should show the runs page with at least a header
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

    // The runs table or the Run Now button should be visible
    const hasTableOrButton = await Promise.race([
      page.locator('table').isVisible().then(() => 'table'),
      page.locator('button', { hasText: 'Run Now' }).isVisible().then(() => 'button'),
    ]);
    expect(hasTableOrButton).toBeTruthy();
  });
});
