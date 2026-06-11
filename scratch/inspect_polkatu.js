const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function run() {
    console.log("=== Inspecting oDhSDYHQ2dV1DP33koysmZAqaY13_POLKATU_L ===");
    const doc = await db.collection('scrap_items').doc('oDhSDYHQ2dV1DP33koysmZAqaY13_POLKATU_L').get();
    if (doc.exists) {
        console.log(JSON.stringify(doc.data(), null, 2));
    } else {
        console.log("Doc not found!");
    }
    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
