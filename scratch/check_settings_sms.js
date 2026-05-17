const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    const businessId = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
    console.log(`=== Fetching Settings for ${businessId} ===`);
    const doc = await db.collection('settings').doc(businessId).get();
    if (!doc.exists) {
        console.log("Settings document not found.");
        return;
    }
    console.log("Settings Data:", JSON.stringify(doc.data(), null, 2));
}

main().catch(console.error);
