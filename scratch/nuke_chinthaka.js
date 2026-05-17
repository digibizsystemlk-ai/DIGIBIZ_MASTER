const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const UID = 'lOJ9icu47Ahe0H3uX6ajhS0dBAu2';
const BIZ_ID = 'lOJ9icu47Ahe0H3uX6ajhS0dBAu2';

const collectionsToClean = [
  'products', 'orders', 'invoices', 'customers', 'reps',
  'inventoryMovements', 'attendance', 'accounting', 'cheques',
  'returns', 'expenses', 'creditAging', 'shopVisits', 'lorryStock'
];

async function nukeChinthaka() {
  console.log(`🚀 Starting full wipe for ${BIZ_ID} (distributor@chinthaka.com)...`);

  try {
    // 1. Delete Business Doc
    await db.collection('businesses').doc(BIZ_ID).delete();
    console.log(`✅ Business document deleted.`);

    // 2. Delete User Doc
    await db.collection('users').doc(UID).delete();
    console.log(`✅ User document deleted.`);

    // 3. Delete Data in Collections
    for (const col of collectionsToClean) {
      const snapshot = await db.collection(col).where('businessId', '==', BIZ_ID).get();
      if (!snapshot.empty) {
        console.log(`🧹 Deleting ${snapshot.size} records from ${col}...`);
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    }
    console.log(`✅ All associated data deleted.`);

    // 4. Delete Auth User
    await auth.deleteUser(UID);
    console.log(`✅ Firebase Auth user deleted.`);

    console.log('---');
    console.log('🏁 SUCCESS: Account distributor@chinthaka.com fully removed.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

nukeChinthaka();
