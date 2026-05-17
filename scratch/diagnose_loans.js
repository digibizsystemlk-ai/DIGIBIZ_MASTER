const admin = require('firebase-admin');
const serviceAccount = require('i:/DIGIBIZ_MASTER/serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

function normalizePersonKey(s) {
    return String(s || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}
function stripNameNoise(s) {
    return String(s || '').trim().replace(/\s+/g, ' ').replace(/(MR\.|MRS\.|MS\.|DR\.)\s+/gi, '');
}
function stripLoanCategoryNoise(s) {
    return String(s || '').trim().replace(/\s+(LOAN|DEBT|ADVANCE|HAND|INTEREST|NO-INTEREST|CREDIT|BAL|BALANCE)\s*$/gi, '');
}
function loanPersonKey(row) {
    return normalizePersonKey(row.customerName || row.name || '');
}
function supplierNameAliases(rawInput) {
    const clean = String(rawInput || '').trim();
    if (!clean) return [];
    const core = stripLoanCategoryNoise(stripNameNoise(clean));
    const out = new Set();
    out.add(clean);
    if (core && core !== clean) out.add(core);
    return Array.from(out);
}

async function diagnose() {
    console.log("=== Fetching business ID and all active advances/loans ===");
    
    // Find the business ID
    const billsSnap = await db.collection('buying_history').orderBy('billDateTime', 'desc').limit(20).get();
    if (billsSnap.empty) {
        console.log("No bills found in buying_history!");
        return;
    }
    
    // Log the recent bills so we can see other customer names tested
    console.log("\n--- Recent 10 bills in buying_history ---");
    billsSnap.docs.forEach((doc, i) => {
        const b = doc.data();
        console.log(`[${i}] ID: ${doc.id} | Supplier: "${b.supplierName}" | Date: ${b.billDateTime} | Total: ${b.netResult || b.totalPayable}`);
    });

    const bid = billsSnap.docs[0].data().businessId;
    console.log(`Using BusinessId: ${bid}`);

    console.log("\n=== 1. Active scrap_advances ===");
    const allAdv = await db.collection('scrap_advances').where('businessId', '==', bid).get();
    console.log(`Total advances found: ${allAdv.size}`);
    allAdv.forEach(d => {
        const data = d.data();
        if (Number(data.balance) > 0) {
            console.log(`ID: "${d.id}" | Supplier: "${data.supplierName}" | Balance: ${data.balance}`);
        }
    });

    console.log("\n=== 2. Active hand_loans ===");
    const handSnap = await db.collection('hand_loans').where('businessId', '==', bid).where('active', '==', true).get();
    console.log(`Total active hand_loans: ${handSnap.size}`);
    handSnap.forEach(d => {
        const data = d.data();
        console.log(`ID: "${d.id}" | Customer: "${data.customerName}" | Balance: ${data.balance}`);
    });

    console.log("\n=== 3. Active loan_no_interest ===");
    const noIntSnap = await db.collection('loan_no_interest').where('businessId', '==', bid).where('active', '==', true).get();
    console.log(`Total active loan_no_interest: ${noIntSnap.size}`);
    noIntSnap.forEach(d => {
        const data = d.data();
        console.log(`ID: "${d.id}" | Customer: "${data.customerName}" | Balance: ${data.balance}`);
    });

    console.log("\n=== 4. Active loan_interest_entries ===");
    const stdSnap = await db.collection('loan_interest_entries').where('businessId', '==', bid).where('active', '==', true).get();
    console.log(`Total active loan_interest_entries: ${stdSnap.size}`);
    stdSnap.forEach(d => {
        const data = d.data();
        const p = Number(data.principalOutstanding || 0);
        const i = Number(data.interestOutstanding || 0);
        console.log(`ID: "${d.id}" | Customer: "${data.customerName}" | Principal: ${p} | Interest: ${i} | Total: ${p + i}`);
    });

    console.log("\n=== 5. Active loan_advanced_entries ===");
    const invSnap = await db.collection('loan_advanced_entries').where('businessId', '==', bid).where('active', '==', true).get();
    console.log(`Total active loan_advanced_entries: ${invSnap.size}`);
    invSnap.forEach(d => {
        const data = d.data();
        const p = Number(data.principalOutstanding || 0);
        const i = Number(data.interestOutstanding || 0);
        console.log(`ID: "${d.id}" | Customer: "${data.customerName}" | Principal: ${p} | Interest: ${i} | Total: ${p + i}`);
    });

    console.log("\n=== 6. Active weekly_loans ===");
    const weeklySnap = await db.collection('weekly_loans').where('businessId', '==', bid).where('active', '==', true).get();
    console.log(`Total active weekly_loans: ${weeklySnap.size}`);
    weeklySnap.forEach(d => {
        const data = d.data();
        console.log(`ID: "${d.id}" | Customer: "${data.customerName}" | Balance: ${data.balance || data.principalOutstanding}`);
    });
}

diagnose().catch(console.error);
