const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkAjith() {
    console.log('--- Checking Customers ---');
    const custSnap = await db.collection('customers').where('name', '==', 'Ajith').get();
    custSnap.forEach(doc => {
        console.log(`ID: ${doc.id}, Name: ${doc.data().name}, Phone: ${doc.data().phone}, BusinessId: ${doc.data().businessId}`);
    });

    console.log('\n--- Checking Buying History for Ajith ---');
    const buySnap = await db.collection('buying_history').where('supplierName', '==', 'Ajith').limit(5).get();
    buySnap.forEach(doc => {
        console.log(`ID: ${doc.id}, Supplier: ${doc.data().supplierName}, Phone: ${doc.data().supplierPhone}, Date: ${doc.data().date}`);
    });
}

checkAjith().catch(console.error);
