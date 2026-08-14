/**
 * Coconut Wholesale Module — Coconut Grading & Sorting Logic
 */

let appCtx = null;
let currentStocks = {};

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('coconut-grading');
    document.getElementById('gDate').value = window.CoconutModule.toLocalDateStr(new Date());

    setupEventHandlers();
    await loadCategoryStock();
    await loadGradingLogs();
});

function setupEventHandlers() {
    const sourceSelect = document.getElementById('gSourceCategory');
    const goodInput = document.getElementById('outGoodQty');
    const medInput = document.getElementById('outMediumQty');
    const lowInput = document.getElementById('outLowQty');
    const spoilInput = document.getElementById('outSpoiledQty');

    function updateCalculations() {
        const srcCat = sourceSelect.value;
        const srcData = currentStocks[srcCat] || { qty: 0, avgCost: 0 };
        document.getElementById('sourceStockDisplay').textContent = `${window.CoconutModule.fmt(srcData.qty, 0)} nuts`;
        document.getElementById('sourceAvgCostDisplay').textContent = `Rs. ${window.CoconutModule.fmt(srcData.avgCost, 2)}`;

        const g = Number(goodInput.value) || 0;
        const m = Number(medInput.value) || 0;
        const l = Number(lowInput.value) || 0;
        const s = Number(spoilInput.value) || 0;

        const totalSorted = g + m + l + s;
        document.getElementById('totalSortedNutsDisplay').textContent = `${window.CoconutModule.fmt(totalSorted, 0)} nuts`;

        const diff = srcData.qty - totalSorted;
        const discEl = document.getElementById('gradingDiscrepancyDisplay');
        if (diff < 0) {
            discEl.textContent = `⚠️ Exceeds source stock by ${Math.abs(diff)} nuts!`;
            discEl.style.color = 'var(--c-danger)';
        } else {
            discEl.textContent = `${diff} nuts remaining in ${srcCat}`;
            discEl.style.color = 'var(--c-accent)';
        }
    }

    sourceSelect.addEventListener('change', updateCalculations);
    goodInput.addEventListener('input', updateCalculations);
    medInput.addEventListener('input', updateCalculations);
    lowInput.addEventListener('input', updateCalculations);
    spoilInput.addEventListener('input', updateCalculations);

    document.getElementById('gradingRunForm').addEventListener('submit', handleSaveGrading);
}

async function loadCategoryStock() {
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const snap = await db.collection('coconut_raw_coconuts').doc(bid).collection('items').get();
        currentStocks = {
            UNGRADED: { qty: 0, avgCost: 0 },
            GOOD: { qty: 0, avgCost: 0 },
            MEDIUM: { qty: 0, avgCost: 0 },
            LOW: { qty: 0, avgCost: 0 }
        };

        snap.docs.forEach(doc => {
            const d = doc.data() || {};
            const cat = d.category || doc.id;
            currentStocks[cat] = {
                qty: Number(d.stockQty) || 0,
                avgCost: Number(d.avgCostPerUnit || d.lastUnitCost) || 0
            };
        });

        // Trigger UI update for currently selected source
        const srcCat = document.getElementById('gSourceCategory').value;
        const srcData = currentStocks[srcCat] || { qty: 0, avgCost: 0 };
        document.getElementById('sourceStockDisplay').textContent = `${window.CoconutModule.fmt(srcData.qty, 0)} nuts`;
        document.getElementById('sourceAvgCostDisplay').textContent = `Rs. ${window.CoconutModule.fmt(srcData.avgCost, 2)}`;

    } catch (e) {
        console.warn('Load category stock error:', e);
    }
}

