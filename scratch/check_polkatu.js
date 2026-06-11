const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function run() {
    console.log("=== Checking scrap_items for 'පොල්කටු' ===");
    const itemsSnap = await db.collection('scrap_items').get();
    let polkatuFound = false;
    itemsSnap.forEach((doc) => {
        const data = doc.data();
        const name = data.name || '';
        if (name.includes('පොල්කටු') || name.includes('polkatu')) {
            console.log(`Doc ID: ${doc.id}`);
            console.log(`  Name: ${name}`);
            console.log(`  Business ID: ${data.businessId}`);
            console.log(`  Current Stock: ${data.currentStock}`);
            console.log(`  Cost Price: ${data.costPrice}`);
            console.log(`  Selling Price: ${data.sellingPrice}`);
            console.log(`  Last Alerted Stock: ${data.lastAlertedStock}`);
            polkatuFound = true;
        }
    });
    if (!polkatuFound) {
        console.log("❌ No item containing 'පොල්කටු' or 'polkatu' found in scrap_items.");
    }

    console.log("\n=== Checking customers for 'Chamara' ===");
    const customersSnap = await db.collection('customers').get();
    let chamaraFound = false;
    customersSnap.forEach((doc) => {
        const data = doc.data();
        const name = data.fullName || data.name || '';
        if (name.toLowerCase().includes('chamara')) {
            console.log(`Doc ID: ${doc.id}`);
            console.log(`  Full Name: ${name}`);
            console.log(`  Business ID: ${data.businessId}`);
            console.log(`  Mobile: ${data.mobile || data.phone}`);
            console.log(`  Type: ${data.type}`);
            console.log(`  Context: ${data.context}`);
            chamaraFound = true;
        }
    });
    if (!chamaraFound) {
        console.log("❌ No customer named 'Chamara' found.");
    }

    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
