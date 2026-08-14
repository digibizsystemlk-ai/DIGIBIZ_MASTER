/**
 * Coconut Wholesale Module — Husk Purchase Logic
 */

let appCtx = null;
let allPurchases = [];
let allSuppliers = [];

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('husk-purchase');

    document.getElementById('hDate').value = window.CoconutModule.toLocalDateStr(new Date());

    setupEventHandlers();
    await loadSuppliers();
    await loadLiveHuskStock();
    await loadHuskPurchases();
});

function setupEventHandlers() {
    const qtyInput = document.getElementById('hQtyKg');
    const costInput = document.getElementById('hCostPerKg');
    const transInput = document.getElementById('hTransport');

    function updatePreview() {
        const qty = Number(qtyInput.value) || 0;
        const rate = Number(costInput.value) || 0;
        const trans = Number(transInput.value) || 0;

        const base = qty * rate;
        const total = base + trans;
        const effectiveKg = qty > 0 ? (total / qty) : 0;

        document.getElementById('prevHuskBase').textContent = window.CoconutModule.fmtLKR(base);
        document.getElementById('prevHuskTrans').textContent = window.CoconutModule.fmtLKR(trans);
        document.getElementById('prevHuskTotal').textContent = window.CoconutModule.fmtLKR(total);
        document.getElementById('prevEffectiveKg').textContent = `Rs. ${window.CoconutModule.fmt(effectiveKg, 2)}`;
    }

    qtyInput.addEventListener('input', updatePreview);
    costInput.addEventListener('input', updatePreview);
    transInput.addEventListener('input', updatePreview);

    document.getElementById('huskForm').addEventListener('submit', handleSaveHuskPurchase);

    // Supplier modal
    const modal = document.getElementById('supplierModal');
    document.getElementById('btnQuickAddSupplier').onclick = () => { modal.classList.add('open'); };
    document.getElementById('btnCloseSupplierModal').onclick = () => { modal.classList.remove('open'); };
    document.getElementById('btnCancelSupplier').onclick = () => { modal.classList.remove('open'); };
    document.getElementById('quickSupplierForm').addEventListener('submit', handleSaveQuickSupplier);
}

async function loadSuppliers() {
    const db = window.CoconutModule.getDb();
    const select = document.getElementById('hSupplier');
    try {
        const snap = await db.collection('coconut_suppliers')
            .where('businessId', '==', appCtx.businessId)
            .get();

        allSuppliers = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.isActive !== false);
        select.innerHTML = '<option value="">Select Supplier...</option>' +
            allSuppliers.map(s => `<option value="${s.id}">${window.CoconutModule.esc(s.name)} ${s.area ? '(' + window.CoconutModule.esc(s.area) + ')' : ''}</option>`).join('');
    } catch (e) {
        console.warn(e);
    }
}

async function loadLiveHuskStock() {
    const db = window.CoconutModule.getDb();
    try {
        const doc = await db.collection('coconut_husk_raw')
            .doc(appCtx.businessId)
            .collection('items')
            .doc('current')
            .get();

        let stockKg = 0;
        let avgCost = 0;
        if (doc.exists) {
            const data = doc.data() || {};
            stockKg = Number(data.stockKg) || 0;
            avgCost = Number(data.avgCostPerKg || data.lastCostPerKg) || 0;
        }

        const totalVal = stockKg * avgCost;
        document.getElementById('liveHuskStockKg').textContent = `${window.CoconutModule.fmt(stockKg, 1)} kg`;
        document.getElementById('liveHuskAvgRate').textContent = `Rs. ${window.CoconutModule.fmt(avgCost, 2)} / kg`;
        document.getElementById('liveHuskTotalVal').textContent = window.CoconutModule.fmtLKR(totalVal);
    } catch (e) {
        console.warn('Husk stock load error:', e);
    }
}

