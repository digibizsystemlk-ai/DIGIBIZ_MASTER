const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixOrder() {
    const orderId = 'ORD-0000113';
    console.log(`Checking order ${orderId}...`);
    
    let snap = await db.collection('pendingOrders').where('orderNumber', '==', orderId).get();
    if (snap.empty) {
        snap = await db.collection('orders').where('orderNumber', '==', orderId).get();
    }
    
    if (snap.empty) {
        console.log('Order not found in pendingOrders or orders.');
        return;
    }

    const doc = snap.docs[0];
    const data = doc.data();
    
    console.log('Current Data:', JSON.stringify(data, null, 2));

    let newOrderLinesTotal = 0;
    data.items.forEach(it => {
        const qty = Number(it.orderedQty) || 0;
        const ret = Number(it.returnResellQty || 0) + Number(it.returnCompanyQty || 0);
        const up = Number(it.unitPrice) || 0;
        const lineTotal = (qty - ret) * up;
        newOrderLinesTotal += lineTotal;
        console.log(`Item: ${it.productName}, Qty: ${qty}, Ret: ${ret}, UP: ${up}, LineTotal: ${lineTotal}`);
    });

    const otherReturnsTotal = Number(data.otherReturnsTotal) || 0;
    const newTotalAmount = newOrderLinesTotal - otherReturnsTotal;

    console.log(`Recalculated orderLinesTotal: ${newOrderLinesTotal}`);
    console.log(`Recalculated totalAmount: ${newTotalAmount}`);

    if (data.totalAmount !== newTotalAmount) {
        await doc.ref.update({
            orderLinesTotal: newOrderLinesTotal,
            totalAmount: newTotalAmount,
            fixedManually: true,
            fixedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('Order updated successfully!');
    } else {
        console.log('Order total is already correct according to current logic.');
    }
}

fixOrder().catch(console.error);
