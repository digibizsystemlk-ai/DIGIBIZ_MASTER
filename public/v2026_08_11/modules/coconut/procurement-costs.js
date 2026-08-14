/**
 * Coconut Wholesale Module — Procurement Cost Analytics Logic
 */

let appCtx = null;

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('procurement-costs');

    await loadProcurementAnalytics();
    await loadBenchmarkSettings();

    document.getElementById('benchmarkForm').addEventListener('submit', handleSaveBenchmarks);
});

async function loadProcurementAnalytics() {
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;
    const startMonth = window.CoconutModule.startOfMonth();

    try {
        const [cSnap, hSnap, sSnap] = await Promise.all([
            db.collection('coconut_raw_material_history').where('businessId', '==', bid).get(),
            db.collection('coconut_husk_purchases').where('businessId', '==', bid).get(),
            db.collection('coconut_suppliers').where('businessId', '==', bid).get()
        ]);

        const supplierMap = {};
        sSnap.docs.forEach(d => {
            const s = d.data() || {};
            supplierMap[d.id] = {
                name: s.name || 'Supplier',
                area: s.area || '-',
                coconutQty: 0,
                coconutSpend: 0,
                huskKg: 0,
                huskSpend: 0,
                totalSpend: 0
            };
        });

        let monthCoconutQty = 0;
        let monthCoconutSpend = 0;
        let coconutRates = [];
        let monthHuskKg = 0;
        let monthHuskSpend = 0;
        let huskRates = [];
        let totalTransport = 0;
        let totalSpendAll = 0;
        let batchCount = 0;

        // Process Coconut Purchases
        cSnap.docs.forEach(doc => {
            const p = doc.data() || {};
            if (p.isActive === false) return;
            const dt = window.CoconutModule.parseDateAny(p.date || p.createdAt);
            const qty = Number(p.quantity) || 0;
            const rate = Number(p.unitCost) || 0;
            const trans = Number(p.transportCost) || 0;
            const total = Number(p.totalCost || (qty * rate + trans)) || 0;
            const supId = p.supplierId;

            if (dt && dt >= startMonth) {
                monthCoconutQty += qty;
                monthCoconutSpend += (qty * rate);
                if (rate > 0) coconutRates.push(rate);
                totalTransport += trans;
                totalSpendAll += total;
                batchCount++;
            }

            if (supId) {
                if (!supplierMap[supId]) {
                    supplierMap[supId] = {
                        name: p.supplierName || 'Supplier',
                        area: '-',
                        coconutQty: 0,
                        coconutSpend: 0,
                        huskKg: 0,
                        huskSpend: 0,
                        totalSpend: 0
                    };
                }
                supplierMap[supId].coconutQty += qty;
                supplierMap[supId].coconutSpend += total;
                supplierMap[supId].totalSpend += total;
            }
        });

        // Process Husk Purchases
        hSnap.docs.forEach(doc => {
            const h = doc.data() || {};
            if (h.isActive === false) return;
            const dt = window.CoconutModule.parseDateAny(h.date || h.createdAt);
            const kg = Number(h.quantityKg) || 0;
            const rate = Number(h.costPerKg) || 0;
            const trans = Number(h.transportCost) || 0;
            const total = Number(h.totalCost || (kg * rate + trans)) || 0;
            const supId = h.supplierId;

            if (dt && dt >= startMonth) {
                monthHuskKg += kg;
                monthHuskSpend += (kg * rate);
                if (rate > 0) huskRates.push(rate);
                totalTransport += trans;
                totalSpendAll += total;
                batchCount++;
            }

            if (supId) {
                if (!supplierMap[supId]) {
                    supplierMap[supId] = {
                        name: h.supplierName || 'Supplier',
                        area: '-',
                        coconutQty: 0,
                        coconutSpend: 0,
                        huskKg: 0,
                        huskSpend: 0,
                        totalSpend: 0
                    };
                }
                supplierMap[supId].huskKg += kg;
                supplierMap[supId].huskSpend += total;
                supplierMap[supId].totalSpend += total;
            }
        });

        // Update KPIs
        const avgCoconut = monthCoconutQty > 0 ? (monthCoconutSpend / monthCoconutQty) : 0;
        const minCoconut = coconutRates.length ? Math.min(...coconutRates) : 0;
        const maxCoconut = coconutRates.length ? Math.max(...coconutRates) : 0;

        document.getElementById('kpiAvgCoconutRate').textContent = `Rs. ${window.CoconutModule.fmt(avgCoconut, 2)}`;
        document.getElementById('kpiMinMaxCoconut').textContent = `Min: Rs. ${window.CoconutModule.fmt(minCoconut, 2)} / Max: Rs. ${window.CoconutModule.fmt(maxCoconut, 2)}`;

        const avgHusk = monthHuskKg > 0 ? (monthHuskSpend / monthHuskKg) : 0;
        const minHusk = huskRates.length ? Math.min(...huskRates) : 0;
        const maxHusk = huskRates.length ? Math.max(...huskRates) : 0;

        document.getElementById('kpiAvgHuskRate').textContent = `Rs. ${window.CoconutModule.fmt(avgHusk, 2)} / kg`;
        document.getElementById('kpiMinMaxHusk').textContent = `Min: Rs. ${window.CoconutModule.fmt(minHusk, 2)} / Max: Rs. ${window.CoconutModule.fmt(maxHusk, 2)}`;

        document.getElementById('kpiTotalTransportCost').textContent = window.CoconutModule.fmtLKR(totalTransport);
        const transShare = totalSpendAll > 0 ? ((totalTransport / totalSpendAll) * 100).toFixed(1) : 0;
        document.getElementById('kpiTransportShare').textContent = `${transShare}% of landed procurement`;

        document.getElementById('kpiTotalProcurementSpend').textContent = window.CoconutModule.fmtLKR(totalSpendAll);
        document.getElementById('kpiProcurementBatches').textContent = `${batchCount} batches recorded this month`;

        // Supplier Table
        const sBody = document.getElementById('supplierCostTableBody');
        const activeSuppliers = Object.values(supplierMap).filter(s => s.totalSpend > 0).sort((a, b) => b.totalSpend - a.totalSpend);

        if (!activeSuppliers.length) {
            sBody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:20px; color:var(--c-text-muted);">No supplier purchases recorded yet.</td></tr>';
            return;
        }

        sBody.innerHTML = activeSuppliers.map(s => {
            const avgNut = s.coconutQty > 0 ? (s.coconutSpend / s.coconutQty) : 0;
            const avgKg = s.huskKg > 0 ? (s.huskSpend / s.huskKg) : 0;

            return `
                <tr>
                    <td><strong>${window.CoconutModule.esc(s.name)}</strong></td>
                    <td>${window.CoconutModule.esc(s.area)}</td>
                    <td class="text-right">${window.CoconutModule.fmt(s.coconutQty, 0)} nuts</td>
                    <td class="text-right">Rs. ${window.CoconutModule.fmt(avgNut, 2)}</td>
                    <td class="text-right">${window.CoconutModule.fmt(s.huskKg, 1)} kg</td>
                    <td class="text-right">Rs. ${window.CoconutModule.fmt(avgKg, 2)}</td>
                    <td class="text-right" style="font-weight:800; color:var(--c-primary);">${window.CoconutModule.fmtLKR(s.totalSpend)}</td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error('Procurement analytics error:', e);
    }
}

async function loadBenchmarkSettings() {
    const db = window.CoconutModule.getDb();
    try {
        const doc = await db.collection('businesses').doc(appCtx.businessId).get();
        if (doc.exists) {
            const b = doc.data().coconutBenchmarks || {};
            if (b.targetGradeA) document.getElementById('targetGradeA').value = b.targetGradeA;
            if (b.targetGradeB) document.getElementById('targetGradeB').value = b.targetGradeB;
            if (b.targetHuskKg) document.getElementById('targetHuskKg').value = b.targetHuskKg;
        }
    } catch (e) { }
}

async function handleSaveBenchmarks(e) {
    e.preventDefault();
    const db = window.CoconutModule.getDb();
    const targetGradeA = Number(document.getElementById('targetGradeA').value) || 0;
    const targetGradeB = Number(document.getElementById('targetGradeB').value) || 0;
    const targetHuskKg = Number(document.getElementById('targetHuskKg').value) || 0;

    try {
        await db.collection('businesses').doc(appCtx.businessId).set({
            coconutBenchmarks: { targetGradeA, targetGradeB, targetHuskKg },
            updatedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        window.CoconutModule.showToast('Benchmark rates saved!', 'success');
    } catch (e) {
        window.CoconutModule.showToast('Failed to save benchmarks: ' + e.message, 'error');
    }
}
