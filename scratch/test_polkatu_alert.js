const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Mock window, document, and firebase for compatibility with browser-based JS
global.window = {
    db: db,
    SmsWalletCore: {
        CREDIT_PER_SMS: 1,
        normalizeWallet: (liveWallet, smsBalance) => {
            return {
                smsBalance: smsBalance || 0,
                trialSmsBalance: liveWallet.trialSmsBalance || 0,
                paidSmsBalance: liveWallet.paidSmsBalance || 0
            };
        },
        debitOne: (normalized) => {
            return {
                ...normalized,
                smsBalance: normalized.smsBalance - 1,
                paidSmsBalance: normalized.paidSmsBalance - 1
            };
        }
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

// Require our updated scrap-vba-core functions
require('../public/core/scrap-vba-core.js');

async function testAlertSystem() {
    const businessId = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
    const polkatuDocId = 'oDhSDYHQ2dV1DP33koysmZAqaY13_POLKATU_L';
    
    console.log("=== STEP 1: Test getChamaraPhoneNumber ===");
    const phone = await window.scrapVbaCore.getChamaraPhoneNumber(businessId);
    console.log(`Chamara phone number: ${phone}`);
    if (!phone) {
        throw new Error("Chamara phone number not found! Test failed.");
    }
    
    console.log("\n=== STEP 2: Read current Polkatu State ===");
    const itemRef = db.collection('scrap_items').doc(polkatuDocId);
    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) {
        throw new Error("Polkatu item document not found!");
    }
    const originalData = itemSnap.data();
    console.log(`Original Stock: ${originalData.currentStock}`);
    console.log(`Original lastAlertedStock: ${originalData.lastAlertedStock}`);

    // Save original values to restore them later
    const originalStock = originalData.currentStock;
    const originalLastAlerted = originalData.lastAlertedStock ?? null;

    try {
        console.log("\n=== STEP 3: Test Alert Trigger - Setting Stock to 850 (Rounds to 900) ===");
        // Set stock to 850, and clear lastAlertedStock to force alert
        await itemRef.update({
            currentStock: 850,
            lastAlertedStock: admin.firestore.FieldValue.delete()
        });

        console.log("Simulating listener transaction check...");
        // Retrieve fresh doc
        const freshSnap = await itemRef.get();
        const freshData = freshSnap.data();
        const currentStock = Number(freshData.currentStock || 0);
        const lastAlerted = Number(freshData.lastAlertedStock || 0);
        
        console.log(`Fresh stock is: ${currentStock}, lastAlerted: ${lastAlerted}`);
        let shouldTriggerSms = false;
        let smsRoundedVal = 0;

        if (currentStock > 800) {
            const roundedNew = Math.round(currentStock / 100) * 100;
            if (roundedNew >= 800 && roundedNew !== lastAlerted) {
                // Atomic transaction
                const txResult = await db.runTransaction(async (transaction) => {
                    const txDoc = await transaction.get(itemRef);
                    if (!txDoc.exists) return { send: false };
                    const txData = txDoc.data() || {};
                    const dbLastAlerted = Number(txData.lastAlertedStock || 0);
                    const freshStock = Number(txData.currentStock || 0);
                    const freshRounded = Math.round(freshStock / 100) * 100;
                    
                    if (freshStock > 800 && freshRounded >= 800 && dbLastAlerted !== freshRounded) {
                        transaction.update(itemRef, { lastAlertedStock: freshRounded });
                        return { send: true, roundedVal: freshRounded };
                    }
                    return { send: false };
                });

                shouldTriggerSms = txResult.send;
                smsRoundedVal = txResult.roundedVal;
            }
        }

        console.log(`Should trigger SMS? ${shouldTriggerSms}`);
        if (shouldTriggerSms) {
            console.log(`SMS would say: "Hi Chamara, we have around ${smsRoundedVal} kg in stock."`);
            
            // Queue actual SMS test
            await window.scrapVbaCore.sendPolkatuAlertSms(businessId, smsRoundedVal);
            
            // Let's verify a pending_sms was created (using simple query without orderBy to avoid index requirement)
            console.log("Verifying pending_sms collection...");
            const pendingSnap = await db.collection('pending_sms')
                .where('businessId', '==', businessId)
                .limit(50)
                .get();
                
            let foundOurSms = false;
            pendingSnap.forEach((doc) => {
                const smsData = doc.data();
                if (smsData.message && smsData.message.includes(`we have around ${smsRoundedVal}`)) {
                    console.log(`✅ Pending SMS Found in DB! ID: ${doc.id}`);
                    console.log(`   To: ${smsData.mobile}`);
                    console.log(`   Message: "${smsData.message}"`);
                    console.log(`   Created By: ${smsData.createdBy}`);
                    foundOurSms = true;
                }
            });
            if (!foundOurSms) {
                console.log(`❌ No matching pending SMS found in the returned batch.`);
            }
        } else {
            console.log("❌ Alert transaction did not return true.");
        }

        console.log("\n=== STEP 4: Test Alert Duplication Prevention ===");
        console.log("Simulating same trigger check again with no stock change...");
        // Recheck with same stock (850) and see if transaction prevents send
        const repeatSnap = await itemRef.get();
        const repeatData = repeatSnap.data();
        const repeatStock = Number(repeatData.currentStock || 0);
        const repeatLastAlerted = Number(repeatData.lastAlertedStock || 0);
        
        let shouldTriggerSmsAgain = false;
        if (repeatStock > 800) {
            const roundedNew = Math.round(repeatStock / 100) * 100;
            if (roundedNew >= 800 && roundedNew !== repeatLastAlerted) {
                const txResult = await db.runTransaction(async (transaction) => {
                    const txDoc = await transaction.get(itemRef);
                    const txData = txDoc.data() || {};
                    const dbLastAlerted = Number(txData.lastAlertedStock || 0);
                    const freshStock = Number(txData.currentStock || 0);
                    const freshRounded = Math.round(freshStock / 100) * 100;
                    if (freshStock > 800 && freshRounded >= 800 && dbLastAlerted !== freshRounded) {
                        transaction.update(itemRef, { lastAlertedStock: freshRounded });
                        return { send: true };
                    }
                    return { send: false };
                });
                shouldTriggerSmsAgain = txResult.send;
            }
        }
        console.log(`Should trigger SMS again? ${shouldTriggerSmsAgain}`);
        if (!shouldTriggerSmsAgain) {
            console.log("✅ Duplication prevention verified successfully (SMS was NOT sent again)!");
        } else {
            console.log("❌ Error: Duplication prevention failed (SMS would have been sent again)!");
        }

    } finally {
        console.log("\n=== STEP 5: Restoring Original Polkatu State ===");
        const restorePayload = {
            currentStock: originalStock
        };
        if (originalLastAlerted === null) {
            restorePayload.lastAlertedStock = admin.firestore.FieldValue.delete();
        } else {
            restorePayload.lastAlertedStock = originalLastAlerted;
        }
        await itemRef.update(restorePayload);
        console.log("Original stock and lastAlertedStock restored successfully!");
    }
    
    process.exit(0);
}

testAlertSystem().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
