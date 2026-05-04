/**
 * Upsert businesses/{businessId}/users/{uid} for MW-style distributor staff.
 * Requires serviceAccountKey.json in repo root (same as create-collections.js).
 *
 * Usage:
 *   node scripts/upsert-mw-staff-biz-user.js
 *   node scripts/upsert-mw-staff-biz-user.js --uid=OTHER --email=other@mail.com
 */
const admin = require('firebase-admin');

function arg(name, fallback = '') {
  const key = `--${name}=`;
  const raw = process.argv.find((x) => x.startsWith(key));
  return raw ? raw.slice(key.length).trim() : fallback;
}

const MW_BID = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';

async function main() {
  const uid = arg('uid', 'y97TOQSGtvYceACMd3jFNWkzNXI3');
  const businessId = arg('businessId', MW_BID);
  const email = arg('email', 'githilinadilshan@gmail.com').toLowerCase();
  const name = arg('name', 'G.I. Thilina Dilshan');
  const role = arg('role', 'REP');
  const dryRun = arg('dryRun', 'false').toLowerCase() === 'true';

  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  const db = admin.firestore();

  const ref = db.collection('businesses').doc(businessId).collection('users').doc(uid);
  const payload = {
    email,
    role,
    name,
    businessId,
    isActive: true
  };

  console.log('Path:', ref.path);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('dryRun:', dryRun);

  if (dryRun) {
    console.log('(dry run — no write)');
    process.exit(0);
  }

  await ref.set(payload, { merge: true });
  console.log('OK: merged set complete.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
