const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const UID = 'zFhElVRY4aOSHNzG5HtAkzSds3W2';
const BIZ_ID = 'SPRANZA_PVT_LTD';
const EMAIL = 'spranzaceylon@gmail.com';

async function cleanup() {
  console.log(`Starting cleanup for ${BIZ_ID} (${EMAIL})...`);

  try {
    // 1. Delete Business Doc
    await db.collection('businesses').doc(BIZ_ID).delete();
    console.log(`✅ Business document ${BIZ_ID} deleted.`);

    // 2. Delete User Doc
    await db.collection('users').doc(UID).delete();
    console.log(`✅ User document ${UID} deleted.`);

    // 3. Delete Auth User
    await auth.deleteUser(UID);
    console.log(`✅ Firebase Auth user ${UID} deleted.`);

    console.log('---');
    console.log('SUCCESS: Spranza has been removed. The owner can now register fresh with the same email.');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanup();
