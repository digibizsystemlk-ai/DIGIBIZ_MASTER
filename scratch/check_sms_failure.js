const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase
const serviceAccountPath = 'i:/DIGIBIZ_MASTER/serviceAccountKey.json';
if (!fs.existsSync(serviceAccountPath)) {
    console.log("No serviceAccountKey.json found. Trying default.");
    admin.initializeApp();
} else {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath))
    });
}
const db = admin.firestore();
const SCRAP_BUSINESS_ID = 'TEST_BUSINESS_ID_OR_FIND_IT'; 

async function run() {
    // 1. Find business ID from advances
    const advSnap = await db.collection('scrap_advances').where('supplierName', '==', 'Mahesh Eranga').limit(1).get();
    if (advSnap.empty) {
        console.log("Could not find Mahesh Eranga in scrap_advances");
        return;
    }
    const bid = advSnap.docs[0].data().businessId;
    console.log(`Found Business ID: ${bid}`);

    // 2. Check SMS settings
    const smsSnap = await db.collection('scrap_sms_settings').doc(bid).get();
    if (smsSnap.exists) {
        console.log("SMS Settings:", JSON.stringify(smsSnap.data(), null, 2));
    } else {
        console.log("No scrap_sms_settings found.");
    }

    // 3. Check customer record for phone
    const custSnap = await db.collection('customers')
        .where('businessId', '==', bid)
        .where('fullName', '==', 'Mahesh Eranga')
        .get();
    console.log(`Found ${custSnap.size} customer records for Mahesh Eranga.`);
    custSnap.forEach(d => {
        console.log("Customer data:", d.data().mobile, d.data().phone);
    });

    // 4. Check pending SMS queue for this business
    const queueSnap = await db.collection('scrap_pending_sms')
        .where('businessId', '==', bid)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
    console.log("\nLast 5 pending SMS:");
    queueSnap.forEach(d => {
        const row = d.data();
        console.log(`To: ${row.phone} | Created: ${row.createdAt ? row.createdAt.toDate().toISOString() : 'N/A'}`);
        console.log(`Msg: ${row.message.substring(0, 50)}...`);
        console.log("---");
    });
}

run().then(() => process.exit(0)).catch(console.error);
