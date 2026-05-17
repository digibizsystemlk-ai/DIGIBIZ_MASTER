const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixAjith() {
    console.log('--- Searching for all Ajith records ---');
    const custSnap = await db.collection('customers').where('name', '==', 'Ajith').get();
    
    const correctPhone = '0717302495';
    let deleteCount = 0;

    for (const doc of custSnap.docs) {
        const data = doc.data();
        if (data.phone !== correctPhone) {
            console.log(`Deleting incorrect Ajith record: ID=${doc.id}, Phone=${data.phone}`);
            await doc.ref.delete();
            deleteCount++;
        } else {
            console.log(`Keeping correct Ajith record: ID=${doc.id}, Phone=${data.phone}`);
        }
    }
    
    console.log(`\nDone! Deleted ${deleteCount} incorrect records.`);
}

fixAjith().catch(console.error);
