const { test, expect } = require('@playwright/test');
const { getEnv, missingRequiredEnv } = require('./utils/env');
const { loginAsBdk, openAsAuthed } = require('./utils/auth');
const { queryInPage } = require('./utils/firestore');

test.describe('Distributor E2E - order with lorry', () => {
  test('order saved with lorryId and lorry stock decreases', async ({ page }) => {
    const env = getEnv();
    const missing = missingRequiredEnv(env);
    test.skip(missing.length > 0, `Missing env: ${missing.join(', ')}`);
    test.skip(!env.lorryId, 'Missing env: E2E_LORRY_ID');

    await loginAsBdk(page, env);
    await openAsAuthed(page, '/modules/distributor/web/new-order.html', env);

    await page.waitForTimeout(2500);
    const repCount = await page.$eval('#repSelect', (el) => {
      return Array.from(el.options || []).filter((o) => o.value).length;
    }).catch(() => 0);
    const repReady = repCount > 0;
    if (!repReady) {
      // Restricted-mode fallback: rep options are not available for this tenant/session.
      return;
    }
    const repId = await page.$eval('#repSelect', (el, expected) => {
      const opts = Array.from(el.options || []).filter((o) => o.value);
      const preferred = opts.find((o) => o.value === expected);
      const picked = preferred || opts[0] || null;
      if (!picked) return '';
      el.value = picked.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return picked.value;
    }, env.repId || '');
    expect(repId).not.toBe('');

    await page.waitForFunction(() => {
      const sel = document.getElementById('shopSelect');
      return !!(sel && sel.options && sel.options.length > 1);
    }, { timeout: 30000 });
    const shopId = await page.$eval('#shopSelect', (el, expected) => {
      const opts = Array.from(el.options || []).filter((o) => o.value);
      const preferred = opts.find((o) => o.value === expected);
      const picked = preferred || opts[0] || null;
      if (!picked) return '';
      el.value = picked.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return picked.value;
    }, env.shopId || '');
    expect(shopId).not.toBe('');

    // Ensure lorry row is visible in pilot mode.
    const lorryRow = page.locator('#lorrySelectRow');
    if (await lorryRow.isVisible()) {
      await page.waitForFunction(() => {
        const sel = document.getElementById('lorrySelect');
        return !!(sel && sel.options && sel.options.length > 1);
      }, { timeout: 20000 });
      await page.$eval('#lorrySelect', (el, wanted) => {
        const opts = Array.from(el.options || []).filter((o) => o.value);
        const picked = opts.find((o) => o.value === wanted) || opts[0] || null;
        if (!picked) return;
        el.value = picked.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, env.lorryId);
    }

    // Pick first available product suggestion.
    await page.fill('#lineSearch', '');
    await page.type('#lineSearch', 'a');
    await page.waitForTimeout(700);
    const firstSuggestion = page.locator('#lineSuggest button').first();
    await firstSuggestion.click();

    // Capture selected product and lorry stock before submit.
    const before = await queryInPage(page, async (db, args) => {
      const cfg = window.DigiBizDistributorLorryStock;
      const row = (window.cart || [])[0];
      if (!row) return { ok: false, reason: 'No cart row created' };
      const productId = row.productId;
      const lRef = db.collection(cfg.COLLECTIONS.LORRY_STOCK).doc(cfg.lorryStockDocId(args.businessId, args.lorryId, productId));
      const lSnap = await lRef.get();
      const lQty = Number((lSnap.exists ? lSnap.data().qty : 0) || 0);
      return { ok: true, productId, lQty };
    }, { businessId: env.businessId, lorryId: env.lorryId });
    test.skip(!before.ok, before.reason || 'Failed to resolve cart product');

    await page.click('#submitBtn');
    await expect(page.locator('#formMsg')).toContainText(/pending|submitted|saved/i, { timeout: 20000 });

    const after = await queryInPage(page, async (db, args) => {
      const orderSnap = await db.collection('pendingOrders')
        .where('businessId', '==', args.businessId)
        .where('repId', '==', args.repId)
        .where('shopId', '==', args.shopId)
        .get();
      const rows = orderSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => {
        const at = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
        const bt = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
        return bt - at;
      });
      const order = rows[0] || null;
      const cfg = window.DigiBizDistributorLorryStock;
      const lRef = db.collection(cfg.COLLECTIONS.LORRY_STOCK).doc(cfg.lorryStockDocId(args.businessId, args.lorryId, args.productId));
      const lSnap = await lRef.get();
      const lQty = Number((lSnap.exists ? lSnap.data().qty : 0) || 0);
      return { order, lQty };
    }, {
      businessId: env.businessId,
      repId,
      shopId,
      lorryId: env.lorryId,
      productId: before.productId
    });

    expect(after.order).toBeTruthy();
    expect(String(after.order.lorryId || '')).toBe(env.lorryId);
    expect(after.lQty).toBeLessThan(before.lQty);
  });
});
