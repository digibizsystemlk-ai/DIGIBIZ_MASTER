const admin = require('firebase-admin');
const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');
const fs = require('fs');
const path = require('path');

// Live Admin Setup
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'));
const liveApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
}, 'live_final_v2');
const liveDb = liveApp.firestore();

// Testing Client Setup
const stagingConfig = {
    apiKey: "AIzaSyCN5zyp5Hx8bQSIjipCoKLsHW523X0BwUY",
    authDomain: "digibiz-testing.firebaseapp.com",
    projectId: "digibiz-testing"
};
const testApp = firebase.initializeApp(stagingConfig, 'test_final_v2');
const testDb = testApp.firestore();

function convertTimestamps(data) {
    if (!data || typeof data !== 'object') return data;
    if (typeof data.toDate === 'function') return data.toDate();
    if (Array.isArray(data)) return data.map(convertTimestamps);
    const converted = {};
    for (const key in data) converted[key] = convertTimestamps(data[key]);
    return converted;
}

const TARGET_BID = 'oDhSDYHQ2dV1DP33koysmZAqaY13';

async function recover() {
    console.log(`🚀 Recovering Business (with Timestamp Fix): ${TARGET_BID}`);
    
    const liveDoc = await liveDb.collection('businesses').doc(TARGET_BID).get();
    if (!liveDoc.exists) {
        console.error('❌ NOT FOUND IN LIVE!');
        process.exit(1);
    }
    
    const data = convertTimestamps(liveDoc.data());
    data.businessType = 'scrap_collection_center';
    
    await testDb.collection('businesses').doc(TARGET_BID).set(data);
    console.log(`✅ Business Restored in Testing!`);

    const liveSettings = await liveDb.collection('settings').doc(TARGET_BID).get();
    if (liveSettings.exists) {
        await testDb.collection('settings').doc(TARGET_BID).set(convertTimestamps(liveSettings.data()));
        console.log(`✅ Settings Restored in Testing!`);
    }

    process.exit(0);
}

recover().catch(err => {
    console.error('❌ Recovery Failed:', err);
    process.exit(1);
});
