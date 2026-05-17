const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');

const stagingConfig = {
    apiKey: "AIzaSyCN5zyp5Hx8bQSIjipCoKLsHW523X0BwUY",
    authDomain: "digibiz-testing.firebaseapp.com",
    projectId: "digibiz-testing"
};

const testApp = firebase.initializeApp(stagingConfig, 'diag');
const testDb = testApp.firestore();

async function check() {
    const REAL_BID = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
    const USER_EMAIL = 'biz.sirimal@gmail.com';

    console.log(`\n--- DIAGNOSTICS ---`);
    
    // 1. Check User
    const usersSnap = await testDb.collection('users').where('email', '==', USER_EMAIL).get();
    if (usersSnap.empty) {
        console.log(`❌ User ${USER_EMAIL} NOT FOUND in test DB!`);
    } else {
        const u = usersSnap.docs[0].data();
        console.log(`✅ User Found: ${usersSnap.docs[0].id}`);
        console.log(`   Business ID: ${u.businessId}`);
        console.log(`   Role: ${u.role}`);
    }

    // 2. Check Business
    const bizDoc = await testDb.collection('businesses').doc(REAL_BID).get();
    if (!bizDoc.exists) {
        console.log(`❌ Business ${REAL_BID} NOT FOUND in test DB!`);
    } else {
        const b = bizDoc.data();
        console.log(`✅ Business Found: ${bizDoc.id}`);
        console.log(`   Name: ${b.name || b.businessName}`);
        console.log(`   Type: ${b.businessType || b.type}`);
    }

    // 3. Check some data
    const ordersSnap = await testDb.collection('scrap_items').where('businessId', '==', REAL_BID).limit(1).get();
    console.log(`✅ Scrap Items found for this BID: ${ordersSnap.size}`);

    process.exit(0);
}

check().catch(console.error);
