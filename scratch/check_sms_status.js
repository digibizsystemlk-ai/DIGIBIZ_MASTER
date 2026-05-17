const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://digibiz-sys.firebaseio.com'
    });
}

const db = admin.firestore();
const rtdb = admin.database();

async function main() {
    console.log("=== Checking SMS Wallet and settings ===");
    const SCRAP_BUSINESS_ID = 'scrap_buying'; // Or whatever business ID is used
    
    // Let's first search settings documents to see if there is any doc related to scrap or digibiz
    const settingsSnap = await db.collection('settings').get();
    settingsSnap.forEach(doc => {
        console.log(`Setting ID: ${doc.id}, data:`, JSON.stringify(doc.data(), null, 2));
    });

    console.log("\n=== Checking last 5 pending_sms entries ===");
    const pendingSnap = await db.collection('pending_sms')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
    
    if (pendingSnap.empty) {
        console.log("No pending SMS entries found in Firestore.");
    } else {
        pendingSnap.forEach(doc => {
            const data = doc.data();
            console.log(`SMS Doc ID: ${doc.id}`);
            console.log(`  To: ${data.mobile}`);
            console.log(`  Msg: ${data.message}`);
            console.log(`  Status: ${data.status}`);
            console.log(`  Created: ${data.createdAt ? data.createdAt.toDate().toISOString() : 'N/A'}`);
            console.log(`  Details:`, JSON.stringify(data, null, 2));
            console.log('---');
        });
    }

    console.log("\n=== Checking RTDB sms_gateway path ===");
    const rtdbSnap = await rtdb.ref('sms_gateway').limitToLast(5).once('value');
    console.log("RTDB sms_gateway last entries:", JSON.stringify(rtdbSnap.val(), null, 2));
}

main().catch(console.error);
