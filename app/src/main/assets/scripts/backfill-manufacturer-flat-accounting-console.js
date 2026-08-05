/**
 * One-time backfill: mirror supplier_ledger + account_balances for existing manufacturer docs
 * using the same helpers as live saves (ManufacturerModule.syncFlatAccounting*).
 *
 * HOW TO RUN (KDU Tea Factory example):
 * 1. Log in as the manufacturer business (e.g. kdkumbukaagro@gmail.com).
 * 2. Open any page that loads manufacturer-common.js, e.g.:
 *    /modules/manufacturer/inbound.html
 * 3. Open DevTools → Console and paste this entire file, or add once:
 *    <script src="/scripts/backfill-manufacturer-flat-accounting-console.js"></script>
 * 4. Run:
 *    await window.backfillManufacturerFlatAccounting('0Uled5estVeQVN8cChmMTNRDNIE3');
 *
 * Behaviour:
 * - Skips docs that already have flatAccountingSyncedV1 === true (safe re-run).
 * - Pass { force: true } only if you intentionally want to re-apply flat rows (may duplicate
 *   supplier_ledger / double-count balances — avoid unless you reset those collections first).
 *
 * Collections processed:
 * - manufacturer_raw_material_history → syncFlatAccountingRawMaterialPurchase
 * - manufacturer_sales → syncFlatAccountingFinishedGoodSale (COGS / StockValue only; skips if cogsAmount is 0)
 * - manufacturer_expenses → syncFlatAccountingOperationalExpense
 */
(function () {
    window.backfillManufacturerFlatAccounting = async function (businessId, options) {
        const bid = String(businessId || '').trim();
        const force = Boolean(options && options.force);
        const db = window.db || (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore());
        const Mod = window.ManufacturerModule;
        if (!bid || !db || !Mod || typeof Mod.syncFlatAccountingRawMaterialPurchase !== 'function') {
            throw new Error('Need businessId, window.db, and ManufacturerModule (open a manufacturer page with manufacturer-common.js).');
        }

        const stats = { rawMaterialRows: 0, salesRows: 0, expenseRows: 0, skipped: 0, errors: 0 };

        async function runBatch(collName, syncName) {
            const snap = await db.collection(collName).where('businessId', '==', bid).get();
            for (const doc of snap.docs) {
                const d = doc.data() || {};
                if (!force && d.flatAccountingSyncedV1 === true) {
                    stats.skipped += 1;
                    continue;
                }
                try {
                    await Mod[syncName](d);
                    await doc.ref.update({
                        flatAccountingSyncedV1: true,
                        flatAccountingBackfilledAt: new Date()
                    });
                    if (collName === 'manufacturer_raw_material_history') stats.rawMaterialRows += 1;
                    else if (collName === 'manufacturer_sales') stats.salesRows += 1;
                    else if (collName === 'manufacturer_expenses') stats.expenseRows += 1;
                } catch (e) {
                    stats.errors += 1;
                    console.warn('[backfill]', collName, doc.id, e);
                }
            }
        }

        await runBatch('manufacturer_raw_material_history', 'syncFlatAccountingRawMaterialPurchase');
        await runBatch('manufacturer_sales', 'syncFlatAccountingFinishedGoodSale');
        await runBatch('manufacturer_expenses', 'syncFlatAccountingOperationalExpense');
        console.log('[backfillManufacturerFlatAccounting] done', stats);
        return stats;
    };
})();
