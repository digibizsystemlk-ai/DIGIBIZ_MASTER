const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function debugMWTrading() {
  const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  const db = admin.firestore();
  const businessId = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2'; // MW Trading

  console.log(`--- Debugging MW Trading (ID: ${businessId}) ---`);

  // 1. Check Business Doc
  const bizDoc = await db.collection('businesses').doc(businessId).get();
  if (!bizDoc.exists) {
    console.log('Business document not found!');
  } else {
    const data = bizDoc.data();
    console.log(`Business Type: ${data.businessType}`);
    console.log(`Status: ${data.status}`);
    console.log(`Permissions Configured: ${!!data.permissionsConfig}`);
  }

  // 2. Check Reps
  console.log('\n--- Reps for MW Trading ---');
  const repsSnap = await db.collection('reps').where('businessId', '==', businessId).limit(10).get();
  if (repsSnap.empty) {
    console.log('No reps found in "reps" collection for this businessId.');
  } else {
    repsSnap.docs.forEach(doc => {
      const d = doc.data();
      console.log(`Rep: ${d.name} | Email: ${d.email} | Role: ${d.role} | Active: ${d.isActive}`);
    });
  }

  // 3. Check Users collection (Auth sync)
  console.log('\n--- Users linked to MW Trading ---');
  const usersSnap = await db.collection('users').where('businessId', '==', businessId).limit(10).get();
  if (usersSnap.empty) {
    console.log('No users found in "users" collection with this businessId.');
  } else {
    usersSnap.docs.forEach(doc => {
      const d = doc.data();
      console.log(`User: ${d.name} | Email: ${d.email} | Role: ${d.role}`);
    });
  }

  // 4. Check Sidebar Config if any
  if (bizDoc.exists && bizDoc.data().sidebarConfig) {
    console.log('\n--- Sidebar Config ---');
    console.log(JSON.stringify(bizDoc.data().sidebarConfig, null, 2));
  }
}

debugMWTrading().catch(console.error);
