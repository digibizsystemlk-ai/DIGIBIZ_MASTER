const admin = require('firebase-admin');
const crypto = require('crypto');

function arg(name, fallback = '') {
  const key = `--${name}=`;
  const raw = process.argv.find((x) => x.startsWith(key));
  return raw ? raw.slice(key.length).trim() : fallback;
}

function requireArg(name) {
  const v = arg(name);
  if (!v) {
    throw new Error(`Missing required argument --${name}=...`);
  }
  return v;
}

async function main() {
  const email = requireArg('email').toLowerCase();
  const businessName = arg('name', 'KDU Tea Factory');
  const requestedBusinessId = arg('businessId', '');
  const dryRun = arg('dryRun', 'false').toLowerCase() === 'true';

  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();

  console.log('--- TEA FACTORY bootstrap ---');
  console.log('email:', email);
  console.log('businessName:', businessName);
  console.log('requestedBusinessId:', requestedBusinessId || '(auto)');
  console.log('dryRun:', dryRun);

  const usersSnap = await db.collection('users').where('email', '==', email).limit(2).get();
  if (usersSnap.empty) {
    throw new Error(`No users/{uid} document found for email: ${email}`);
  }
  if (usersSnap.size > 1) {
    throw new Error(`Multiple users found for email ${email}. Please clean duplicates first.`);
  }

  const userDoc = usersSnap.docs[0];
  const uid = userDoc.id;
  const userData = userDoc.data() || {};
  const businessId = requestedBusinessId || `tea_${crypto.randomBytes(8).toString('hex')}`;

  console.log('resolved uid:', uid);
  console.log('existing user businessId:', userData.businessId || '(none)');
  console.log('target businessId:', businessId);

  const businessPayload = {
    name: businessName,
    businessType: 'tea_factory',
    ownerId: uid,
    email: email,
    createdAt: now,
    updatedAt: now
  };

  const userPayload = {
    businessId: businessId,
    businessType: 'tea_factory',
    role: 'BUSINESS_OWNER',
    updatedAt: now
  };

  const membershipPayload = {
    role: 'BUSINESS_OWNER',
    email: email,
    businessId: businessId,
    linkedAt: now,
    linkedBy: uid
  };

  const bootstrapPayload = {
    businessId: businessId,
    businessType: 'tea_factory',
    initializedCollections: ['products', 'orders', 'journal'],
    note: 'Collections are created lazily by Firestore when first doc is written.',
    initializedAt: now
  };

  if (dryRun) {
    console.log('\n[DRY RUN] Would write:');
    console.log('- businesses/' + businessId, businessPayload);
    console.log('- users/' + uid, userPayload);
    console.log('- businesses/' + businessId + '/users/' + uid, membershipPayload);
    console.log('- _bootstrap/business_init_' + businessId, bootstrapPayload);
    return;
  }

  const batch = db.batch();
  batch.set(db.collection('businesses').doc(businessId), businessPayload, { merge: true });
  batch.set(db.collection('users').doc(uid), userPayload, { merge: true });
  batch.set(db.collection('businesses').doc(businessId).collection('users').doc(uid), membershipPayload, { merge: true });
  batch.set(db.collection('_bootstrap').doc(`business_init_${businessId}`), bootstrapPayload, { merge: true });

  await batch.commit();

  console.log('\n✅ TEA FACTORY business bootstrap completed');
  console.log('businessId:', businessId);
  console.log('uid:', uid);
  console.log('email:', email);
}

main().catch((err) => {
  console.error('\n❌ Bootstrap failed:', err.message || err);
  process.exitCode = 1;
});

