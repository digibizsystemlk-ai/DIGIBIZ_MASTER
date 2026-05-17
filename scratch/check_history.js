
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkSpecificBID() {
    const bizId = '8KlnS39HmqYwtcNzM0NZMkq6om63';
    console.log(`Checking buying_history for BID: ${bizId}`);
    const histSnap = await db.collection('buying_history')
        .where('businessId', '==', bizId)
        .limit(10)
        .get();
    console.log(`Found ${histSnap.size} records in buying_history.`);
    histSnap.forEach(d => console.log(d.id, d.data().date, d.data().supplierName));

    console.log(`Checking scrap_buying_sessions for BID: ${bizId}`);
    const sessSnap = await db.collection('scrap_buying_sessions')
        .where('businessId', '==', bizId)
        .limit(10)
        .get();
    console.log(`Found ${sessSnap.size} records.`);
}

checkSpecificBID();
