const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/bizsi/Downloads/digibiz-testing-firebase-adminsdk-hmsv0-622839446d.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkCollections() {
    const underscoreSnap = await db.collection('scrap_expenses').limit(5).get();
    console.log('--- scrap_expenses (underscore) ---');
    console.log('Count:', underscoreSnap.size);
    underscoreSnap.forEach(d => console.log(d.id, d.data()));

    const camelSnap = await db.collection('scrapExpenses').limit(5).get();
    console.log('\n--- scrapExpenses (camelCase) ---');
    console.log('Count:', camelSnap.size);
    camelSnap.forEach(d => console.log(d.id, d.data()));
}

checkCollections().catch(console.error);
