const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    console.log("=== Fetching scrap_sms_settings for oDhSDYHQ2dV1DP33koysmZAqaY13 ===");
    const snap = await db.collection('scrap_sms_settings').doc('oDhSDYHQ2dV1DP33koysmZAqaY13').get();
    if (!snap.exists) {
        console.log("No scrap_sms_settings found.");
        return;
    }
    console.log("scrap_sms_settings Data:", JSON.stringify(snap.data(), null, 2));
}

main().catch(console.error);
