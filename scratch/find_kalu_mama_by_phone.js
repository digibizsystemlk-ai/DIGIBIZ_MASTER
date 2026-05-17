const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    const phone = '0775031745';
    const normPhone = '94775031745';
    console.log(`=== Searching collections for phone: ${phone} / ${normPhone} ===`);
    
    const collections = ['customers', 'suppliers', 'scrap_suppliers', 'scrap_loans', 'weekly_loans'];
    
    for (const col of collections) {
        const snap = await db.collection(col).get();
        snap.forEach(doc => {
            const data = doc.data();
            const mobile = String(data.mobile || data.phone || '').replace(/[ -]/g, "");
            if (mobile.includes(phone) || mobile.includes(normPhone)) {
                console.log(`Match in collection '${col}' | Doc ID: ${doc.id}`);
                console.log(`  Data:`, JSON.stringify(data, null, 2));
            }
        });
    }
}

main().catch(console.error);