async function loadHuskPurchases() {
    const db = window.CoconutModule.getDb();
    const body = document.getElementById('huskHistoryBody');
    try {
        const snap = await db.collection('coconut_husk_purchases')
            .where('businessId', '==', appCtx.businessId)
            .get();

        allPurchases = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.isActive !== false)
            .sort((a, b) => {
                const ta = a.date ? a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime() : 0;
                const tb = b.date ? b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime() : 0;
                return tb - ta;
            });

        if (!allPurchases.length) {
            body.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:24px; color:var(--c-text-muted);">No husk purchases recorded yet.</td></tr>';
            return;
        }

        body.innerHTML = allPurchases.map(p => {
            const dt = window.CoconutModule.formatDate(p.date || p.createdAt);
            const kg = Number(p.quantityKg) || 0;
            const rate = Number(p.costPerKg) || 0;
            const trans = Number(p.transportCost) || 0;
            const total = Number(p.totalCost || (kg * rate + trans)) || 0;

            let badge = 'c-badge-neutral';
            if (p.paymentMode === 'CASH') badge = 'c-badge-success';
            else if (p.paymentMode === 'CREDIT') badge = 'c-badge-warning';
            else if (p.paymentMode === 'CHEQUE') badge = 'c-badge-info';

            return `
                <tr>
                    <td>${dt}</td>
                    <td><strong>${window.CoconutModule.esc(p.supplierName || 'Unknown')}</strong></td>
                    <td class="text-right" style="font-weight:700;">${window.CoconutModule.fmt(kg, 1)} kg</td>
                    <td class="text-right">Rs. ${window.CoconutModule.fmt(rate, 2)}</td>
                    <td class="text-right">Rs. ${window.CoconutModule.fmt(trans, 2)}</td>
                    <td class="text-right" style="font-weight:800; color:var(--c-primary);">${window.CoconutModule.fmtLKR(total)}</td>
                    <td><span class="c-badge ${badge}">${window.CoconutModule.esc(p.paymentMode || 'CASH')}</span></td>
                    <td class="text-center">
                        <button class="c-btn c-btn-danger c-btn-sm" onclick="handleDeleteHuskPurchase('${p.id}')" title="Reverse purchase & stock">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        body.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error loading husk purchases</td></tr>';
    }
}

async function handleSaveHuskPurchase(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveHusk');
    btn.disabled = true;
    btn.textContent = 'Saving Husk Purchase...';

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const dateVal = document.getElementById('hDate').value;
        const supplierId = document.getElementById('hSupplier').value;
        const supplierObj = allSuppliers.find(s => s.id === supplierId) || {};
        const supplierName = supplierObj.name || 'Direct Supplier';
        const quantityKg = Number(document.getElementById('hQtyKg').value) || 0;
        const costPerKg = Number(document.getElementById('hCostPerKg').value) || 0;
        const transportCost = Number(document.getElementById('hTransport').value) || 0;
        const totalCost = (quantityKg * costPerKg) + transportCost;
        const paymentMode = document.getElementById('hPaymentMode').value;
        const notes = document.getElementById('hNotes').value || '';

        if (quantityKg <= 0 || costPerKg <= 0) {
            alert('Quantity and Cost per Kg must be greater than 0');
            btn.disabled = false;
            btn.textContent = '💾 Save Husk Purchase & Update Stock';
            return;
        }

        const purchaseId = `HP_${window.CoconutModule.uid('husk')}`;
        const pDateObj = window.CoconutModule.parseDateAny(dateVal) || new Date();

        // 1. Fetch current Husk Stock
        const huskStockRef = db.collection('coconut_husk_raw').doc(bid).collection('items').doc('current');
        const huskDoc = await huskStockRef.get();
        let existingKg = 0;
        let existingAvgCost = 0;
        if (huskDoc.exists) {
            const hd = huskDoc.data() || {};
            existingKg = Number(hd.stockKg) || 0;
            existingAvgCost = Number(hd.avgCostPerKg || hd.lastCostPerKg) || 0;
        }

        const newStockKg = existingKg + quantityKg;
        const newTotalVal = (existingKg * existingAvgCost) + totalCost;
        const newAvgCost = newStockKg > 0 ? (newTotalVal / newStockKg) : costPerKg;

        const batch = db.batch();

        // 2. Insert Husk Purchase Doc
        const hpRef = db.collection('coconut_husk_purchases').doc(purchaseId);
        batch.set(hpRef, {
            businessId: bid,
            purchaseId,
            supplierId,
            supplierName,
            quantityKg,
            costPerKg,
            transportCost,
            totalCost,
            paymentMode,
            paymentStatus: paymentMode === 'CREDIT' ? 'UNPAID' : 'PAID',
            notes,
            date: window.CoconutModule.tsToFirestore(pDateObj),
            createdAt: window.CoconutModule.tsToFirestore(new Date()),
            isActive: true
        });

        // 3. Upsert Husk Stock
        batch.set(huskStockRef, {
            businessId: bid,
            stockKg: Number(newStockKg.toFixed(2)),
            avgCostPerKg: Number(newAvgCost.toFixed(4)),
            lastCostPerKg: costPerKg,
            updatedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        // 4. Update Supplier Payable if Credit
        if (paymentMode === 'CREDIT' && supplierId) {
            const supRef = db.collection('coconut_suppliers').doc(supplierId);
            const supLedgerRef = supRef.collection('ledger').doc(`LED_${purchaseId}`);

            const currentBal = Number(supplierObj.balance) || 0;
            batch.set(supRef, {
                balance: currentBal + totalCost,
                updatedAt: window.CoconutModule.tsToFirestore(new Date())
            }, { merge: true });

            batch.set(supLedgerRef, {
                businessId: bid,
                type: 'PURCHASE',
                referenceId: purchaseId,
                amount: totalCost,
                balanceAfter: currentBal + totalCost,
                description: `Husk Purchase: ${quantityKg} kg @ Rs.${costPerKg}`,
                date: window.CoconutModule.tsToFirestore(pDateObj),
                createdAt: window.CoconutModule.tsToFirestore(new Date())
            });
        }

        // 5. Post Balanced Double-Entry Journal
        const journalLines = [
            { accountCode: '1-1040-01', accountName: 'Inventory (Raw Husks)', debit: totalCost, credit: 0 }
        ];

        if (paymentMode === 'CASH') {
            journalLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: 0, credit: totalCost });
        } else if (paymentMode === 'BANK') {
            journalLines.push({ accountCode: '1-1020-01', accountName: 'Bank Account', debit: 0, credit: totalCost });
        } else {
            journalLines.push({ accountCode: '2-2010-01', accountName: 'Accounts Payable', debit: 0, credit: totalCost });
        }

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `Husk Purchase #${purchaseId} — ${supplierName} (${quantityKg} kg)`,
            referenceType: 'HUSK_PURCHASE',
            ref: `coconut_husk_purchases/${purchaseId}`,
            date: pDateObj,
            lines: journalLines,
            batch
        });

        await batch.commit();

        window.CoconutModule.showToast('Husk purchase saved and stock updated!', 'success');
        document.getElementById('huskForm').reset();
        document.getElementById('hDate').value = window.CoconutModule.toLocalDateStr(new Date());
        document.getElementById('hTransport').value = '0';
        document.getElementById('prevHuskBase').textContent = 'Rs. 0.00';
        document.getElementById('prevHuskTrans').textContent = 'Rs. 0.00';
        document.getElementById('prevHuskTotal').textContent = 'Rs. 0.00';
        document.getElementById('prevEffectiveKg').textContent = 'Rs. 0.00';

        await loadLiveHuskStock();
        await loadHuskPurchases();

    } catch (err) {
        console.error('Save husk purchase error:', err);
        window.CoconutModule.showToast('Failed to save husk purchase: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save Husk Purchase & Update Stock';
    }
}

async function handleDeleteHuskPurchase(purchaseId) {
    if (!confirm('⚠️ Reverse this husk purchase? Stock and GL impact will be reversed.')) return;

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const hpDocRef = db.collection('coconut_husk_purchases').doc(purchaseId);
        const hpDoc = await hpDocRef.get();
        if (!hpDoc.exists) return;
        const p = hpDoc.data();

        const kg = Number(p.quantityKg) || 0;
        const totalCost = Number(p.totalCost) || 0;
        const supplierId = p.supplierId;

        // 1. Revert Husk Stock
        const huskRef = db.collection('coconut_husk_raw').doc(bid).collection('items').doc('current');
        const huskDoc = await huskRef.get();
        if (huskDoc.exists) {
            const curKg = Number(huskDoc.data().stockKg) || 0;
            await huskRef.set({
                stockKg: Math.max(0, curKg - kg),
                updatedAt: window.CoconutModule.tsToFirestore(new Date())
            }, { merge: true });
        }

        // 2. Revert Supplier Balance if Credit
        if (p.paymentMode === 'CREDIT' && supplierId) {
            const sRef = db.collection('coconut_suppliers').doc(supplierId);
            const sDoc = await sRef.get();
            if (sDoc.exists) {
                const curBal = Number(sDoc.data().balance) || 0;
                await sRef.set({
                    balance: Math.max(0, curBal - totalCost),
                    updatedAt: window.CoconutModule.tsToFirestore(new Date())
                }, { merge: true });
            }
        }

        // 3. Mark Inactive
        await hpDocRef.set({
            isActive: false,
            deletedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        // 4. Reverse Journal
        const revLines = [
            { accountCode: '1-1040-01', accountName: 'Inventory (Raw Husks)', debit: 0, credit: totalCost }
        ];
        if (p.paymentMode === 'CASH') revLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: totalCost, credit: 0 });
        else if (p.paymentMode === 'BANK') revLines.push({ accountCode: '1-1020-01', accountName: 'Bank Account', debit: totalCost, credit: 0 });
        else revLines.push({ accountCode: '2-2010-01', accountName: 'Accounts Payable', debit: totalCost, credit: 0 });

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `[REVERSAL] Deleted Husk Purchase #${purchaseId}`,
            referenceType: 'HUSK_PURCHASE_REVERSAL',
            ref: `coconut_husk_purchases/${purchaseId}`,
            date: new Date(),
            lines: revLines
        });

        window.CoconutModule.showToast('Husk purchase reversed successfully!', 'success');
        await loadLiveHuskStock();
        await loadHuskPurchases();

    } catch (e) {
        window.CoconutModule.showToast('Failed to reverse husk purchase: ' + e.message, 'error');
    }
}

async function handleSaveQuickSupplier(e) {
    e.preventDefault();
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    const name = document.getElementById('supName').value.trim();
    const phone = document.getElementById('supPhone').value.trim();
    const area = document.getElementById('supArea').value.trim();

    try {
        const docRef = await db.collection('coconut_suppliers').add({
            businessId: bid,
            name,
            phone,
            area,
            balance: 0,
            isActive: true,
            createdAt: window.CoconutModule.tsToFirestore(new Date()),
            updatedAt: window.CoconutModule.tsToFirestore(new Date())
        });

        window.CoconutModule.showToast('Supplier added!', 'success');
        document.getElementById('quickSupplierForm').reset();
        document.getElementById('supplierModal').classList.remove('open');

        await loadSuppliers();
        document.getElementById('hSupplier').value = docRef.id;
    } catch (e) {
        window.CoconutModule.showToast('Failed to add supplier: ' + e.message, 'error');
    }
}
