const { test, expect } = require('@playwright/test');
const { getEnv, missingRequiredEnv } = require('./utils/env');
const { loginAsBdk, openAsAuthed } = require('./utils/auth');
const {
  fetchProductsByName,
  fetchProductById,
  fetchJournalByRef,
  fetchSupplierLedgerByRef,
  fetchLatestGrnByProduct
} = require('./utils/firestore');

test.describe('Distributor E2E - GRN flow', () => {
  test('save GRN creates stock + accounting entries', async ({ page }) => {
    const env = getEnv();
    const missing = missingRequiredEnv(env);
    test.skip(missing.length > 0, `Missing env: ${missing.join(', ')}`);

    const ts = Date.now();
    const supplier = `PW Supplier ${ts}`;
    const product = `PW Product ${ts}`;
    const qty = 5;
    const buying = 200;
    const selling = 250;
    const expectedTotal = qty * buying;

    await loginAsBdk(page, env);
    await openAsAuthed(page, '/modules/distributor/web/grn.html', env);

    await page.fill('#supplierName', supplier);
    await page.fill('#grnDate', new Date().toISOString().slice(0, 10));
    await page.fill('#productName', product);
    await page.fill('#category', 'E2E');
    await page.fill('#brand', 'PW');
    await page.fill('#sellingPrice', String(selling));
    await page.fill('#buyingPrice', String(buying));
    await page.fill('#receivedQty', String(qty));
    await page.click('#saveBtn');

    await expect(page.locator('#msg')).toContainText('GRN saved', { timeout: 20000 });

    const grn = await fetchLatestGrnByProduct(page, env.businessId, product);
    expect(grn).toBeTruthy();
    const products = await fetchProductsByName(page, env.businessId, product);
    const productDoc = grn.productId
      ? await fetchProductById(page, grn.productId)
      : (products[0] || null);
    expect(productDoc).toBeTruthy();
    expect(Number(productDoc.currentStock || productDoc.stock || 0)).toBeGreaterThanOrEqual(qty);
    const reference = `GRN/${grn.grnId || grn.id}`;

    const journalRows = await fetchJournalByRef(page, env.businessId, reference);
    const purchaseEntry = journalRows.find((r) => String(r.account || '') === 'Purchases');
    const inventoryEntry = journalRows.find((r) => String(r.account || '') === 'Inventory');
    expect(purchaseEntry).toBeTruthy();
    expect(inventoryEntry).toBeTruthy();
    expect(Number(purchaseEntry.amount || 0)).toBe(expectedTotal);

    const supplierLedgerRows = await fetchSupplierLedgerByRef(page, env.businessId, reference);
    expect(supplierLedgerRows.length).toBeGreaterThan(0);
    expect(String(supplierLedgerRows[0].type || '').toLowerCase()).toBe('credit');
  });
});
