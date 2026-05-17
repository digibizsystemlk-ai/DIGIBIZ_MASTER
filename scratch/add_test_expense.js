const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/bizsi/Downloads/digibiz-sys-firebase-adminsdk-hmsv0-622839446d.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function addTestExpense() {
    const email = 'biz.sirimal@gmail.com';
    const userSnap = await db.collection('users').where('email', '==', email).get();
    if (userSnap.empty) {
        console.log('User not found');
        return;
    }
    const businessId = userSnap.docs[0].data().businessId || userSnap.docs[0].id;
    console.log('Business ID:', businessId);

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
    
    const expense = {
        businessId: businessId,
        expenseDate: today,
        amount: 3500,
        category: 'Test Entry',
        note: 'Direct Firestore Entry for UI Testing',
        accountCode: '5-5030-01',
        accountName: 'Scrap overhead',
        paymentMethod: 'CASH',
        addedBy: 'System Test',
        addedByEmail: email,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('scrap_expenses').add(expense);
    console.log('Test expense added for today:', today);
}

addTestExpense().catch(console.error);
