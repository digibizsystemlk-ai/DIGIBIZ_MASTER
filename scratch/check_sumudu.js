const admin = require('firebase-admin');
const serviceAccount = require('i:/DIGIBIZ_MASTER/serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function check() {
    console.log("=== CHECKING SUMUDU DATA ===");
    
    // 1. Advances
    const advSnap = await db.collection('scrap_advances').where('supplierName', '==', 'Sumudu').get();
    advSnap.forEach(d => console.log("Advance Doc:", d.id, d.data()));

    // 2. Loans
    const loanSnap = await db.collection('scrap_loans').where('supplierName', '==', 'Sumudu').get();
    loanSnap.forEach(d => console.log("Loan Doc:", d.id, d.data()));

    // 3. Weekly Loans
    const weeklySnap = await db.collection('weekly_loans').where('customerName', '==', 'Sumudu').get();
    weeklySnap.forEach(d => console.log("Weekly Loan Doc:", d.id, d.data()));

    // 4. Recent Bills
    const billSnap = await db.collection('buying_history')
        .where('supplierName', '==', 'Sumudu')
        .get();
    console.log(`\nFound ${billSnap.size} bills for Sumudu:`);
    billSnap.docs.forEach(d => {
        const data = d.data();
        console.log(`Bill: ${data.billNo || d.id} on ${data.billDateTime}, Total: ${data.billGrandTotal}, CashPaid: ${data.cashPaid}, AdvanceApplied: ${data.advanceApplied}, AccountSnapshot:`, JSON.stringify(data.accountSnapshot, null, 2));
    });
}

check().catch(console.error);
