/* MW Trading one-time backfill for credit/cheque accounting.
 * Usage (browser console):
 *   await window.backfillMwCreditChequeAccounting()
 */
(function attachMwCreditChequeBackfill() {
    const MW_BUSINESS_ID = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';

    function normPay(v) { return String(v || '').trim().toUpperCase(); }
    function toYmd(v) {
        if (!v) return new Date().toISOString().slice(0, 10);
        if (typeof v === 'string') return v.slice(0, 10);
        if (typeof v.toDate === 'function') return v.toDate().toISOString().slice(0, 10);
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
    }

    async function readOrders(coll) {
        const snap = await window.db.collection(coll)
            .where('businessId', '==', MW_BUSINESS_ID)
            .get()
            .catch(() => ({ docs: [] }));
        return (snap.docs || []).map((d) => ({ id: d.id, coll, data: d.data() || {} }));
    }

    async function ensureOrderEntries(row) {
        const pay = normPay(row.data.paymentMethod);
        if (pay !== 'CREDIT' && pay !== 'CHEQUE') return false;
        const amount = Number(row.data.totalAmount || row.data.subtotal || 0) || 0;
        if (!(amount > 0)) return false;
        const orderNo = String(row.data.orderNumber || row.id);
        const orderKey = String(row.coll + '_' + row.id).replace(/[^A-Za-z0-9_-]/g, '_');
        const ref = `ORDER/${orderNo}`;
        const date = toYmd(row.data.orderDate || row.data.createdAt);
        const arId = `MW_AR_ORDER_${orderKey}_DR`;
        const revId = `MW_AR_ORDER_${orderKey}_CR`;
        await Promise.all([
            window.db.collection('journal_entries').doc(arId).set({
                businessId: MW_BUSINESS_ID,
                account: 'Accounts Receivable',
                amount,
                entryType: 'debit',
                reference: ref,
                referenceType: 'MW_ORDER_RECEIVABLE',
                date,
                createdAt: new Date(),
                meta: {
                    orderId: row.id,
                    orderNumber: orderNo,
                    sourceCollection: row.coll,
                    paymentMethod: pay,
                    scope: 'MW_TRADING_ONLY'
                }
            }, { merge: true }),
            window.db.collection('journal_entries').doc(revId).set({
                businessId: MW_BUSINESS_ID,
                account: 'Sales Revenue',
                amount,
                entryType: 'credit',
                reference: ref,
                referenceType: 'MW_ORDER_REVENUE',
                date,
                createdAt: new Date(),
                meta: {
                    orderId: row.id,
                    orderNumber: orderNo,
                    sourceCollection: row.coll,
                    paymentMethod: pay,
                    scope: 'MW_TRADING_ONLY'
                }
            }, { merge: true }),
            window.db.collection(row.coll).doc(row.id).set({
                accounting: {
                    receivableEntryId: arId,
                    salesRevenueEntryId: revId,
                    backfilledAt: new Date(),
                    scope: 'MW_TRADING_ONLY'
                }
            }, { merge: true })
        ]);
        return true;
    }

    async function backfillCheques(orderRowsById) {
        const snap = await window.db.collection('cheques')
            .where('businessId', '==', MW_BUSINESS_ID)
            .where('isActive', '==', true)
            .get()
            .catch(() => ({ docs: [] }));
        let touched = 0;
        for (const doc of (snap.docs || [])) {
            const x = doc.data() || {};
            const orderId = String(x.orderId || '').trim();
            const source = orderId && orderRowsById[orderId] ? orderRowsById[orderId] : null;
            const orderNo = source ? String(source.data.orderNumber || source.id) : '';
            const pay = source ? normPay(source.data.paymentMethod) : '';
            await window.db.collection('cheques').doc(doc.id).set({
                accounting: {
                    linkedOrderId: orderId || '',
                    linkedOrderNumber: orderNo || '',
                    expectedOrderPaymentMethod: pay || '',
                    receivableReference: orderNo ? `ORDER/${orderNo}` : '',
                    updatedAt: new Date(),
                    scope: 'MW_TRADING_ONLY'
                }
            }, { merge: true });
            touched += 1;
        }
        return touched;
    }

    window.backfillMwCreditChequeAccounting = async function backfillMwCreditChequeAccounting() {
        if (!window.db) throw new Error('window.db unavailable');
        const pending = await readOrders('pendingOrders');
        const approved = await readOrders('orders');
        const all = pending.concat(approved);
        const mapById = {};
        all.forEach((r) => { mapById[r.id] = r; });
        let backfilledOrders = 0;
        for (const row of all) {
            const ok = await ensureOrderEntries(row);
            if (ok) backfilledOrders += 1;
        }
        const chequeTouched = await backfillCheques(mapById);
        return {
            businessId: MW_BUSINESS_ID,
            ordersScanned: all.length,
            ordersBackfilled: backfilledOrders,
            chequesUpdated: chequeTouched
        };
    };
})();
