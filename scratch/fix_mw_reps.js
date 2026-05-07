const admin = require('firebase-admin');
const path = require('path');

async function fixMwTradingRepPerms() {
  const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  const db = admin.firestore();
  const businessId = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2'; // MW Trading

  const configRef = db.collection('businesses').doc(businessId).collection('configs').doc('permissions');
  const snap = await configRef.get();
  
  let payload = snap.exists ? snap.data() : {};
  
  // Define sensible defaults for REP in MW Trading
  const repDefaults = {
    canViewDashboard: true,
    canInvoiceCreateEdit: true,
    canCustomerView: true,
    canCustomerCreate: true,
    canProductView: true,
    canStockView: true,
    canViewReportsFull: false,
    canDeliveriesManage: false
  };

  payload['REP'] = { ...payload['REP'], ...repDefaults };
  
  await configRef.set(payload);
  console.log('Fixed REP permissions for MW Trading.');
  
  // Set business as "Permissions Configured"
  await db.collection('businesses').doc(businessId).set({ permissionsConfig: true }, { merge: true });
}

fixMwTradingRepPerms().catch(console.error);
