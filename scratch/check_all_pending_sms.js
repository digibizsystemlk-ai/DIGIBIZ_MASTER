const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    console.log("=== Fetching latest 10 pending_sms documents ===");
    const pendingSnap = await db.collection('pending_sms')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
        
    console.log(`Found ${pendingSnap.size} pending_sms docs.`);
    pendingSnap.forEach(d => {
        console.log(`Doc ID: ${d.id}`, JSON.stringify(d.data(), null, 2));
        console.log('---');
    });
    
    console.log("=== Fetching latest 10 sms_logs documents ===");
    const logsSnap = await db.collection('sms_logs')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
        
    console.log(`Found ${logsSnap.size} sms_logs docs.`);
    logsSnap.forEach(d => {
        console.log(`Doc ID: ${d.id}`, JSON.stringify(d.data(), null, 2));
        console.log('---');
    });
}

main().catch(console.error);
