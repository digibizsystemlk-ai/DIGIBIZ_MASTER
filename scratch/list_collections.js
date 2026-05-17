const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    console.log("=== Listing Firestore Collections ===");
    const collections = await db.listCollections();
    collections.forEach(col => {
        console.log(`- ${col.id}`);
    });
}

main().catch(console.error);
