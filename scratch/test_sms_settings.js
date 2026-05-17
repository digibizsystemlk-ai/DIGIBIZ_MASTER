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
    const eventKey = 'buying';
    
    console.log("=== Testing SMS settings check ===");
    const snap = await db.collection('scrap_sms_settings').doc(businessId).get();
    if (!snap.exists) {
        console.log("No settings found in scrap_sms_settings.");
        return;
    }
    
    const s = snap.data() || {};
    const key = String(eventKey || '').trim().toLowerCase();
    const ev = typeof s.events === 'object' ? s.events : {};
    
    let isEnabled = false;
    if (ev[key] === true || ev[key] === 'true' || ev[key] === 1) {
        console.log("MATCH FOUND in nested events object!");
        isEnabled = true;
    }

    const legacyKey = 'enable' + key.charAt(0).toUpperCase() + key.slice(1);
    if (s[legacyKey] === true || s[legacyKey] === 'true' || s[legacyKey] === 1) {
        console.log("MATCH FOUND in legacy root-level key:", legacyKey);
        isEnabled = true;
    }
    
    console.log(`Result: ${isEnabled}`);
}

main().catch(console.error);
