const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function loadEnvFromDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const s = line.trim();
    if (!s || s.startsWith('#')) return;
    const idx = s.indexOf('=');
    if (idx < 0) return;
    const key = s.slice(0, idx).trim();
    const value = s.slice(idx + 1).trim();
    if (key && process.env[key] == null) process.env[key] = value;
  });
}

function requireEnv(key) {
  const value = String(process.env[key] || '').trim();
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}

function upsertEnvValues(pairs) {
  const envPath = path.join(__dirname, '..', '.env');
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  let lines = existing ? existing.split(/\r?\n/) : [];
  const map = {};
  lines.forEach((line, idx) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=/i);
    if (m) map[m[1]] = idx;
  });
  Object.entries(pairs).forEach(([key, value]) => {
    const line = `${key}=${value}`;
    if (map[key] != null) lines[map[key]] = line;
    else lines.push(line);
  });
  const next = `${lines.filter(Boolean).join('\n')}\n`;
  fs.writeFileSync(envPath, next, 'utf8');
}

async function ensureRep(db, businessId) {
  const repName = process.env.E2E_REP_NAME || 'Playwright E2E Rep';
  const repEmail = process.env.E2E_REP_EMAIL || 'playwright.e2e.rep@digibiz.test';

  let snap = await db.collection('reps')
    .where('businessId', '==', businessId)
    .where('email', '==', repEmail)
    .limit(1)
    .get();

  if (snap.empty) {
    snap = await db.collection('reps')
      .where('businessId', '==', businessId)
      .where('name', '==', repName)
      .limit(1)
      .get();
  }

  if (!snap.empty) {
    const d = snap.docs[0];
    await d.ref.set({ isActive: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { id: d.id, created: false };
  }

  const ref = db.collection('reps').doc();
  await ref.set({
    businessId,
    name: repName,
    email: repEmail,
    phone: process.env.E2E_REP_PHONE || '0770000000',
    route: process.env.E2E_REP_ROUTE || 'Playwright Route',
    role: 'REP',
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return { id: ref.id, created: true };
}

async function ensureShop(db, businessId, repId) {
  const shopName = process.env.E2E_SHOP_NAME || 'Playwright E2E Shop';

  let snap = await db.collection('shops')
    .where('businessId', '==', businessId)
    .where('name', '==', shopName)
    .limit(1)
    .get();

  if (!snap.empty) {
    const d = snap.docs[0];
    await d.ref.set({
      repId,
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { id: d.id, created: false };
  }

  const ref = db.collection('shops').doc();
  await ref.set({
    businessId,
    repId,
    name: shopName,
    address: 'Playwright Test Address',
    phone: '0710000000',
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return { id: ref.id, created: true };
}

async function ensureLorry(db, businessId) {
  const preferredId = process.env.E2E_LORRY_ID || 'LORRY-01';
  let snap = await db.collection('lorries')
    .where('businessId', '==', businessId)
    .where('isActive', '==', true)
    .limit(1)
    .get();
  if (!snap.empty) {
    const d = snap.docs[0];
    await d.ref.set({
      businessId,
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { id: d.id, created: false };
  }

  const ref = db.collection('lorries').doc(preferredId);
  await ref.set({
    businessId,
    lorryCode: 'LORRY-01',
    name: 'Playwright Test Lorry',
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return { id: ref.id, created: true };
}

async function main() {
  loadEnvFromDotEnv();
  const businessId = requireEnv('E2E_BDK_BUSINESS_ID');
  const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  const db = admin.firestore();

  const rep = await ensureRep(db, businessId);
  const shop = await ensureShop(db, businessId, rep.id);
  const lorry = await ensureLorry(db, businessId);

  const values = {
    E2E_REP_ID: rep.id,
    E2E_SHOP_ID: shop.id,
    E2E_LORRY_ID: lorry.id
  };
  upsertEnvValues(values);

  console.log('E2E bootstrap complete');
  console.log(`REP: ${rep.id} (${rep.created ? 'created' : 'existing'})`);
  console.log(`SHOP: ${shop.id} (${shop.created ? 'created' : 'existing'})`);
  console.log(`LORRY: ${lorry.id} (${lorry.created ? 'created' : 'existing'})`);
  console.log('Updated .env keys:', Object.keys(values).join(', '));
}

main().catch((err) => {
  console.error('E2E bootstrap failed:', err.message || err);
  process.exitCode = 1;
});
