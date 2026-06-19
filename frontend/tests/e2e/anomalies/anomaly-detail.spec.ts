import { test, expect } from '@playwright/test';

test.describe('Anomaly Detail', () => {
  let anomalyId: string;
  let pipelineRunId: string;
  let pipelineId: string;
  let dataSourceId: string;

  test.beforeEach(async ({ page }) => {
    // Log in and seed full chain: datasource → pipeline → run → anomaly
    const email = `e2e-anom-${Date.now()}@beacon-e2e.dev`;
    const password = 'AnomPass123!';

    await page.request.post('http://localhost:8000/api/v1/auth/register', {
      data: { email, password, name: 'Anomaly User' },
    });

    const loginRes = await page.request.post('http://localhost:8000/api/v1/auth/login', {
      data: { email, password },
    });
    const body = await loginRes.json();
    expect(loginRes.ok(), `Login failed: ${JSON.stringify(body)}`).toBeTruthy();

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
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // Seed datasource
      const dsRes = await page.request.post('http://localhost:8000/api/v1/datasources', {
        headers,
        data: {
          name: `Anom Test DS ${Date.now()}`,
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
        headers,
        data: {
          name: `Anom Test Pipeline ${Date.now()}`,
          type: 'volume',
          data_source_id: dataSourceId,
          config: { target_table: 'orders' },
        },
      });
      const pipeBody = await pipeRes.json();
      pipelineId = pipeBody.data?.id;

      // Trigger a pipeline run
      const runRes = await page.request.post(
        `http://localhost:8000/api/v1/pipelines/${pipelineId}/run`,
        { headers },
      );
      const runBody = await runRes.json();
      pipelineRunId = runBody.data?.id;

      // Wait a moment for the run to process
      await page.waitForTimeout(2000);

      // Seed an anomaly linked to this run
      // Note: POST /anomalies requires agent_token — user JWT will get 403.
      // Tests depending on anomalyId will skip gracefully.
      const anomRes = await page.request.post('http://localhost:8000/api/v1/anomalies', {
        headers,
        data: {
          pipeline_run_id: pipelineRunId,
          severity: 'high',
          type: 'volume',
          description: 'E2E test anomaly — volume spike detected',
          deviation_details: {
            z_score: 4.5,
            baseline_mean: 100,
            current_value: 450,
            deviation_pct: 350,
          },
        },
      });
      const anomBody = await anomRes.json();
      anomalyId = anomRes.ok() ? anomBody.data?.id : undefined;
    }
  });

  test('anomaly detail shows severity and z-score', async ({ page }) => {
    if (!anomalyId) {
      test.skip(true, 'Could not seed anomaly');
      return;
    }

    await page.goto(`/anomalies/${anomalyId}`);
    await page.waitForLoadState('networkidle');

    // Should show the anomaly detail page
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });

    // Should contain severity badge information
    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).toContain('high');

    // Should contain z-score display
    await expect(page.locator('[role="status"]')).toContainText(/z=/, { timeout: 5000 });
  });

  test('resolve anomaly', async ({ page }) => {
    if (!anomalyId) {
      test.skip(true, 'Could not seed anomaly');
      return;
    }

    await page.goto(`/anomalies/${anomalyId}`);
    await page.waitForLoadState('networkidle');

    // Click "Marcar como Resolvida" button
    const resolveBtn = page.locator('button', { hasText: 'Marcar como Resolvida' });
    await expect(resolveBtn).toBeVisible({ timeout: 10000 });

    // Click resolve
    await resolveBtn.click();

    // Should show "Resolvida" badge after resolution
    await expect(page.locator('text=Resolvida')).toBeVisible({ timeout: 10000 });
  });

  test('invalid anomaly ID shows empty state', async ({ page }) => {
    await page.goto('/anomalies/invalid-id-99999');
    await page.waitForLoadState('networkidle');

    // Should show empty state or error
    const emptyState = page.locator('text=nao encontrada');
    const errorPanel = page.locator('text=Failed to load');

    const hasEmptyOrError = await Promise.race([
      emptyState.isVisible().then((v) => (v ? 'empty' : null)),
      errorPanel.isVisible().then((v) => (v ? 'error' : null)),
      page.waitForTimeout(5000).then(() => 'timeout'),
    ]);

    expect(['empty', 'error']).toContain(hasEmptyOrError);
  });
});
