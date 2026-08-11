const admin = require('firebase-admin');
const path = 'I:/DIGIBIZ_MASTER/serviceAccountKey.json';

admin.initializeApp({
  credential: admin.credential.cert(path),
});

const db = admin.firestore();

async function main() {
  const snap = await db.collection('businesses').limit(200).get();
  console.log('Total businesses fetched:', snap.size);
  snap.forEach(d => {
    const b = d.data() || {};
    console.log([
      'bid=' + d.id,
      'type=' + String(b.businessType || b.type || '?'),
      'name=' + String(b.name || b.businessName || '?')
    ].join(' | '));
  });
}

main().then(() => process.exit(0)).catch(e => { console.error('ERROR', e); process.exit(1); });
