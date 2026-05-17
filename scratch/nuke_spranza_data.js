const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const BIZ_ID = 'SPRANZA_PVT_LTD';

const collectionsToClean = [
  'products',
  'orders',
  'invoices',
  'customers',
  'reps',
  'inventoryMovements',
  'attendance',
  'accounting',
  'cheques',
  'returns',
  'expenses',
  'creditAging',
  'shopVisits',
  'lorryStock'
];

async function nukeBusiness() {
  console.log(`🚀 Starting full nuke of business data for: ${BIZ_ID}`);

  for (const col of collectionsToClean) {
    try {
      const snapshot = await db.collection(col).where('businessId', '==', BIZ_ID).get();
      
      if (snapshot.empty) {
        console.log(`ℹ️ No data found in collection: ${col}`);
        continue;
      }

      console.log(`🧹 Deleting ${snapshot.size} records from ${col}...`);
      
      const chunks = [];
      const batchSize = 450;
      let currentBatch = db.batch();
      let count = 0;

      for (const doc of snapshot.docs) {
        currentBatch.delete(doc.ref);
        count++;
        if (count >= batchSize) {
          chunks.push(currentBatch.commit());
          currentBatch = db.batch();
          count = 0;
        }
      }
      if (count > 0) {
        chunks.push(currentBatch.commit());
      }

      await Promise.all(chunks);
      console.log(`✅ Finished cleaning ${col}.`);
    } catch (err) {
      console.error(`❌ Error cleaning ${col}:`, err.message);
    }
  }

  console.log('---');
  console.log('🏁 Full business data wipe complete.');
}

nukeBusiness();
