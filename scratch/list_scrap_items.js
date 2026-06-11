const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function run() {
    const REAL_BID = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
    console.log(`=== Listing scrap_items for Business ID: ${REAL_BID} ===`);
    const snap = await db.collection('scrap_items').where('businessId', '==', REAL_BID).get();
    console.log(`Total items found: ${snap.size}`);
    snap.forEach((doc) => {
        const data = doc.data();
        console.log(`- DocID: ${doc.id} | Name: "${data.name}" | Stock: ${data.currentStock} | lastAlertedStock: ${data.lastAlertedStock}`);
    });
    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
