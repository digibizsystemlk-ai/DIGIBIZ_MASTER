/**
 * Automated PRO Account Version Lock Backfill Script — DIGIBIZ
 * Auto-locks all existing PRO plan business accounts to the stable v2026_08_11 snapshot vault.
 */
const admin = require('i:/DIGIBIZ_MASTER/functions/node_modules/firebase-admin');
const serviceAccount = require('I:/DIGIBIZ_MASTER/serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function backfillProVersionLocks() {
    console.log('[ProVersionLock] 🚀 Scanning Firestore settings & businesses for PRO plan accounts...');

    const versionTag = 'STABLE_FREEZE_2026_08_11';
    const snapshotPath = '/v2026_08_11/';
    const freezeDate = '2026-08-11';
    const flags = {
        suppressAutoUpdates: true,
        suppressBetaFeatures: true,
        lockBusinessType: true,
        bypassPwaPrompt: false
    };

    let lockedCount = 0;
    const settingsSnap = await db.collection('settings').get();

    console.log(`[ProVersionLock] Evaluating ${settingsSnap.size} settings documents...`);

    for (const sDoc of settingsSnap.docs) {
        const sData = sDoc.data() || {};
        const sub = sData.subscription || {};
        const planStr = String(sub.plan || sub.status || sData.plan || '').toUpperCase();
        const isPro = planStr.includes('PRO') || planStr.includes('ACTIVE') || planStr.includes('ENTERPRISE') || planStr.includes('PAID');

        if (isPro) {
            const bizId = sDoc.id;
            const bizDoc = await db.collection('businesses').doc(bizId).get();
            const bData = bizDoc.exists ? (bizDoc.data() || {}) : {};
            const ownerEmail = String(bData.ownerEmail || bData.email || sData.ownerEmail || '').trim().toLowerCase();
            const bizName = bData.name || bData.businessName || sData.businessName || bizId;

            console.log(`🔒 Auto-Locking PRO Account: ${bizName} (BID: ${bizId}, Email: ${ownerEmail || 'N/A'}) - Plan: ${planStr}`);

            // 1. Lock business doc
            if (bizDoc.exists) {
                await bizDoc.ref.set({
                    versionLock: true,
                    lockedVersionTag: versionTag,
                    snapshotPath: snapshotPath,
                    freezeDate: freezeDate,
                    profileLocked: true
                }, { merge: true });
            }

            // 2. Lock client_version_control & users docs if ownerEmail is available
            if (ownerEmail) {
                const docId = ownerEmail.replace(/[^a-z0-9@]/g, '_');
                await db.collection('client_version_control').doc(docId).set({
                    email: ownerEmail,
                    lockStatus: 'LOCKED',
                    isLocked: true,
                    versionTag: versionTag,
                    snapshotPath: snapshotPath,
                    freezeDate: freezeDate,
                    flags: flags,
                    notes: 'Auto-locked upon PRO Plan activation',
                    updatedBy: 'SYSTEM_AUTO_PRO_LOCK',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                const uSnap = await db.collection('users').where('email', '==', ownerEmail).get();
                uSnap.forEach(uDoc => {
                    uDoc.ref.set({
                        versionLock: true,
                        lockedVersionTag: versionTag,
                        snapshotPath: snapshotPath,
                        freezeDate: freezeDate
                    }, { merge: true });
                });
            }

            lockedCount++;
        }
    }

    console.log(`\n[ProVersionLock] ✅ Backfill completed! ${lockedCount} PRO accounts locked to ${versionTag}.`);
}

backfillProVersionLocks().then(() => process.exit(0)).catch(console.error);
