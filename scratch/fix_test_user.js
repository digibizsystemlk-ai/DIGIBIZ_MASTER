const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');

const stagingConfig = {
    apiKey: "AIzaSyCN5zyp5Hx8bQSIjipCoKLsHW523X0BwUY",
    authDomain: "digibiz-testing.firebaseapp.com",
    projectId: "digibiz-testing"
};

const testApp = firebase.initializeApp(stagingConfig, 'fix-user');
const testDb = testApp.firestore();

const USER_EMAIL = 'biz.sirimal@gmail.com';
const REAL_BID = 'oDhSDYHQ2dV1DP33koysmZAqaY13';

async function fix() {
    console.log(`🔍 Searching for user ${USER_EMAIL} in Testing Project...`);
    
    // We search the 'users' collection for the email
    const snap = await testDb.collection('users').where('email', '==', USER_EMAIL).get();
    
    if (snap.empty) {
        console.error('❌ User not found. Did you register with biz.sirimal@gmail.com?');
        process.exit(1);
    }
    
    const userDoc = snap.docs[0];
    const uid = userDoc.id;
    console.log(`✅ Found User! UID: ${uid}`);
    
    console.log(`🔗 Linking UID ${uid} to Business ${REAL_BID}...`);
    
    // 1. Update user document
    await testDb.collection('users').doc(uid).update({
        businessId: REAL_BID,
        role: 'SUPER_ADMIN'
    });
    
    // 2. Update business document to set this UID as owner
    await testDb.collection('businesses').doc(REAL_BID).update({
        ownerId: uid
    });
    
    // 3. Ensure biz user membership
    await testDb.collection('businesses').doc(REAL_BID).collection('users').doc(uid).set({
        email: USER_EMAIL,
        role: 'SUPER_ADMIN',
        businessId: REAL_BID
    }, { merge: true });

    console.log('🌟 SUCCESS! Your account is now linked to the mirrored data.');
    process.exit(0);
}

fix().catch(err => {
    console.error('❌ Fix Failed:', err);
    process.exit(1);
});
