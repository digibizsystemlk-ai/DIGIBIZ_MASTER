const API_KEY = "AIzaSyBLFefSjFXp84Hg7nnIfuJ18SFcM92bsno";
const PROJECT_ID = "digibiz-sys";
const COMMON_PASSWORD = "123456";

// Primary Demo Accounts mapping according to user specifications
const DEMO_ACCOUNTS_CONFIG = [
  {
    type: "retail",
    email: "test@retail.com",
    name: "Demo Retail Store",
    icon: "🛒"
  },
  {
    type: "distributor",
    email: "test@distributor.com",
    name: "Demo Distributor",
    icon: "🚚"
  },
  {
    type: "attendance_payroll",
    email: "test@attendance.com",
    name: "Demo Attendance System",
    icon: "⏱️"
  },
  {
    type: "tire_centre",
    email: "test@tyrecentre.com",
    name: "Demo Tyre Centre",
    icon: "🛞"
  },
  {
    type: "pharmacy",
    email: "test@pharmacy.com",
    name: "Demo Pharmacy",
    icon: "💊"
  },
  {
    type: "restaurant",
    email: "test@restaurant.com",
    name: "Demo Restaurant",
    icon: "🍽️"
  },
  {
    type: "garment",
    email: "test@garment.com",
    name: "Demo Garment Store",
    icon: "👕"
  },
  {
    type: "hardware",
    email: "test@hardware.com",
    name: "Demo Hardware Store",
    icon: "🔧"
  },
  {
    type: "service",
    email: "test@service.com",
    name: "Demo Service & Salon",
    icon: "💇"
  },
  {
    type: "auto_care",
    email: "test@autocare.com",
    name: "Demo Auto Care Center",
    icon: "🚗"
  },
  {
    type: "manufacturer",
    email: "test@manufacturer.com",
    name: "Demo Manufacturing Plant",
    icon: "🏭"
  },
  {
    type: "scrap_collection_center",
    email: "test@scrap.com",
    name: "Demo Scrap Collection Center",
    icon: "♻️"
  }
];

// Helper to authenticate as Super Admin
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

// Helper to sign up or update user credentials in Firebase Auth
async function ensureAuthUser(email, password) {
  // Try sign in first
  const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });

  if (signInRes.ok) {
    const data = await signInRes.json();
    return { uid: data.localId, email: data.email, idToken: data.idToken };
  }

  // If failed (e.g. wrong password or user not found), attempt signUp
  const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });

  if (signUpRes.ok) {
    const data = await signUpRes.json();
    return { uid: data.localId, email: data.email, idToken: data.idToken };
  }

  // If signUp failed because email exists (with different password), update password
  const errData = await signUpRes.json();
  if (errData.error && errData.error.message.includes('EMAIL_EXISTS')) {
    // We sign in with idToken from SuperAdmin to update, or use admin auth endpoint if available
    console.log(`  User ${email} exists, resetting password to ${password}...`);
  }

  throw new Error(`Failed to ensure Auth User for ${email}: ${JSON.stringify(errData)}`);
}

// Helper to write Firestore Document via REST
async function setFirestoreDoc(idToken, collection, docId, fields) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
  
  // Transform JS object to Firestore REST fields format
  const firestoreFields = {};
  for (const [key, val] of Object.entries(fields)) {
    if (typeof val === 'string') firestoreFields[key] = { stringValue: val };
    else if (typeof val === 'number') firestoreFields[key] = { doubleValue: val };
    else if (typeof val === 'boolean') firestoreFields[key] = { booleanValue: val };
    else if (Array.isArray(val)) {
      firestoreFields[key] = {
        arrayValue: {
          values: val.map(item => typeof item === 'string' ? { stringValue: item } : { stringValue: String(item) })
        }
      };
    } else if (val && typeof val === 'object') {
      firestoreFields[key] = { stringValue: JSON.stringify(val) };
    }
  }

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ fields: firestoreFields })
  });

  if (!res.ok) {
    console.error(`  Error setting ${collection}/${docId}:`, res.status, await res.text());
  }
}

// Main Setup Function
async function setupDemoAccounts() {
  console.log('=====================================================');
  console.log('🚀 Setting up DIGIBIZ Demo Account System...');
  console.log('=====================================================\n');

  const adminToken = await getSuperAdminToken();
  console.log('🔑 Super Admin Authenticated Successfully!\n');

  for (const cfg of DEMO_ACCOUNTS_CONFIG) {
    console.log(`Processing Demo Account: ${cfg.icon} ${cfg.name} (${cfg.email})...`);
    
    try {
      // 1. Ensure Auth User
      const authUser = await ensureAuthUser(cfg.email, COMMON_PASSWORD);
      const uid = authUser.uid;
      console.log(`  ✅ Auth User Ready! UID: ${uid}`);

      // 2. Setup Firestore User Doc
      await setFirestoreDoc(adminToken, 'users', uid, {
        uid: uid,
        email: cfg.email,
        name: `${cfg.name} Owner`,
        role: "BUSINESS_OWNER",
        businessId: uid,
        mustChangePassword: false,
        subscriptionStatus: "ACTIVE",
        isDemo: true,
        updatedAt: new Date().toISOString()
      });
      console.log(`  ✅ Firestore user doc updated (users/${uid})`);

      // 3. Setup Firestore Business Doc
      await setFirestoreDoc(adminToken, 'businesses', uid, {
        businessId: uid,
        businessName: cfg.name,
        businessType: cfg.type,
        email: cfg.email,
        ownerId: uid,
        isDemo: true,
        status: "ACTIVE",
        subscriptionStatus: "ACTIVE",
        updatedAt: new Date().toISOString()
      });
      console.log(`  ✅ Firestore business doc updated (businesses/${uid})`);

    } catch (err) {
      console.error(`  ❌ Failed processing ${cfg.email}:`, err.message);
    }
    console.log('-----------------------------------------------------');
  }

  console.log('\n🎉 ALL DEMO ACCOUNTS SETUP COMPLETE!');
  console.log('Universal Password: 123456');
}

setupDemoAccounts().catch(console.error);
