const admin = require('firebase-admin');
const path = require('path');

async function hardResetMwRepPerms() {
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
  
  // Set EVERY SINGLE PERMISSION to FALSE for REP
  const repOff = {
    canViewDashboard: false,
    canInvoiceCreateEdit: false,
    canSalesView: false,
    canOrderWorkflowApprove: false,
    canOrderReject: false,
    canCustomerView: false,
    canCustomerCreate: false,
    canCustomerEditDelete: false,
    canProductView: false,
    canProductCreate: false,
    canProductEditDelete: false,
    canStockView: false,
    canStockEdit: false,
    canViewAccounting: false,
    canViewFinancialsProfit: false,
    canChequesManage: false,
    canCreditAgingView: false,
    canRepCommissionView: false,
    canViewReportsFull: false,
    canManageRepsWeb: false,
    canDeliveriesManage: false,
    canExpensesCreate: false,
    canExpensesEdit: false,
    canStaffMutate: false,
    canSettingsChange: false,
    canBusinessInfoEdit: false
  };

  payload['REP'] = repOff;
  
  await configRef.set(payload);
  console.log('Successfully applied HARD RESET (ALL OFF) for MW Trading Reps.');
  
  // Force business to "Permissions Configured" mode
  await db.collection('businesses').doc(businessId).set({ permissionsConfig: true }, { merge: true });
}

hardResetMwRepPerms().catch(console.error);
