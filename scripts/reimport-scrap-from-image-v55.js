const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const BUSINESS_UID = 'oDhSDYHQ2dV1DP33koysmZAqaY13';

const RAW = [
  ['POLKATU L', 2570.113, 8, 78],
  ['POLKATU H', 0.0223, 5, 75],
  ['POTH', 1202.385, 10, 50],
  ['PUTU L', 72.21494, 50, 190],
  ['PUTU H', -0.005, 50, 190],
  ['BESAM L', 860.2215, 40, 140],
  ['BESAM H', 149.7, 40, 140],
  ['YAKADA100', -0.03016, 10, 100],
  ['Yakada-90', 5073.271, 10, 100],
  ['BARAL', -592.48, 15, 90],
  ['MOTOR', 228.0006, 50, 250],
  ['BATTERY L', 132.6, 35, 220],
  ['BATTERY H', 0, 30, 220],
  ['ALUMINIUM', 282.9945, 50, 390],
  ['ALUMINIUM H', 0, 50, 390],
  ['THAHADU', -0.04918, 13, 78],
  ['THAHADU L', 499.8, 13, 78],
  ['PVC', 233.2, 20, 90],
  ['CAN L', 265.3, 20, 70],
  ['CAN H', 0, 20, 70],
  ['THABA', 41.2, 450, 2900],
  ['CHATTI', 736.2, 5, 50],
  ['FITTINS', 15.723, 150, 600],
  ['MOTHER BORD', 8.131, 250, 1700],
  ['PITHTHALA L', 17.65, 300, 1400],
  ['PITHTHALA H', 0, 250, 1350],
  ['ADI', -52, 50, 200],
  ['AC CORE', 0, 100, 800],
  ['Bear TIN L', 11.1, 50, 200],
  ['BEAR TIN H', 0, 40, 200],
  ['BOTHAL', 0, 0, 0],
  ['LINER', 2, 50, 250],
  ['SAFLY', 4.6, 80, 300],
  ['CERCUIT', 15.8, 70, 270],
  ['HARD', 5, 200, 650],
  ['CARDBORD', 29.5, 5, 25],
  ['Loku Battery', 11.1, 40, 280],
  ['FRIDGE BIG', 0, 0, 3500],
  ['PODI TV', 6, 50, 250],
  ['LOKU TV', 0, 200, 700],
  ['CORE ALUMINIUM', 3.3, 20, 170],
  ['BEAR BOTHAL', 559, 5, 55],
  ['GAL LABAL', 0, 5, 20],
  ['GAL', 679.9867, 2, 10],
  ['KALA', 1669, 1, 4],
  ['PANI', 0.025, 4, 8],
  ['RAA', 178, 5, 30],
  ['KATU', -0.05, 2, 15],
  ['Thaba Core', 0.8133, 150, 900],
  ['Labal Bothal', 0, 2, 10],
  ['Labal Baga', 0, 4, 18],
  ['Labal Kala', 0, -2, 4],
  ['AC In', 0, 25, 250],
  ['AC Out', -245.2, 50, 300],
  ['ENGINE', 53.25, 20, 150],
  ['FILTER & DAL', 285.5, 0, 40],
  ['Ram', 0.3, 4000, 24000],
  ['Procesor', 0.5, 1500, 5000],
  ['Vga', 0, 500, 3500],
  ['Phone Board', 0.9, 2000, 7000],
  ['Green Board', 13.3, 250, 850],
  ['Ic', 0.5, 100, 600],
  ['Yakada', 450.06, 10, 100],
  ['Baral-2', 2960.341, 15, 85],
  ['Lap', 6, 200, 700]
];

function docId(itemName) {
  return `${BUSINESS_UID}_${String(itemName)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}`;
}

const PREVIOUS_V54_ITEMS = [
  'POLKATU L', 'POLKATU H', 'POTH', 'PUTU L', 'PUTU H', 'BESAM L', 'BESAM H',
  'YAKADA100', 'Yakada-90', 'BARAL', 'MOTOR', 'BATTERY L', 'ALUMINIUM', 'THAHADU',
  'THAHADU L', 'PVC', 'CAN L', 'THABA', 'CHATTI', 'FITTINS', 'MOTHER BORD'
];

async function clearKnownPrevious() {
  const batch = db.batch();
  const clearNames = new Set([...PREVIOUS_V54_ITEMS, ...RAW.map((r) => r[0]), 'PITHHALA I', 'GAL ABAL']);
  clearNames.forEach((name) => {
    batch.delete(db.collection('scrap_items').doc(docId(name)));
  });
  await batch.commit();
  return clearNames.size;
}

async function importData() {
  const deleted = await clearKnownPrevious();
  let inserted = 0;
  let skippedZero = 0;
  for (const [itemName, stock, profit, sell] of RAW) {
    if (Number(stock) === 0) {
      skippedZero += 1;
      continue;
    }
    const sellingPrice = Number(sell) || 0;
    const p = Number(profit) || 0;
    const payload = {
      businessId: BUSINESS_UID,
      itemName,
      currentStock: Number(stock),
      profit: p,
      sellingPrice,
      costPrice: sellingPrice - p,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('scrap_items').doc(docId(itemName)).set(payload, { merge: true });
    inserted += 1;
  }
  console.log(`Deleted old: ${deleted}`);
  console.log(`Inserted/Updated: ${inserted}`);
  console.log(`Skipped stock=0: ${skippedZero}`);
}

importData()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Reimport failed:', e);
    process.exit(1);
  });