async function loadGradingLogs() {
    const db = window.CoconutModule.getDb();
    const body = document.getElementById('gradingHistoryBody');

    try {
        const snap = await db.collection('coconut_grading_runs')
            .where('businessId', '==', appCtx.businessId)
            .get();

        const runs = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const ta = a.date ? (a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime()) : 0;
                const tb = b.date ? (b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) : 0;
                return tb - ta;
            });

        if (!runs.length) {
            body.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:20px; color:var(--c-text-muted);">No grading runs recorded yet.</td></tr>';
            return;
        }

        body.innerHTML = runs.map(r => {
            const dt = window.CoconutModule.formatDate(r.date || r.createdAt);
            return `
                <tr>
                    <td>${dt}</td>
                    <td><span class="c-badge c-badge-neutral">${window.CoconutModule.esc(r.sourceCategory)}</span></td>
                    <td class="text-right" style="font-weight:700;">${window.CoconutModule.fmt(r.totalSortedQty, 0)}</td>
                    <td class="text-right" style="color:#166534; font-weight:700;">+${window.CoconutModule.fmt(r.goodQty, 0)}</td>
                    <td class="text-right" style="color:#0369a1; font-weight:700;">+${window.CoconutModule.fmt(r.mediumQty, 0)}</td>
                    <td class="text-right" style="color:#b45309; font-weight:700;">+${window.CoconutModule.fmt(r.lowQty, 0)}</td>
                    <td class="text-right" style="color:var(--c-danger); font-weight:700;">${r.spoiledQty > 0 ? '-' + window.CoconutModule.fmt(r.spoiledQty, 0) : '0'}</td>
                    <td>${window.CoconutModule.esc(r.notes || '-')}</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.warn(e);
    }
}

async function handleSaveGrading(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveGrading');
    btn.disabled = true;
    btn.textContent = 'Processing Grading Run...';

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const dateVal = document.getElementById('gDate').value;
        const sourceCat = document.getElementById('gSourceCategory').value;
        const gQty = Number(document.getElementById('outGoodQty').value) || 0;
        const mQty = Number(document.getElementById('outMediumQty').value) || 0;
        const lQty = Number(document.getElementById('outLowQty').value) || 0;
        const sQty = Number(document.getElementById('outSpoiledQty').value) || 0;
        const notes = document.getElementById('gNotes').value || '';

        const totalSorted = gQty + mQty + lQty + sQty;
        if (totalSorted <= 0) {
            alert('Please specify at least one output grade quantity');
            btn.disabled = false;
            btn.textContent = '✨ Save Grading Run & Re-allocate Stock';
            return;
        }

        const srcData = currentStocks[sourceCat] || { qty: 0, avgCost: 0 };
        if (totalSorted > srcData.qty) {
            if (!confirm(`⚠️ Total sorted count (${totalSorted}) exceeds recorded stock in ${sourceCat} (${srcData.qty}). Continue anyway?`)) {
                btn.disabled = false;
                btn.textContent = '✨ Save Grading Run & Re-allocate Stock';
                return;
            }
        }

        const runId = `GR_${window.CoconutModule.uid('grade')}`;
        const runDateObj = window.CoconutModule.parseDateAny(dateVal) || new Date();
        const baseCost = srcData.avgCost || 0;

        const batch = db.batch();

        // 1. Deduct from Source Category
        const newSrcQty = Math.max(0, srcData.qty - totalSorted);
        const srcRef = db.collection('coconut_raw_coconuts').doc(bid).collection('items').doc(sourceCat);
        batch.set(srcRef, {
            category: sourceCat,
            stockQty: newSrcQty,
            updatedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        // 2. Add to Target Categories with cost inheritance
        const targets = [
            { cat: 'GOOD', qty: gQty },
            { cat: 'MEDIUM', qty: mQty },
            { cat: 'LOW', qty: lQty }
        ];

        for (const t of targets) {
            if (t.qty > 0) {
                const targetData = currentStocks[t.cat] || { qty: 0, avgCost: baseCost };
                const newTQty = targetData.qty + t.qty;
                const newTotalVal = (targetData.qty * targetData.avgCost) + (t.qty * baseCost);
                const newAvgCost = newTQty > 0 ? (newTotalVal / newTQty) : baseCost;

                const tRef = db.collection('coconut_raw_coconuts').doc(bid).collection('items').doc(t.cat);
                batch.set(tRef, {
                    businessId: bid,
                    category: t.cat,
                    stockQty: newTQty,
                    avgCostPerUnit: Number(newAvgCost.toFixed(4)),
                    updatedAt: window.CoconutModule.tsToFirestore(new Date())
                }, { merge: true });
            }
        }

        // 3. If there are spoiled nuts during sorting, write loss GL entry
        if (sQty > 0) {
            const spoilageVal = Number((sQty * baseCost).toFixed(2));
            await window.CoconutModule.postJournalEntry({
                businessId: bid,
                description: `Grading Spoilage Discovery: -${sQty} spoiled nuts from ${sourceCat}`,
                referenceType: 'GRADING_SPOILAGE',
                ref: `coconut_grading_runs/${runId}`,
                date: runDateObj,
                lines: [
                    { accountCode: '5-5010-01', accountName: 'Operational Expense (Grading Spoilage)', debit: spoilageVal, credit: 0 },
                    { accountCode: '1-1040-01', accountName: 'Inventory (Raw Coconuts)', debit: 0, credit: spoilageVal }
                ],
                batch
            });
        }

        // 4. Save Grading Run Record
        const runRef = db.collection('coconut_grading_runs').doc(runId);
        batch.set(runRef, {
            businessId: bid,
            runId,
            sourceCategory: sourceCat,
            totalSortedQty: totalSorted,
            goodQty: gQty,
            mediumQty: mQty,
            lowQty: lQty,
            spoiledQty: sQty,
            unitCostInherited: baseCost,
            notes,
            date: window.CoconutModule.tsToFirestore(runDateObj),
            createdAt: window.CoconutModule.tsToFirestore(new Date())
        });

        await batch.commit();

        window.CoconutModule.showToast('Grading run executed and stock re-allocated successfully!', 'success');
        document.getElementById('gradingRunForm').reset();
        document.getElementById('gDate').value = window.CoconutModule.toLocalDateStr(new Date());

        await loadCategoryStock();
        await loadGradingLogs();

    } catch (err) {
        console.error(err);
        window.CoconutModule.showToast('Failed to save grading run: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '✨ Save Grading Run & Re-allocate Stock';
    }
}
