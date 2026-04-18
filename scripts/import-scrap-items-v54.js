const admin = require('firebase-admin');

const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const BUSINESS_UID = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
const COLLECTION = 'scrap_items';

const RAW_ITEMS = [
  { item: 'POLKATU L', stock: 2570.11, profit: 8, sell: 78 },
  { item: 'POLKATU H', stock: 0.02, profit: 5, sell: 75 },
  { item: 'POTH', stock: 1202.38, profit: 10, sell: 50 },
  { item: 'PUTU L', stock: 72.21, profit: 50, sell: 190 },
  { item: 'PUTU H', stock: -0.01, profit: 50, sell: 190 },
  { item: 'BESAM L', stock: 860.22, profit: 40, sell: 140 },
  { item: 'BESAM H', stock: 149.7, profit: 40, sell: 140 },
  { item: 'YAKADA100', stock: -0.03, profit: 10, sell: 100 },
  { item: 'Yakada-90', stock: 5073.27, profit: 10, sell: 100 },
  { item: 'BARAL', stock: -592.48, profit: 15, sell: 90 },
  { item: 'MOTOR', stock: 228.0, profit: 50, sell: 250 },
  { item: 'BATTERY L', stock: 132.6, profit: 35, sell: 220 },
  { item: 'ALUMINIUM', stock: 282.99, profit: 50, sell: 390 },
  { item: 'THAHADU', stock: -0.05, profit: 13, sell: 78 },
  { item: 'THAHADU L', stock: 499.8, profit: 13, sell: 78 },
  { item: 'PVC', stock: 233.2, profit: 20, sell: 90 },
  { item: 'CAN L', stock: 265.3, profit: 20, sell: 70 },
  { item: 'THABA', stock: 41.2, profit: 450, sell: 2900 },
  { item: 'CHATTI', stock: 736.2, profit: 5, sell: 50 },
  { item: 'FITTINS', stock: 15.72, profit: 150, sell: 600 },
  { item: 'MOTHER BORD', stock: 8.13, profit: 250, sell: 1700 }
];

function toDocId(itemName) {
  return String(itemName || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function importScrapItems() {
  const toImport = RAW_ITEMS.filter((row) => Number(row.stock) !== 0);
  console.log(`Starting import: ${toImport.length} rows (stock != 0).`);

  let created = 0;
  let upserted = 0;

  for (const row of toImport) {
    const itemName = String(row.item || '').trim();
    const currentStock = Number(row.stock) || 0;
    const profit = Number(row.profit) || 0;
    const sellingPrice = Number(row.sell) || 0;
    const costPrice = sellingPrice - profit;
    const docId = `${BUSINESS_UID}_${toDocId(itemName)}`;
    const ref = db.collection(COLLECTION).doc(docId);

    const payload = {
      businessId: BUSINESS_UID,
      itemName,
      currentStock,
      profit,
      sellingPrice,
      costPrice,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await ref.set(payload, { merge: true });
    created += 1;
    upserted += 1;
    console.log(`Upserted ${docId} | stock=${currentStock}, costPrice=${costPrice}`);
  }

  console.log(`Import complete. Upserted: ${upserted}, Total processed: ${toImport.length}`);
}

importScrapItems()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
