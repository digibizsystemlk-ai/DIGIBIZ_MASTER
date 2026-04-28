const { test, expect } = require('@playwright/test');
const { getEnv, missingRequiredEnv } = require('./utils/env');
const { loginAsBdk, openAsAuthed } = require('./utils/auth');

test.describe('Distributor E2E - accounting dashboard widget', () => {
  test('core dashboard shows stock value and purchases', async ({ page }) => {
    const env = getEnv();
    const missing = missingRequiredEnv(env);
    test.skip(missing.length > 0, `Missing env: ${missing.join(', ')}`);

    await loginAsBdk(page, env);
    await openAsAuthed(page, '/modules/core/dashboard.html', env);

    // Wait for widget population.
    const stockValue = page.locator('#coreAccStockValue');
    const purchases = page.locator('#coreAccTotalPurchases');
    await expect(stockValue).not.toContainText('Rs 0.00', { timeout: 25000 });
    await expect(purchases).not.toContainText('Rs 0.00', { timeout: 25000 });
  });
});
