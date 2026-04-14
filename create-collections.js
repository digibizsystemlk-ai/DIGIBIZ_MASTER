const admin = require('firebase-admin');

// Service account key එක load කරන්න
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setupDatabase() {
  try {
    console.log('🚀 Database setup starting...\n');

    // 1. companies collection
    await db.collection('companies').doc('demo_company').set({
      name: 'ඩෙමෝ සමාගම',
      email: 'demo@example.com',
      phone: '0712345678',
      address: 'කොළඹ',
      subscriptionStatus: 'trial',
      subscriptionEndDate: new Date('2026-05-11'),
      createdAt: new Date()
    });
    console.log('✅ companies/demo_company created');

    // 2. users collection
    await db.collection('users').doc('admin_user').set({
      name: 'අද්මින්',
      email: 'admin@demo.com',
      role: 'admin',
      companyId: 'demo_company',
      createdAt: new Date()
    });
    console.log('✅ users/admin_user created');

    // 3. invoices collection (හිස්ව, පසුව එකතු වෙයි)
    console.log('✅ invoices collection ready (auto-create on first use)');

    // 4. payments collection (හිස්ව)
    console.log('✅ payments collection ready (auto-create on first use)');

    // 5. subscriptions collection
    await db.collection('subscriptions').doc('demo_subscription').set({
      companyId: 'demo_company',
      plan: 'basic',
      amount: 4990,
      status: 'active',
      startDate: new Date(),
      endDate: new Date('2026-05-11')
    });
    console.log('✅ subscriptions/demo_subscription created');

    console.log('\n🎉 All collections created successfully!');
    console.log('📊 Check your Firebase Console: Firestore Database');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupDatabase();