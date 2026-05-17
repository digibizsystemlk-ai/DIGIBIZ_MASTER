const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    console.log("=== Searching for 'Kalu Mama' across collections ===");
    
    const collections = ['customers', 'suppliers', 'scrap_suppliers', 'scrap_loans', 'weekly_loans'];
    
    for (const col of collections) {
        const snap = await db.collection(col).get();
        snap.forEach(doc => {
            const data = doc.data();
            const name = String(data.name || data.supplierName || data.customerName || '').toLowerCase();
            if (name.includes('kalu') || name.includes('mama')) {
                console.log(`Match in collection '${col}' | Doc ID: ${doc.id}`);
                console.log(`  Data:`, JSON.stringify(data, null, 2));
            }
        });
    }
}

main().catch(console.error);
