const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    console.log("=== Fetching all SMS records created on 2026-05-17 ===");
    
    const startOfToday = new Date('2026-05-17T00:00:00Z');
    
    const [pendingSnap, logsSnap] = await Promise.all([
        db.collection('pending_sms').where('createdAt', '>=', startOfToday).get(),
        db.collection('sms_logs').where('createdAt', '>=', startOfToday).get()
    ]);
    
    console.log(`pending_sms count today: ${pendingSnap.size}`);
    console.log(`sms_logs count today: ${logsSnap.size}`);
    
    const allDocs = [];
    pendingSnap.forEach(d => allDocs.push({ source: 'pending_sms', id: d.id, ...d.data() }));
    logsSnap.forEach(d => allDocs.push({ source: 'sms_logs', id: d.id, ...d.data() }));
    
    // Sort descending
    allDocs.sort((a, b) => {
        const tA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
        const tB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
        return tB - tA;
    });
    
    allDocs.forEach(data => {
        console.log(`Source: ${data.source} | Doc ID: ${data.id}`);
        console.log(`  BizID: ${data.businessId}`);
        console.log(`  To: ${data.mobile}`);
        console.log(`  Msg: ${data.message || data.body}`);
        console.log(`  Status: ${data.status}`);
        console.log(`  Created: ${data.createdAt ? data.createdAt.toDate().toISOString() : 'N/A'}`);
        console.log('---');
    });
}

main().catch(console.error);
