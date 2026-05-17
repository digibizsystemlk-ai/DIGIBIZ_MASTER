const admin = require('firebase-admin');
const serviceAccount = require('i:/DIGIBIZ_MASTER/serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function find() {
    const snap = await db.collection('buying_history').get();
    console.log("Total bills checked:", snap.size);
    let count = 0;
    snap.docs.forEach(doc => {
        const d = doc.data();
        if (d.accountSnapshot) {
            count++;
            console.log(`\nBill ID: ${doc.id}`);
            console.log(`Supplier: ${d.supplierName}`);
            console.log(`Date: ${d.billDateTime}`);
            console.log(`Snapshot:`, JSON.stringify(d.accountSnapshot, null, 2));
            if (count >= 5) process.exit(0);
        }
    });
    console.log(`Found ${count} bills with snapshots.`);
}

find().catch(console.error);
