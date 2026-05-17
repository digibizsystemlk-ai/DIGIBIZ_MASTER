const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    console.log("=== Fetching Bill suuGWBOriliPgbnOoqAA ===");
    const billRef = db.collection('buying_history').doc('suuGWBOriliPgbnOoqAA');
    const snap = await billRef.get();
    if (!snap.exists) {
        console.log("Bill not found.");
        return;
    }
    const data = snap.data();
    console.log("Bill Data:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
