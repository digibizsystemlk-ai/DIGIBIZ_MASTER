const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Your data
const data = {
  companies: {
    company_demo: {
      name: "ඩෙමෝ සමාගම",
      email: "demo@example.com",
      phone: "0712345678",
      subscriptionStatus: "trial",
      createdAt: new Date()
    }
  },
  users: {
    user_admin: {
      name: "අද්මින්",
      email: "admin@demo.com",
      role: "admin",
      companyId: "company_demo"
    }
  }
};

// Import function
async function importData() {
  for (const [collectionName, documents] of Object.entries(data)) {
    for (const [docId, docData] of Object.entries(documents)) {
      await db.collection(collectionName).doc(docId).set(docData);
      console.log(`✅ Added: ${collectionName}/${docId}`);
    }
  }
  console.log("🎉 Import complete!");
}

importData();