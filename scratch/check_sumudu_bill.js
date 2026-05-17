const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    console.log("=== Fetching Bill 26051704 ===");
    const snap = await db.collection('buying_history').where('billNo', '==', '26051704').get();
    if (snap.empty) {
        console.log("Bill 26051704 not found.");
        return;
    }
    snap.forEach(doc => {
        console.log(`Document ID: ${doc.id}`);
        console.log("Bill Data:", JSON.stringify(doc.data(), null, 2));
    });
}

main().catch(console.error);
