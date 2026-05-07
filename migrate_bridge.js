
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  const bid = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2'; // MW Trading
  console.log('Migrating permissions to rbacConfig with version for:', bid);
  
  const snap = await db.collection('businesses').doc(bid).collection('configs').doc('permissions').get();
  if (snap.exists) {
    const data = snap.data();
    await db.collection('businesses').doc(bid).update({
      rbacConfig: data,
      permVersion: Date.now()
    });
    console.log('✅ Migration successful!');
  } else {
    console.log('❌ No permissions found to migrate.');
  }
}

migrate().then(() => process.exit());
