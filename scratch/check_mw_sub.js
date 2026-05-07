const admin = require('firebase-admin');
const path = require('path');

async function checkSubCollection() {
  const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  const db = admin.firestore();
  const businessId = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2'; // MW Trading

  console.log(`--- Checking Sub-collection: businesses/${businessId}/users ---`);
  const snap = await db.collection('businesses').doc(businessId).collection('users').get();
  if (snap.empty) {
    console.log('No users found in sub-collection.');
  } else {
    snap.docs.forEach(doc => {
      console.log(`Sub-User: ${doc.id} | Email: ${doc.data().email} | Role: ${doc.data().role}`);
    });
  }

  console.log('\n--- Checking Permissions Config Doc ---');
  const permSnap = await db.collection('businesses').doc(businessId).collection('configs').doc('permissions').get();
  if (!permSnap.exists) {
    console.log('No permissions config doc found.');
  } else {
    console.log(JSON.stringify(permSnap.data(), null, 2));
  }
}

checkSubCollection().catch(console.error);
