const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function migrate() {
    console.log('Starting migration...');
    const journalGroup = db.collectionGroup('entries');
    const snap = await journalGroup.get();
    console.log(`Found ${snap.size} total journal entries.`);
    
    let batch = db.batch();
    let count = 0;
    
    for (const doc of snap.docs) {
        const data = doc.data();
        let needsUpdate = false;
        const newEntries = (data.entries || []).map(entry => {
            let ac = entry.accountCode;
            if (ac === 'AC-40100') { ac = '4-4010-01'; needsUpdate = true; }
            if (ac === 'AC-10100') { ac = '1-1010-01'; needsUpdate = true; }
            if (ac === 'AC-10200') { ac = '1-1020-01'; needsUpdate = true; }
            if (ac === 'AC-10300') { ac = '1-1030-01'; needsUpdate = true; }
            if (ac === 'AC-50100') { ac = '5-5010-01'; needsUpdate = true; }
            return { ...entry, accountCode: ac };
        });
        
        let updates = {};
        if (needsUpdate) updates.entries = newEntries;
        if (data.referenceType === undefined && data.description && data.description.includes('Sales Order')) {
            updates.referenceType = 'SALE';
            needsUpdate = true;
        }
        if (data.referenceType === undefined && data.description && data.description.includes('Expense:')) {
            updates.referenceType = 'EXPENSE';
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            batch.update(doc.ref, updates);
            count++;
            if (count % 400 === 0) {
                await batch.commit();
                batch = db.batch();
                console.log(`Committed ${count} updates...`);
            }
        }
    }
    
    if (count % 400 !== 0) {
        await batch.commit();
    }
    console.log(`Migration completed. Updated ${count} entries.`);
}

migrate().then(() => process.exit(0)).catch(console.error);
