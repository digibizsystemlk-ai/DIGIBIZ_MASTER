async function queryInPage(page, fn, arg) {
  return page.evaluate(
    async ({ fnSource, argValue }) => {
      const db = window.db;
      if (!db) throw new Error('window.db is unavailable on this page');
      // eslint-disable-next-line no-eval
      const userFn = eval(`(${fnSource})`);
      return userFn(db, argValue);
    },
    { fnSource: fn.toString(), argValue: arg }
  );
}

async function fetchProductsByName(page, businessId, productName) {
  return queryInPage(page, async (db, args) => {
    const snap = await db.collection('products')
      .where('businessId', '==', args.businessId)
      .where('name', '==', args.productName)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }, { businessId, productName });
}

async function fetchProductById(page, productId) {
  return queryInPage(page, async (db, args) => {
    const snap = await db.collection('products').doc(args.productId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  }, { productId });
}

async function fetchJournalByRef(page, businessId, reference) {
  return queryInPage(page, async (db, args) => {
    const snap = await db.collection('journal_entries')
      .where('businessId', '==', args.businessId)
      .where('reference', '==', args.reference)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }, { businessId, reference });
}

async function fetchSupplierLedgerByRef(page, businessId, reference) {
  return queryInPage(page, async (db, args) => {
    const snap = await db.collection('supplier_ledger')
      .where('businessId', '==', args.businessId)
      .where('reference', '==', args.reference)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }, { businessId, reference });
}

async function fetchLatestGrnByProduct(page, businessId, productName) {
  return queryInPage(page, async (db, args) => {
    const snap = await db.collection('grn_history')
      .where('businessId', '==', args.businessId)
      .where('productName', '==', args.productName)
      .get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => {
      const at = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
      const bt = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
      return bt - at;
    });
    return rows[0] || null;
  }, { businessId, productName });
}

module.exports = {
  queryInPage,
  fetchProductsByName,
  fetchProductById,
  fetchJournalByRef,
  fetchSupplierLedgerByRef,
  fetchLatestGrnByProduct
};
