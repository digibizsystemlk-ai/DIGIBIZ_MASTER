const { test, expect } = require('@playwright/test');
const { getEnv, missingRequiredEnv } = require('./utils/env');
const { loginAsBdk, openAsAuthed } = require('./utils/auth');
const { queryInPage } = require('./utils/firestore');

test.describe('Distributor E2E - cheque management', () => {
  test('create cheque and verify Firestore row', async ({ page }) => {
    const env = getEnv();
    const missing = missingRequiredEnv(env);
    test.skip(missing.length > 0, `Missing env: ${missing.join(', ')}`);
    test.skip(!env.shopId, 'Missing env: E2E_SHOP_ID');

    await loginAsBdk(page, env);
    await openAsAuthed(page, '/modules/distributor/web/cheques.html', env);

    const ts = Date.now();
    const chequeNo = `PW-CHQ-${ts}`;
    const amount = 1234;

    await page.selectOption('#fCustomerId', env.shopId);
    await page.fill('#fInvoice', `INV-PW-${ts}`);
    await page.fill('#fOrderId', '');
    await page.fill('#fBank', 'Playwright Bank');
    await page.fill('#fChequeNo', chequeNo);
    await page.fill('#fAmount', String(amount));
    await page.fill('#fIssueDate', new Date().toISOString().slice(0, 10));
    await page.fill('#fDueDate', new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    await page.selectOption('#fStatus', 'pending_deposit');
    await page.click('#btnSave');

    await page.waitForTimeout(1800);

    const rows = await queryInPage(page, async (db, args) => {
      const snap = await db.collection('cheques')
        .where('businessId', '==', args.businessId)
        .where('chequeNumber', '==', args.chequeNo)
        .where('isActive', '==', true)
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }, { businessId: env.businessId, chequeNo });

    expect(rows.length).toBeGreaterThan(0);
    expect(Number(rows[0].amount || 0)).toBe(amount);
    expect(String(rows[0].status || '')).toBe('pending_deposit');
  });
});
