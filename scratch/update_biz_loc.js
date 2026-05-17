const admin = require('firebase-admin');
const serviceAccount = require('C:\\Users\\bizsi\\.gemini\\antigravity\\keys\\digibiz-sys-firebase-adminsdk-hsk7h-6a5ec23806.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const businessId = "oDhSDYHQ2dV1DP33koysmZAqaY13";
const newLocation = "7.446256, 80.196392";

async function updateBusinessLocation() {
    try {
        await db.collection('businesses').doc(businessId).update({
            location: newLocation
        });
        console.log(`✅ Business location updated to: ${newLocation}`);
    } catch (e) {
        console.error("❌ Error updating location:", e);
    }
}

updateBusinessLocation();
