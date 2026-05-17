const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');

const stagingConfig = {
    apiKey: "AIzaSyCN5zyp5Hx8bQSIjipCoKLsHW523X0BwUY",
    authDomain: "digibiz-testing.firebaseapp.com",
    projectId: "digibiz-testing"
};

const testApp = firebase.initializeApp(stagingConfig, 'final-fix');
const testDb = testApp.firestore();

const USER_EMAIL = 'biz.sirimal@gmail.com';
const REAL_BID = 'oDhSDYHQ2dV1DP33koysmZAqaY13';

async function fix() {
    console.log(`🔍 Fixing profile for ${USER_EMAIL}...`);
    
    const snap = await testDb.collection('users').where('email', '==', USER_EMAIL).get();
    if (snap.empty) {
        console.error('❌ User not found!');
        process.exit(1);
    }
    
    const uid = snap.docs[0].id;
    
    // 1. Force User Profile
    await testDb.collection('users').doc(uid).set({
        businessId: REAL_BID,
        role: 'SUPER_ADMIN',
        email: USER_EMAIL
    }, { merge: true });

    // 2. Force Business Profile Data
    await testDb.collection('businesses').doc(REAL_BID).update({
        businessType: 'scrap_collection_center',
        ownerId: uid,
        status: 'active'
    });

    // 3. Ensure Business User Link
    await testDb.collection('businesses').doc(REAL_BID).collection('users').doc(uid).set({
        role: 'SUPER_ADMIN',
        email: USER_EMAIL,
        businessId: REAL_BID
    }, { merge: true });

    console.log('✅ PROFILE FIXED! User is now forced to Scrap Collection Center.');
    process.exit(0);
}

fix().catch(err => {
    console.error('❌ Fix Failed:', err);
    process.exit(1);
});
