/**
 * Deletes Firestore documents in `pending_sms` where status == "sent".
 * Uses Firebase Admin SDK (bypasses security rules — no client "Permission denied").
 *
 * Prerequisites:
 *   - Place service account JSON at repo root as `serviceAccountKey.json`
 *   - Service account must have Firestore delete permission (e.g. Editor / Firebase Admin)
 *
 * Run:
 *   node scripts/cleanup-pending-sms-sent.js
 *
 * Optional:
 *   BATCH_LIMIT=500 node scripts/cleanup-pending-sms-sent.js
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error(
        'Missing credentials: expected file at\n  ' +
            serviceAccountPath +
            '\nAdd your Firebase service account JSON there (same as other scripts in /scripts).'
    );
    process.exit(1);
}

let serviceAccount;
try {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} catch (e) {
    console.error('Could not read or parse serviceAccountKey.json:', e && e.message ? e.message : e);
    process.exit(1);
}

if (!serviceAccount.project_id && !serviceAccount.projectId) {
    console.error('serviceAccountKey.json does not look like a valid Firebase service account (missing project_id).');
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const BATCH_LIMIT = Math.min(500, Math.max(1, parseInt(process.env.BATCH_LIMIT || '400', 10)));

async function deleteSentBatch() {
    const snap = await db.collection('pending_sms').where('status', '==', 'sent').limit(BATCH_LIMIT).get();
    if (snap.empty) {
        console.log('No pending_sms documents with status "sent".');
        return 0;
    }
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Deleted ${snap.size} document(s) with status "sent".`);
    return snap.size;
}

async function main() {
    let total = 0;
    let n;
    do {
        n = await deleteSentBatch();
        total += n;
    } while (n === BATCH_LIMIT);
    console.log('Done. Total deleted:', total);
    process.exit(0);
}

main().catch((err) => {
    console.error(err && err.message ? err.message : err);
    if (err && err.code === 7) {
        console.error(
            'Hint: Permission denied — ensure serviceAccountKey.json is for this Firebase project and has Firestore access.'
        );
    }
    process.exit(1);
});
