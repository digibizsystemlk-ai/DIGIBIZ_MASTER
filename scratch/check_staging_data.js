const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');

const stagingConfig = {
    apiKey: "AIzaSyCN5zyp5Hx8bQSIjipCoKLsHW523X0BwUY",
    authDomain: "digibiz-testing.firebaseapp.com",
    projectId: "digibiz-testing"
};

const app = firebase.initializeApp(stagingConfig);
const db = app.firestore();

async function check() {
    const bid = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
    console.log(`Checking data for Business ID: ${bid} on STAGING...`);

    // 1. Check account balances collection
    const balSnap = await db.collection('account_balances').where('businessId', '==', bid).get();
    console.log(`\n--- ACCOUNT BALANCES COLLECTION (${balSnap.size} docs) ---`);

    // 2. Check Opening Balances (The missing link)
    const openingDoc = await db.collection('journal').doc(bid).collection('ledger_opening').doc('current').get();
    if (openingDoc.exists) {
        console.log(`\n✅ OPENING BALANCES FOUND at journal/${bid}/ledger_opening/current`);
        const data = openingDoc.data();
        const lines = data.lines || [];
        console.log(`Lines: ${lines.length}`);
        lines.slice(0, 5).forEach(l => console.log(`  Code: ${l.accountCode} | Dr: ${l.debit} | Cr: ${l.credit}`));
    } else {
        console.log(`\n❌ NO OPENING BALANCES FOUND at journal/${bid}/ledger_opening/current`);
    }

    // 3. Check Journal Entries count
    const entrySnap = await db.collection('journal_entries').where('businessId', '==', bid).limit(1).get();
    console.log(`\n--- JOURNAL ENTRIES: ${entrySnap.empty ? 'EMPTY' : 'HAS DATA'} ---`);

    process.exit(0);
}

check().catch(err => {
    console.error('Check failed:', err);
    process.exit(1);
});
