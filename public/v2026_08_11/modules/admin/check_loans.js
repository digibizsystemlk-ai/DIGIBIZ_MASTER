
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Assuming this exists or I use existing env

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const businessId = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
const name = 'Chinthaka Jayawardana';

async function checkData() {
    console.log(`--- Checking collections for BID: ${businessId} ---`);
    
    const collections = ['scrap_loans', 'hand_loans', 'loan_advanced_entries', 'scrap_advances'];
    
    for (const coll of collections) {
        const snap = await db.collection(coll).where('businessId', '==', businessId).get();
        console.log(`Collection [${coll}]: Found ${snap.size} documents`);
        snap.forEach(doc => {
            const d = doc.data();
            console.log(` - ID: ${doc.id}, Name: ${d.customerName || d.supplierName || d.name}, Balance: ${d.balance || d.amount}`);
        });
    }
}

checkData().catch(console.error);
