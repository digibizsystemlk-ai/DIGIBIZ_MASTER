const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://digibiz-sys-default-rtdb.firebaseio.com/",
});
const db = admin.firestore();

function colomboDateKey(d) {
    const x = d instanceof Date ? d : new Date(d);
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Colombo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(x);
}

async function run() {
    const now = new Date();
    const todayKey = colomboDateKey(now);
    console.log("Running for today:", todayKey);
    
    const liabilitiesSnap = await db.collection("scrap_liabilities").get();
    let appended = 0;
    
    const businessTotals = {};

    for (const doc of liabilitiesSnap.docs) {
        const data = doc.data() || {};
        const businessId = String(data.businessId || "");
        if (!businessId) continue;
        
        if (data.endDate) {
            const end = new Date(data.endDate);
            end.setHours(23, 59, 59, 999);
            if (!Number.isNaN(end.getTime()) && now > end) {
                continue;
            }
        }

        const dailyAmount = Number(data.dailyAmount || 0);
        if (dailyAmount > 0) {
            businessTotals[businessId] = (businessTotals[businessId] || 0) + dailyAmount;
        }
    }

    for (const businessId in businessTotals) {
        const totalDaily = businessTotals[businessId];
        if (totalDaily > 0) {
            // Check if already created today to prevent duplicates if run multiple times
            const existingSnap = await db.collection("scrap_expenses")
                .where("businessId", "==", businessId)
                .where("expenseDate", "==", todayKey)
                .where("category", "==", "Liability (Daily Total)")
                .get();
                
            if (existingSnap.empty) {
                await db.collection("scrap_expenses").add({
                    businessId,
                    expenseDate: todayKey,
                    category: "Liability (Daily Total)",
                    amount: totalDaily,
                    note: "Auto-deducted daily liabilities total",
                    createdBy: "system_cron_manual",
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`Added expense of ${totalDaily} for business ${businessId}`);
                appended += 1;
            } else {
                // Update the existing one just in case they added more today
                const exDoc = existingSnap.docs[0];
                await exDoc.ref.update({
                    amount: totalDaily,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`Updated expense to ${totalDaily} for business ${businessId}`);
            }
        }
    }
    console.log("Done. Appended:", appended);
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
