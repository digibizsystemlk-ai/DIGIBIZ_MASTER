const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    console.log("=== Fetching Bills for 'Kalu Mama' ===");
    const snap = await db.collection('buying_history')
        .where('supplierName', '==', 'Kalu Mama')
        .get();
    
    if (snap.empty) {
        console.log("No bills found for Kalu Mama.");
        // Try case-insensitive or partial match
        const allSnap = await db.collection('buying_history').limit(500).get();
        const matches = [];
        allSnap.forEach(doc => {
            const data = doc.data();
            const name = String(data.supplierName || '').toLowerCase();
            if (name.includes('kalu') || name.includes('mama')) {
                matches.push({ id: doc.id, ...data });
            }
        });
        console.log(`Partial matches found: ${matches.length}`);
        matches.forEach(m => {
            console.log(`Doc ID: ${m.id}`);
            console.log(`  Name: ${m.supplierName}`);
            console.log(`  BillNo: ${m.billNo}`);
            console.log(`  Phone: ${m.supplierPhone}`);
            console.log(`  GrandTotal: ${m.billGrandTotal}`);
            console.log(`  CashPaid: ${m.cashPaid}`);
            console.log(`  Timestamp: ${m.createdAt ? m.createdAt.toDate().toISOString() : 'N/A'}`);
            console.log('---');
        });
        return;
    }

    snap.forEach(doc => {
        const data = doc.data();
        console.log(`Document ID: ${doc.id}`);
        console.log(`  Supplier: ${data.supplierName}`);
        console.log(`  BillNo: ${data.billNo}`);
        console.log(`  Phone: ${data.supplierPhone}`);
        console.log(`  GrandTotal: ${data.billGrandTotal}`);
        console.log(`  CashPaid: ${data.cashPaid}`);
        console.log(`  Date: ${data.date}`);
        console.log(`  Timestamp: ${data.createdAt ? data.createdAt.toDate().toISOString() : 'N/A'}`);
        console.log('---');
    });
}

main().catch(console.error);
