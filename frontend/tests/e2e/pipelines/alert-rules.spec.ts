import { test } from '@playwright/test';

test.describe('Alert Rules', () => {
  test.skip('alert rules CRUD', async ({ page }) => {
    // Depends on GitHub issue #20 — alert rules feature not yet implemented.
    // Placeholder for when the alert rules UI is built.
    //
    // Expected flow:
    // 1. Navigate to /pipelines/:id/alert-rules
    // 2. Create a new alert rule with condition "z_score > 3"
    // 3. Verify the rule appears in the list
    // 4. Edit the rule to change channels
    // 5. Delete the rule

    await page.goto('/alerts');
    await page.waitForLoadState('networkidle');
  });
});
