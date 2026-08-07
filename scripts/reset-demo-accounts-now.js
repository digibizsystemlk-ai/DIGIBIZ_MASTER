const API_KEY = "AIzaSyBLFefSjFXp84Hg7nnIfuJ18SFcM92bsno";
const PROJECT_ID = "digibiz-sys";

async function getSuperAdminToken() {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bdkariyapperuma@gmail.com', password: '123456', returnSecureToken: true })
  });
  if (!res.ok) {
    throw new Error('Failed to sign in as super admin');
  }
  const data = await res.json();
  return data.idToken;
}

async function runQuery(idToken, collectionId, whereFilter = null) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const structuredQuery = {
    from: [{ collectionId }]
  };
  if (whereFilter) {
    structuredQuery.where = whereFilter;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ structuredQuery })
  });
  if (!res.ok) return [];
  const items = await res.json();
  const docs = [];
  for (const item of items) {
    if (item.document) {
      const doc = item.document;
      const id = doc.name.split('/').pop();
      const fields = {};
      for (const k in doc.fields || {}) {
        const vObj = doc.fields[k];
        const vType = Object.keys(vObj)[0];
        fields[k] = vObj[vType];
      }
      docs.push({ id, path: doc.name, fields });
    }
  }
  return docs;
}

async function deleteDoc(idToken, docPath) {
  const url = `https://firestore.googleapis.com/v1/${docPath}`;
  await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${idToken}` }
  });
}

async function resetDemoAccountsNow() {
  console.log('=====================================================');
  console.log('🔄 Executing On-Demand Demo Accounts Reset & Clean...');
  console.log('=====================================================\n');

  const token = await getSuperAdminToken();
  console.log('🔑 Authenticated as Super Admin!\n');

  // 1. Get all Demo Businesses
  const allBizs = await runQuery(token, 'businesses');
  const demoBizIds = [];
  
  allBizs.forEach(b => {
    const email = String(b.fields.email || '').toLowerCase();
    if (b.fields.isDemo === true || email.startsWith('test@') || b.id.startsWith('demo-')) {
      demoBizIds.push(b.id);
    }
  });

  console.log(`Found ${demoBizIds.length} Demo Businesses to reset:`, demoBizIds.join(', '));

  const collectionsToClean = [
    "sales", "pos_sales", "invoices", "grns", "orders",
    "attendance_logs", "gate_passes", "expenses", "daily_loans",
    "scrap_buying", "scrap_selling"
  ];

  let totalPurged = 0;
  for (const bizId of demoBizIds) {
    for (const col of collectionsToClean) {
      const docs = await runQuery(token, col, {
        fieldFilter: {
          field: { fieldPath: "businessId" },
          op: "EQUAL",
          value: { stringValue: bizId }
        }
      });

      if (docs.length > 0) {
        console.log(`  Purging ${docs.length} records from collection '${col}' for Business: ${bizId}`);
        for (const d of docs) {
          await deleteDoc(token, d.path);
          totalPurged++;
        }
      }
    }
  }

  console.log('\n=====================================================');
  console.log(`✅ RESET COMPLETE! Total dynamic entries purged: ${totalPurged}`);
  console.log('=====================================================');
}

resetDemoAccountsNow().catch(console.error);
