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
    console.log(`=== Fetching Customer Kalu Mama for business: ${businessId} ===`);
    
    const snap = await db.collection('customers')
        .where('businessId', '==', businessId)
        .where('name', '==', 'Kalu Mama')
        .get();
        
    if (snap.empty) {
        console.log("Customer not found.");
        return;
    }
    
    snap.forEach(doc => {
        console.log(`Customer Doc ID: ${doc.id}`);
        console.log("Customer Data:", JSON.stringify(doc.data(), null, 2));
    });
}

main().catch(console.error);
