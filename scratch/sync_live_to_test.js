const admin = require('firebase-admin');
const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');
const fs = require('fs');
const path = require('path');

// LIVE PROJECT (SOURCE)
const liveServiceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'));
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(liveServiceAccount) }, 'live');
}
const liveDb = admin.app('live').firestore();

// TESTING PROJECT (DESTINATION)
const stagingConfig = {
    apiKey: "AIzaSyCN5zyp5Hx8bQSIjipCoKLsHW523X0BwUY",
    authDomain: "digibiz-testing.firebaseapp.com",
    projectId: "digibiz-testing"
};
if (!firebase.apps.length) {
    firebase.initializeApp(stagingConfig, 'test');
}
const testDb = firebase.app('test').firestore();

function convertTimestamps(data) {
    if (!data || typeof data !== 'object') return data;
    if (typeof data.toDate === 'function') return data.toDate();
    if (Array.isArray(data)) return data.map(convertTimestamps);
    const converted = {};
    for (const key in data) converted[key] = convertTimestamps(data[key]);
    return converted;
}

async function writeDoc(colPath, docId, data) {
    try {
        await testDb.collection(colPath).doc(docId).set(data, { merge: true });
    } catch (err) {
        console.error(`  Error: ${colPath}/${docId}`, err.message);
    }
}

async function mirrorCollectionRecursive(collectionRef, parentPath = '', subColMap = {}) {
    const colId = collectionRef.id;
    const fullPath = parentPath ? `${parentPath}/${colId}` : colId;
    
    const snap = await collectionRef.get();
    if (snap.empty) return;

    console.log(`🌀 Mirroring: ${fullPath} (${snap.size} docs)`);

    const tasks = snap.docs.map(async (doc) => {
        const data = convertTimestamps(doc.data());
        const docPath = `${fullPath}/${doc.id}`;
        
        await writeDoc(fullPath, doc.id, data);

        // Discovery via listCollections (Admin only)
        const subCollections = await doc.ref.listCollections();
        const discoveredNames = subCollections.map(c => c.id);

        // Merge with explicit subColMap for robustness
        const explicitSubs = subColMap[colId] || [];
        const allSubs = Array.from(new Set([...discoveredNames, ...explicitSubs]));

        for (const subId of allSubs) {
            await mirrorCollectionRecursive(doc.ref.collection(subId), docPath, subColMap);
        }
    });

    await Promise.all(tasks);
}

async function ultimateSyncV6() {
    const startTime = Date.now();
    console.log('\n🚀 ULTIMATE ACCOUNTING SYNC (V6 - Explicit Journal Sync)...\n');

    const subColMap = {
        'journal': ['entries', 'account_ledger', 'ledger_opening', 'history'],
        'businesses': ['users', 'settings', 'rbacConfig'],
        'accounts': ['list'],
        'products': ['list'],
        'suppliers': ['list'],
        'customers': ['list']
    };

    // Force sync critical accounting collections first
    const criticalCols = ['journal', 'account_balances', 'ledger_opening', 'journal_entries', 'businesses'];
    
    for (const colId of criticalCols) {
        console.log(`🎯 Targeted Sync: ${colId}`);
        await mirrorCollectionRecursive(liveDb.collection(colId), '', subColMap);
    }

    // Then discover the rest
    const allRoots = await liveDb.listCollections();
    for (const col of allRoots) {
        if (!criticalCols.includes(col.id)) {
            await mirrorCollectionRecursive(col, '', subColMap);
        }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🏆 SYNC COMPLETE! Total Time: ${duration}s`);
    process.exit(0);
}

ultimateSyncV6().catch(err => {
    console.error('\n❌ Sync Failed:', err);
    process.exit(1);
});
