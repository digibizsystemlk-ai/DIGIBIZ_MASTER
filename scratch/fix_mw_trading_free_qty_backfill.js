const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const MW_TRADING_BID = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';

async function runBackfill() {
    console.log('Starting MW Trading Free Qty Backfill...');
    
    const collections = ['pendingOrders', 'orders'];
    let totalScanned = 0;
    let totalFixed = 0;

    for (const coll of collections) {
        console.log(`Processing collection: ${coll}...`);
        const snapshot = await db.collection(coll).where('businessId', '==', MW_TRADING_BID).get();
        console.log(`Found ${snapshot.size} orders in ${coll}.`);

        for (const doc of snapshot.docs) {
            totalScanned++;
            const data = doc.data();
            const items = Array.isArray(data.items) ? data.items : [];
            
            let changed = false;
            const recalcedItems = items.map(it => {
                const oq = Number(it.orderedQty != null ? it.orderedQty : it.qty) || 0;
                const fq = Number(it.freeQty) || 0;
                const rr = Number(it.returnResellQty) || 0;
                const rc = Number(it.returnCompanyQty) || 0;
                const rq = rr + rc;
                const rate = Number(it.unitPrice) || 0;
                
                const currentTotal = Number(it.totalPrice) || 0;
                const correctedTotal = Math.max(0, oq - rq) * rate;

                if (Math.abs(currentTotal - correctedTotal) > 0.01) {
                    changed = true;
                }

                return { ...it, totalPrice: correctedTotal };
            });

            const correctedTotalAmount = recalcedItems.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);
            const currentTotalAmount = Number(data.totalAmount) || 0;
            
            if (Math.abs(correctedTotalAmount - currentTotalAmount) > 0.01) {
                changed = true;
            }

            const freeQtyTotal = recalcedItems.reduce((sum, it) => sum + (Number(it.freeQty) || 0), 0);
            const currentFreeQty = Number(data.freeIssuesTotal || data.mwFreeIssuesQty);
            if (Number.isNaN(currentFreeQty) || Math.abs(currentFreeQty - freeQtyTotal) > 0.01) {
                changed = true;
            }

            if (changed) {
                await doc.ref.update({
                    items: recalcedItems,
                    totalAmount: correctedTotalAmount,
                    subtotal: correctedTotalAmount,
                    freeIssuesTotal: freeQtyTotal,
                    mwFreeIssuesQty: freeQtyTotal,
                    billingRule: 'mw_free_qty_excluded_fixed_v2',
                    fixedByScript: true,
                    fixedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                totalFixed++;
                console.log(`Fixed Order ${data.orderNumber || doc.id}: Total ${currentTotalAmount} -> ${correctedTotalAmount}`);
            }
        }
    }

    console.log('--- Backfill Summary ---');
    console.log(`Total Orders Scanned: ${totalScanned}`);
    console.log(`Total Orders Fixed: ${totalFixed}`);
    console.log('Done.');
}

runBackfill().catch(console.error);
