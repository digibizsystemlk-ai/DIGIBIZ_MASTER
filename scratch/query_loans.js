const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  console.log("=== CUSTOMERS ===");
  const cSnap = await db.collection('customers')
    .where('businessId', '==', 'oDhSDYHQ2dV1DP33koysmZAqaY13')
    .get();
  
  cSnap.forEach(d => {
    const data = d.data();
    if (data.fullName.toLowerCase().includes("sumudu") || data.name?.toLowerCase().includes("sumudu")) {
      console.log(`CustID: ${d.id}`);
      console.log(`- fullName: "${data.fullName}"`);
      console.log(`- name: "${data.name}"`);
    }
  });

  console.log("=== WEEKLY LOANS ===");
  const wSnap = await db.collection('weekly_loans')
    .where('businessId', '==', 'oDhSDYHQ2dV1DP33koysmZAqaY13')
    .get();
  
  wSnap.forEach(d => {
    const data = d.data();
    console.log(`LoanID: ${d.id}`);
    console.log(`- customerName: "${data.customerName}"`);
  });
}
run();
