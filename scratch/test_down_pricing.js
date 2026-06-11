const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Mock global objects for compatibility with browser-based JS files
global.window = {
    db: db,
    SmsWalletCore: {
        CREDIT_PER_SMS: 1,
        normalizeWallet: (w, b) => ({ smsBalance: b || 0 }),
        debitOne: (w) => w
    }
};

global.document = {
    querySelector: () => null,
    getElementById: () => null,
    createElement: () => ({ style: {} }),
    body: { appendChild: () => null },
    head: { appendChild: () => null }
};

global.firebase = {
    firestore: {
        FieldValue: {
            serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp()
        }
    }
};

// Require our scrap-vba-core functions
require('../public/core/scrap-vba-core.js');

async function runTest() {
    const businessId = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
    const tempSupplier = 'Test DownPrice Supplier';
    const tempCustId = `${businessId}_TEST_DOWNPRICE_SUP`;
    const tempAdvId = `ADV_${businessId}_TEST_DOWNPRICE_SUPPLIER`;
    
    console.log("=== Setting up Temporary Test Data ===");
    
    // 1. Create temporary customer doc
    await db.collection('customers').doc(tempCustId).set({
        businessId,
        fullName: tempSupplier,
        mobile: '0770000000',
        type: 'supplier',
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    let createdLoanIds = [];
    let createdHistoryIds = [];
    
    const cleanup = async () => {
        console.log("\n=== Cleaning up Temporary Test Data ===");
        await db.collection('customers').doc(tempCustId).delete().catch(() => null);
        await db.collection('scrap_advances').doc(tempAdvId).delete().catch(() => null);
        for (const id of createdLoanIds) {
            await db.collection('hand_loans').doc(id).delete().catch(() => null);
            await db.collection('loan_no_interest').doc(id).delete().catch(() => null);
            await db.collection('weekly_loans').doc(id).delete().catch(() => null);
        }
        for (const id of createdHistoryIds) {
            await db.collection('scrap_advance_history').doc(id).delete().catch(() => null);
        }
        console.log("Cleanup completed.");
    };

    try {
        console.log("\n=== TEST CASE 1: Date is before June 6, 2026 (Effective Limit) ===");
        // Even if there is a loan, it should not trigger before June 6
        const targetDateBefore = new Date('2026-06-05T12:00:00.000Z');
        // Let's create a big loan first
        const hlRef1 = await db.collection('hand_loans').add({
            businessId,
            customerId: tempCustId,
            customerName: tempSupplier,
            balance: 25000,
            type: 'GIVEN',
            date: '2026-06-01',
            active: true
        });
        createdLoanIds.push(hlRef1.id);
        
        let res = await window.scrapVbaCore.evaluateDownBuyingPriceCriteria(businessId, tempSupplier, targetDateBefore);
        console.log("Result before June 6:", res);
        if (res.active) {
            throw new Error("Failed: Triggered before effective date!");
        } else {
            console.log("✅ Success: Inactive before June 6.");
        }
        
        // Clean up hlRef1
        await hlRef1.delete();
        createdLoanIds = [];

        console.log("\n=== TEST CASE 2: No loans, date is after June 15 ===");
        const targetDateAfter = new Date('2026-06-20T12:00:00.000Z');
        res = await window.scrapVbaCore.evaluateDownBuyingPriceCriteria(businessId, tempSupplier, targetDateAfter);
        console.log("Result with no loans:", res);
        if (res.active) {
            throw new Error("Failed: Triggered with no loans!");
        } else {
            console.log("✅ Success: Inactive with no loans.");
        }

        console.log("\n=== TEST CASE 3: Hand Loan > 20,000 Rs. (date is after June 15) ===");
        // Hand Loan of Rs. 25,000, 2 days old (not overdue by 10 days, but > 20,000)
        const hlRef2 = await db.collection('hand_loans').add({
            businessId,
            customerId: tempCustId,
            customerName: tempSupplier,
            balance: 25000,
            type: 'GIVEN',
            date: '2026-06-18', // 2026-06-20 minus 2 days
            active: true
        });
        createdLoanIds.push(hlRef2.id);
        
        res = await window.scrapVbaCore.evaluateDownBuyingPriceCriteria(businessId, tempSupplier, targetDateAfter);
        console.log("Result with Hand Loan > 20,000:", res);
        if (!res.active || !res.reason.includes("Hand Loan outstanding Rs. 25,000")) {
            throw new Error("Failed: Did not trigger on Hand Loan > 20,000!");
        } else {
            console.log("✅ Success: Triggered on Hand Loan > 20,000.");
        }
        
        // Clean up hlRef2
        await hlRef2.delete();
        createdLoanIds = [];

        console.log("\n=== TEST CASE 4: Hand Loan of any value overdue by > 10 days (date is after June 15) ===");
        // Hand Loan of Rs. 500, 11 days old
        const hlRef3 = await db.collection('hand_loans').add({
            businessId,
            customerId: tempCustId,
            customerName: tempSupplier,
            balance: 500,
            type: 'GIVEN',
            date: '2026-06-09', // 2026-06-20 minus 11 days
            active: true
        });
        createdLoanIds.push(hlRef3.id);
        
        res = await window.scrapVbaCore.evaluateDownBuyingPriceCriteria(businessId, tempSupplier, targetDateAfter);
        console.log("Result with Hand Loan > 10 days:", res);
        if (!res.active || !res.reason.includes("Hand Loan outstanding for 11 days")) {
            throw new Error("Failed: Did not trigger on Hand Loan > 10 days!");
        } else {
            console.log("✅ Success: Triggered on Hand Loan > 10 days.");
        }
        
        // Clean up hlRef3
        await hlRef3.delete();
        createdLoanIds = [];

        console.log("\n=== TEST CASE 5: No Interest Loan > 20,000 Rs. (date is after June 15) ===");
        const nilRef1 = await db.collection('loan_no_interest').add({
            businessId,
            customerId: tempCustId,
            customerName: tempSupplier,
            balance: 21000,
            date: '2026-06-18',
            active: true
        });
        createdLoanIds.push(nilRef1.id);
        
        res = await window.scrapVbaCore.evaluateDownBuyingPriceCriteria(businessId, tempSupplier, targetDateAfter);
        console.log("Result with No Interest Loan > 20,000:", res);
        if (!res.active || !res.reason.includes("No Interest Loan outstanding Rs. 21,000")) {
            throw new Error("Failed: Did not trigger on No Interest Loan > 20,000!");
        } else {
            console.log("✅ Success: Triggered on No Interest Loan > 20,000.");
        }
        
        // Clean up nilRef1
        await nilRef1.delete();
        createdLoanIds = [];

        console.log("\n=== TEST CASE 6: Advanced (any value, e.g. Rs. 500) held for 8 days (date is after June 15) ===");
        // Advanced balance of Rs. 500.
        // We will create the active advance document
        await db.collection('scrap_advances').doc(tempAdvId).set({
            businessId,
            supplierName: tempSupplier,
            balance: 500,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Add history record dated 8 days ago (2026-06-12) representing crossing Rs. 500
        const hist1 = await db.collection('scrap_advance_history').add({
            businessId,
            supplierName: tempSupplier,
            amount: 500,
            date: '2026-06-12T12:00:00.000Z',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        createdHistoryIds.push(hist1.id);

        res = await window.scrapVbaCore.evaluateDownBuyingPriceCriteria(businessId, tempSupplier, targetDateAfter);
        console.log("Result with Advance held 8 days:", res);
        if (!res.active || !res.reason.includes("Advance Rs. 500 held for 8 days")) {
            throw new Error("Failed: Did not trigger on Advance held 8 days!");
        } else {
            console.log("✅ Success: Triggered on Advance held 8 days.");
        }

        console.log("\n=== TEST CASE 7: Advanced (any value, e.g. Rs. 500) held for only 3 days ===");
        // Clear old history
        await hist1.delete();
        createdHistoryIds = [];
        // Add history record dated 3 days ago (2026-06-17)
        const hist2 = await db.collection('scrap_advance_history').add({
            businessId,
            supplierName: tempSupplier,
            amount: 500,
            date: '2026-06-17T12:00:00.000Z',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        createdHistoryIds.push(hist2.id);

        res = await window.scrapVbaCore.evaluateDownBuyingPriceCriteria(businessId, tempSupplier, targetDateAfter);
        console.log("Result with Advance held 3 days:", res);
        if (res.active) {
            throw new Error("Failed: Triggered on Advance held only 3 days!");
        } else {
            console.log("✅ Success: Inactive on Advance held only 3 days.");
        }

        console.log("\n=== TEST CASE 8: Weekly Loan installment overdue ===");
        const wlRef = await db.collection('weekly_loans').add({
            businessId,
            customerName: tempSupplier,
            active: true,
            schedule: [
                {
                    amount: 3500,
                    paidAmount: 0,
                    dueDate: '2026-06-10',
                    status: 'OVERDUE'
                }
            ]
        });
        createdLoanIds.push(wlRef.id);

        res = await window.scrapVbaCore.evaluateDownBuyingPriceCriteria(businessId, tempSupplier, targetDateAfter);
        console.log("Result with Weekly Loan overdue:", res);
        if (!res.active || !res.reason.includes("Weekly Loan overdue Rs. 3,500")) {
            throw new Error("Failed: Did not trigger on Weekly Loan overdue!");
        } else {
            console.log("✅ Success: Triggered on Weekly Loan overdue.");
        }

        await wlRef.delete();
        createdLoanIds = createdLoanIds.filter(id => id !== wlRef.id);

        console.log("\n=== TEST CASE 9: Custom downPriceStartDate - Target date is before custom start date ===");
        // Update customer with custom start date 2026-06-15
        await db.collection('customers').doc(tempCustId).update({
            downPriceStartDate: '2026-06-15'
        });
        // Add weekly overdue loan
        const wlRefCustom = await db.collection('weekly_loans').add({
            businessId,
            customerName: tempSupplier,
            active: true,
            schedule: [
                {
                    amount: 3500,
                    paidAmount: 0,
                    dueDate: '2026-06-08',
                    status: 'OVERDUE'
                }
            ]
        });
        createdLoanIds.push(wlRefCustom.id);

        // Target date 2026-06-10 (before 2026-06-15)
        res = await window.scrapVbaCore.evaluateDownBuyingPriceCriteria(businessId, tempSupplier, new Date('2026-06-10T12:00:00.000Z'));
        console.log("Result before custom downPriceStartDate (2026-06-10 < 2026-06-15):", res);
        if (res.active) {
            throw new Error("Failed: Triggered before custom start date!");
        } else {
            console.log("✅ Success: Inactive before custom start date.");
        }

        console.log("\n=== TEST CASE 10: Custom downPriceStartDate - Target date is after custom start date ===");
        // Target date 2026-06-16 (after 2026-06-15)
        res = await window.scrapVbaCore.evaluateDownBuyingPriceCriteria(businessId, tempSupplier, new Date('2026-06-16T12:00:00.000Z'));
        console.log("Result after custom downPriceStartDate (2026-06-16 > 2026-06-15):", res);
        if (!res.active) {
            throw new Error("Failed: Did not trigger after custom start date!");
        } else {
            console.log("✅ Success: Triggered after custom start date.");
        }

        // Clean up
        await wlRefCustom.delete();
        createdLoanIds = createdLoanIds.filter(id => id !== wlRefCustom.id);

    } finally {
        await cleanup();
    }
}

runTest().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
