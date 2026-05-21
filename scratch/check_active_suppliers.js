const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

function normalizePersonKey(s) {
    return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function stripNameNoise(s) {
    return String(s ?? '').replace(/\b(sir|dr|mr|mrs|ms)\.?\b/gi, '').trim();
}

function stripLoanCategoryNoise(s) {
    return String(s ?? '').replace(/\b(hand|advance|standard|weekly|investor)\.?\b/gi, '').trim();
}

function loanPersonKey(row) {
    const raw = stripLoanCategoryNoise(stripNameNoise(
        row.customerName || row.CustomerName || row.supplierName || row.SupplierName
        || row.borrowerName || row.borrower || row.name || row.Name || ''
    ));
    return normalizePersonKey(raw);
}

function getSlDateStr(dateInput) {
    if (!dateInput) return '';
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const slDate = new Date(d.getTime() + (330 * 60000));
    return slDate.toISOString().split('T')[0];
}

function getDaysBetween(dateStr1, dateStr2) {
    const d1 = new Date(dateStr1 + 'T00:00:00Z');
    const d2 = new Date(dateStr2 + 'T00:00:00Z');
    const diffMs = d2.getTime() - d1.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

async function run() {
    const businessId = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
    
    // Fetch all advances
    const advSnap = await db.collection('scrap_advance_history')
        .where('businessId', '==', businessId)
        .get();
    const advancesCache = advSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch all bills
    const billSnap = await db.collection('buying_history')
        .where('businessId', '==', businessId)
        .get();
    const billsCache = billSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`Fetched ${advancesCache.length} advances and ${billsCache.length} bills.`);

    const advancesGrouped = {};
    advancesCache.forEach(doc => {
        const amt = Number(doc.amount) || 0;
        if (amt <= 0.01) return; // Only positive advance issues count

        const key = loanPersonKey(doc);
        if (!key) return;

        const dateStr = getSlDateStr(doc.date || doc.createdAt?.toDate?.() || doc.createdAt);
        if (!dateStr) return;

        const timeMs = doc.date ? new Date(doc.date).getTime() : (doc.createdAt?.toMillis?.() || Date.now());

        if (!advancesGrouped[key]) {
            advancesGrouped[key] = {
                displayName: doc.supplierName || doc.customerName || doc.name || '',
                dates: {}
            };
        }
        if (!advancesGrouped[key].dates[dateStr] || timeMs < advancesGrouped[key].dates[dateStr]) {
            advancesGrouped[key].dates[dateStr] = timeMs;
        }
    });

    const billsGrouped = {};
    billsCache.forEach(doc => {
        const key = loanPersonKey(doc);
        if (!key) return;

        const dateStr = getSlDateStr(doc.billDateTime || doc.date);
        if (!dateStr) return;

        if (!billsGrouped[key]) {
            billsGrouped[key] = new Set();
        }
        billsGrouped[key].add(dateStr);
    });

    console.log('\n--- Debugging Grouped Advances & Bills ---');
    for (const key in advancesGrouped) {
        const supplier = advancesGrouped[key];
        const billDates = billsGrouped[key] || new Set();
        console.log(`Supplier: ${supplier.displayName} (${key})`);
        console.log(`  Advance dates:`, Object.keys(supplier.dates));
        console.log(`  Bill dates:`, Array.from(billDates));
    }

    const activeSuppliers = [];
    const slNow = new Date(new Date().getTime() + (330 * 60000));
    const todayStr = slNow.toISOString().split('T')[0];

    for (const key in advancesGrouped) {
        const supplier = advancesGrouped[key];
        const billDates = billsGrouped[key] || new Set();

        const unclearedDates = [];
        for (const advDateStr in supplier.dates) {
            let cleared = false;
            for (const billDateStr of billDates) {
                if (billDateStr >= advDateStr) {
                    cleared = true;
                    break;
                }
            }
            if (!cleared) {
                unclearedDates.push(advDateStr);
            }
        }

        if (unclearedDates.length > 0) {
            unclearedDates.sort();
            const earliestUnclearedDateStr = unclearedDates[0];
            const daysElapsed = getDaysBetween(earliestUnclearedDateStr, todayStr);

            activeSuppliers.push({
                displayName: supplier.displayName,
                earliestUnclearedDateStr,
                daysElapsed
            });
        }
    }

    activeSuppliers.sort((a, b) => {
        if (b.daysElapsed !== a.daysElapsed) {
            return b.daysElapsed - a.daysElapsed;
        }
        return String(a.displayName).localeCompare(String(b.displayName));
    });

    console.log('\n--- Final Active Suppliers Output ---');
    console.log(activeSuppliers);
}
run().catch(console.error);
