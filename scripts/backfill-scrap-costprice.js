const admin = require('firebase-admin');

// Usage:
//   node scripts/backfill-scrap-costprice.js --businessId=<OWNER_UID>          (dry run)
//   node scripts/backfill-scrap-costprice.js --businessId=<OWNER_UID> --apply  (write updates)
// Optional:
//   --serviceAccount=./serviceAccountKey.json
//   --limit=1000

const args = process.argv.slice(2);
const getArg = (name, fallback = '') => {
  const key = `--${name}=`;
  const hit = args.find((a) => a.startsWith(key));
  return hit ? hit.slice(key.length) : fallback;
};

const APPLY = args.includes('--apply');
const BUSINESS_ID = getArg('businessId');
const LIMIT = Math.max(1, Number(getArg('limit', '5000')) || 5000);
const SERVICE_ACCOUNT_PATH = getArg('serviceAccount', './serviceAccountKey.json');

if (!BUSINESS_ID) {
  console.error('Missing required argument: --businessId=<OWNER_UID>');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function deriveCostPrice(doc) {
  const existing = toNum(doc.costPrice);
  if (existing > 0) return { costPrice: existing, source: 'already_set' };
  const selling = toNum(doc.sellingPrice);
  const profit = toNum(doc.profit);
  const derived = selling - profit;
  if (derived > 0) return { costPrice: Number(derived.toFixed(2)), source: 'selling_minus_profit' };
  return { costPrice: 0, source: 'unrecoverable' };
}

async function run() {
  console.log(`Starting costPrice backfill for businessId=${BUSINESS_ID}`);
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  const snap = await db
    .collection('scrap_items')
    .where('businessId', '==', BUSINESS_ID)
    .limit(LIMIT)
    .get();

  if (snap.empty) {
    console.log('No scrap_items found for this business.');
    return;
  }

  let inspected = 0;
  let alreadyOk = 0;
  let canBackfill = 0;
  let unrecoverable = 0;
  let updated = 0;
  let skipped = 0;

  let batch = db.batch();
  let batchCount = 0;

  for (const d of snap.docs) {
    inspected += 1;
    const row = d.data() || {};
    const current = toNum(row.costPrice);
    if (current > 0) {
      alreadyOk += 1;
      continue;
    }

    const result = deriveCostPrice(row);
    if (result.costPrice <= 0) {
      unrecoverable += 1;
      console.log(`SKIP ${d.id}: cannot derive (sellingPrice=${row.sellingPrice}, profit=${row.profit})`);
      continue;
    }

    canBackfill += 1;
    console.log(`PLAN ${d.id}: costPrice ${row.costPrice || 0} -> ${result.costPrice}`);

    if (!APPLY) continue;

    batch.update(d.ref, {
      costPrice: result.costPrice,
      costBackfilledAt: admin.firestore.FieldValue.serverTimestamp(),
      costBackfillSource: result.source,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batchCount += 1;

    if (batchCount >= 400) {
      await batch.commit();
      updated += batchCount;
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (APPLY && batchCount > 0) {
    await batch.commit();
    updated += batchCount;
  }

  if (APPLY) {
    skipped = canBackfill - updated;
  }

  console.log('\n---- Summary ----');
  console.log(`Inspected       : ${inspected}`);
  console.log(`Already OK      : ${alreadyOk}`);
  console.log(`Can backfill    : ${canBackfill}`);
  console.log(`Unrecoverable   : ${unrecoverable}`);
  console.log(`Updated         : ${updated}`);
  if (APPLY) console.log(`Not updated     : ${skipped}`);
  console.log('\nDone.');
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
