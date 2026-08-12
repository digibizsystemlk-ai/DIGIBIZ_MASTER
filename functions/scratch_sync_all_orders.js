const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function syncAllDistributorOrdersToGL() {
  console.log('=== SYNCING ALL DISTRIBUTOR ORDERS TO ACCOUNTING GL ===');

  const bizSnaps = await db.collection('businesses').get();
  console.log(`Found ${bizSnaps.docs.length} business docs.`);

  for (const bDoc of bizSnaps.docs) {
    const bid = bDoc.id;
    const bData = bDoc.data() || {};
    const ownerEm = String(bData.ownerEmail || '').toLowerCase().trim();

    console.log(`\nChecking Business ID: ${bid} (${bData.name || bData.businessName || ownerEm})`);

    // 1. Get existing journal entries
    const jEntriesSnap = await db.collection('journal').doc(bid).collection('entries').get();
    const existingRefs = new Set();
    const existingIds = new Set();

    jEntriesSnap.docs.forEach(doc => {
      const d = doc.data() || {};
      if (d.ref) existingRefs.add(d.ref);
      existingIds.add(doc.id);
    });

    console.log(`Existing Journal Entries count: ${jEntriesSnap.docs.length}`);

    // 2. Query all orders from all locations
    const queries = [
      db.collection('orders').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
      db.collection('orders').doc(bid).collection('list').get().catch(() => ({ docs: [] })),
      db.collection('businesses').doc(bid).collection('orders').get().catch(() => ({ docs: [] })),
      db.collection('distributor_orders').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
      db.collection('pendingOrders').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
      db.collection('pendingOrders').doc(bid).collection('list').get().catch(() => ({ docs: [] })),
      db.collection('businesses').doc(bid).collection('pendingOrders').get().catch(() => ({ docs: [] }))
    ];

    if (ownerEm) {
      queries.push(db.collection('orders').where('ownerEmail', '==', ownerEm).get().catch(() => ({ docs: [] })));
      queries.push(db.collection('orders').where('repEmail', '==', ownerEm).get().catch(() => ({ docs: [] })));
      queries.push(db.collection('distributor_orders').where('ownerEmail', '==', ownerEm).get().catch(() => ({ docs: [] })));
      queries.push(db.collection('distributor_orders').where('repEmail', '==', ownerEm).get().catch(() => ({ docs: [] })));
      queries.push(db.collection('pendingOrders').where('ownerEmail', '==', ownerEm).get().catch(() => ({ docs: [] })));
      queries.push(db.collection('pendingOrders').where('repEmail', '==', ownerEm).get().catch(() => ({ docs: [] })));
    }

    const snaps = await Promise.all(queries);
    const orderMap = {};
    snaps.forEach(snap => {
      (snap.docs || []).forEach(doc => {
        orderMap[doc.id] = doc;
      });
    });

    const allOrders = Object.values(orderMap);
    console.log(`Found ${allOrders.length} total orders across all collections.`);

    let addedCount = 0;
    const batch = db.batch();

    for (const doc of allOrders) {
      const data = doc.data() || {};
      const docId = doc.id;
      const orderId = data.orderId || data.orderNumber || docId;

      const refStr1 = `orders/${orderId}`;
      const refStr2 = `orders/${docId}`;
      const refStr3 = `pendingOrders/${orderId}`;
      const refStr4 = `pendingOrders/${docId}`;

      const customId1 = `JE_${orderId}`;
      const customId2 = `JE_${docId}`;

      if (existingRefs.has(refStr1) || existingRefs.has(refStr2) || existingRefs.has(refStr3) || existingRefs.has(refStr4) ||
          existingIds.has(customId1) || existingIds.has(customId2)) {
        continue;
      }

      const status = String(data.status || '').toLowerCase();
      if (status === 'rejected' || status === 'cancelled') continue;

      const total = Number(data.totalAmount || data.total || data.netTotal || data.grandTotal || data.amount || 0);
      if (total <= 0) continue;

      let dt = new Date();
      if (data.orderDate) dt = new Date(data.orderDate);
      else if (data.createdAt && data.createdAt.toDate) dt = data.createdAt.toDate();
      else if (data.createdAt) dt = new Date(data.createdAt);
      else if (data.timestamp && data.timestamp.toDate) dt = data.timestamp.toDate();

      const pm = String(data.paymentMethod || 'CASH').toUpperCase();
      const isCash = pm === 'CASH';
      const customer = data.customerName || data.shopName || data.shop || data.customer || 'Customer';

      const jRef = db.collection('journal').doc(bid).collection('entries').doc(customId1);
      const jObj = {
        businessId: bid,
        date: admin.firestore.Timestamp.fromDate(isNaN(dt.getTime()) ? new Date() : dt),
        description: `Sales Order #${orderId} - ${customer}`,
        ref: refStr1,
        referenceType: 'SALE',
        totalDebit: total,
        totalCredit: total,
        entries: [
          { accountCode: isCash ? '1-1010-01' : '1-1030-01', accountName: isCash ? 'Cash in Drawer' : 'Accounts Receivable', debit: total, credit: 0 },
          { accountCode: '4-4010-01', accountName: 'Sales Revenue', debit: 0, credit: total }
        ]
      };

      batch.set(jRef, jObj, { merge: true });
      existingRefs.add(refStr1);
      existingRefs.add(refStr2);
      existingRefs.add(refStr3);
      existingRefs.add(refStr4);
      existingIds.add(customId1);
      existingIds.add(customId2);
      addedCount++;
    }

    if (addedCount > 0) {
      await batch.commit();
      console.log(`✅ Posted ${addedCount} new Sales Order Journal Entries for ${bid}`);
    } else {
      console.log(`No new unjournaled sales orders found for ${bid}`);
    }
  }

  console.log('\n=== COMPLETED SYNC ===');
  process.exit(0);
}

syncAllDistributorOrdersToGL().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
