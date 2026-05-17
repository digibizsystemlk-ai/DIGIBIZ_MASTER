const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://digibiz-sys-default-rtdb.firebaseio.com' // or correct RTDB URL if known
    });
}

const db = admin.firestore();

// Mock window and firebase for compatibility with scrap-vba-core.js
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

global.firebase = {
    firestore: {
        FieldValue: {
            serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp()
        }
    }
};

// Mock isScrapSmsEventEnabled and enqueuePendingSms logic
async function testEnqueue() {
    const businessId = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
    const phone = '0789136565';
    const message = 'Test from Antigravity: Sumudu Bill 26051704';

    console.log("=== Running test enqueuePendingSms ===");
    
    const bizIdStr = String(businessId);
    
    // Simulate enqueuePendingSms code
    const settingsRef = db.collection('settings').doc(bizIdStr);
    const pendingRef = db.collection("pending_sms").doc();
    
    try {
        await db.runTransaction(async (tx) => {
            const liveSettingsSnap = await tx.get(settingsRef);
            const liveData = liveSettingsSnap.exists ? (liveSettingsSnap.data() || {}) : {};
            const liveWallet = liveData.smsWallet || {};
            
            const currentBal = liveData.smsBalance || 0;
            if (currentBal < 1) throw new Error("SMS wallet exhausted");
            const postBalance = currentBal - 1;
            
            const payload = {
                businessId: bizIdStr,
                mobile: phone,
                message: message,
                status: "pending",
                gateway: "android_firestore_gateway",
                createdBy: "test_enqueue_sms",
                gatewayDocPath: `sms_gateway/${bizIdStr}/pending_sms/${pendingRef.id}`,
                creditCharged: 1,
                smsBalanceBefore: currentBal,
                smsBalanceAfter: postBalance,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            tx.set(pendingRef, payload);
            tx.set(settingsRef, {
                smsWallet: {
                    ...liveWallet,
                    smsBalance: postBalance,
                    updatedAt: new Date().toISOString()
                },
                smsBalance: postBalance
            }, { merge: true });
        });
        
        console.log("Transaction successfully committed! SMS ID:", pendingRef.id);
    } catch (err) {
        console.error("Transaction failed:", err);
    }
}

testEnqueue().catch(console.error);
