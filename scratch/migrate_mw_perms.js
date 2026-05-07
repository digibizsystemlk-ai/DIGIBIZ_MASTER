const admin = require('firebase-admin');
const path = require('path');

const MAPPING = {
  'canOrderCreate': 'canInvoiceCreateEdit',
  'canShopsManage': 'canCustomerView',
  'canOrdersView': 'canStockView',
  'canSalesView': 'canSalesView',
  'canInvoiceCreate': 'canInvoiceCreateEdit',
  'canGrnManage': 'canStockEdit',
  'canProductManage': 'canProductView',
  'canRepsManage': 'canManageRepsWeb',
  'canWarehouseManage': 'canStockView',
  'canDeliveriesManage': 'canDeliveriesManage',
  'canFreeIssuesLog': 'canStockView',
  'canReturnsLog': 'canStockView',
  'canChequesManage': 'canChequesManage',
  'canCreditAgingView': 'canCreditAgingView',
  'canCommissionConfig': 'canSettingsChange',
  'canRepCommissionView': 'canRepCommissionView',
  'canDistributorReports': 'canViewReportsFull',
  'canViewFinance': 'canViewFinancialsProfit',
  'canViewAccounting': 'canViewAccounting',
  'canStaffManage': 'canStaffMutate',
  'canPermissionsConfig': 'canStaffMutate',
  'canSidebarConfig': 'canSettingsChange',
  'canSettingsGlobal': 'canSettingsChange',
  'canSmsConfig': 'canSettingsChange',
  'canBillingCharges': 'canViewFinancialsProfit'
};

async function migratePermissions() {
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
  
  if (!snap.exists) {
    console.log('No permissions config found for migration.');
    return;
  }

  const oldData = snap.data();
  const newData = {};

  for (const [role, perms] of Object.entries(oldData)) {
    newData[role] = {};
    // First, preserve any existing new keys if the owner already saved some
    Object.assign(newData[role], perms);
    
    // Then, map old keys to new keys
    for (const [oldKey, value] of Object.entries(perms)) {
      if (MAPPING[oldKey]) {
        const newKey = MAPPING[oldKey];
        // Only map if the new key doesn't already have a value (prioritize owner's recent saves)
        if (newData[role][newKey] === undefined || newData[role][newKey] === true) {
            // If the old key was false, ensure the new key is also false
            if (value === false) {
                newData[role][newKey] = false;
            }
        }
      }
    }
    
    // Explicitly set REP permissions to false if they were intended to be off
    if (role === 'REP') {
       // Based on user's screenshot, they want almost everything off except maybe a few.
       // I will respect the 'false' values from the mapping.
    }
  }

  await configRef.set(newData);
  console.log('Successfully migrated MW Trading permissions to unified keys.');
}

migratePermissions().catch(console.error);
