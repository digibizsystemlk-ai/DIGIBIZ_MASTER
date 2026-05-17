const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    const phone = '0775031745';
    console.log(`=== Fetching pending_sms & sms_logs for phone: ${phone} ===`);
    
    // We will query by normalize phone too
    const normPhone = '94775031745';
    
    const [p1, p2, l1, l2] = await Promise.all([
        db.collection('pending_sms').where('mobile', '==', phone).get(),
        db.collection('pending_sms').where('mobile', '==', normPhone).get(),
        db.collection('sms_logs').where('mobile', '==', phone).get(),
        db.collection('sms_logs').where('mobile', '==', normPhone).get()
    ]);
    
    const allDocs = [];
    p1.forEach(d => allDocs.push({ source: 'pending_sms', id: d.id, ...d.data() }));
    p2.forEach(d => allDocs.push({ source: 'pending_sms', id: d.id, ...d.data() }));
    l1.forEach(d => allDocs.push({ source: 'sms_logs', id: d.id, ...d.data() }));
    l2.forEach(d => allDocs.push({ source: 'sms_logs', id: d.id, ...d.data() }));
    
    // Sort descending by createdAt
    allDocs.sort((a, b) => {
        const tA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
        const tB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
        return tB - tA;
    });
    
    console.log(`Found ${allDocs.length} total records.`);
    
    allDocs.forEach(data => {
        console.log(`Source: ${data.source} | Doc ID: ${data.id}`);
        console.log(`  To: ${data.mobile}`);
        console.log(`  Msg: ${data.message || data.body}`);
        console.log(`  Status: ${data.status}`);
        console.log(`  Created: ${data.createdAt ? data.createdAt.toDate().toISOString() : 'N/A'}`);
        console.log(`  Updated: ${data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : 'N/A'}`);
        if (data.error || data.errorMessage || data.lastError) {
            console.log(`  Error: ${data.error || data.errorMessage || data.lastError}`);
        }
        console.log('---');
    });
}

main().catch(console.error);
