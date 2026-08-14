/**
 * Coconut Wholesale Module — Coconut Purchase Management
 */

let appCtx = null;
let allPurchases = [];
let allSuppliers = [];

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('coconut-purchase');

    // Default Date to Today
    document.getElementById('pDate').value = window.CoconutModule.toLocalDateStr(new Date());

    setupEventHandlers();
    await loadSuppliers();
    await loadStockSummary();
    await loadPurchasesHistory();
});

function setupEventHandlers() {
    const qtyInput = document.getElementById('pQty');
    const unitCostInput = document.getElementById('pUnitCost');
    const transportInput = document.getElementById('pTransport');
    const modeSelect = document.getElementById('pPaymentMode');

    function updatePreview() {
        const qty = Number(qtyInput.value) || 0;
        const rate = Number(unitCostInput.value) || 0;
        const trans = Number(transportInput.value) || 0;

        const base = qty * rate;
        const total = base + trans;
        const effectiveRate = qty > 0 ? (total / qty) : 0;

        document.getElementById('prevBaseCost').textContent = window.CoconutModule.fmtLKR(base);
        document.getElementById('prevTransport').textContent = window.CoconutModule.fmtLKR(trans);
        document.getElementById('prevTotalCost').textContent = window.CoconutModule.fmtLKR(total);
        document.getElementById('prevEffectiveRate').textContent = `Rs. ${window.CoconutModule.fmt(effectiveRate, 2)}`;
    }

    qtyInput.addEventListener('input', updatePreview);
    unitCostInput.addEventListener('input', updatePreview);
    transportInput.addEventListener('input', updatePreview);

    modeSelect.addEventListener('change', () => {
        const val = modeSelect.value;
        document.getElementById('chequeFields').style.display = val === 'CHEQUE' ? 'block' : 'none';
        document.getElementById('creditFields').style.display = val === 'CREDIT' ? 'block' : 'none';
    });

    // Form Submit
    document.getElementById('purchaseForm').addEventListener('submit', handleSavePurchase);

    // Quick Supplier Modal
    const modal = document.getElementById('supplierModal');
    document.getElementById('btnQuickAddSupplier').onclick = () => { modal.classList.add('open'); };
    document.getElementById('btnCloseSupplierModal').onclick = () => { modal.classList.remove('open'); };
    document.getElementById('btnCancelSupplier').onclick = () => { modal.classList.remove('open'); };
    document.getElementById('quickSupplierForm').addEventListener('submit', handleSaveQuickSupplier);

    // Search filter
    document.getElementById('searchPurchase').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        renderPurchasesTable(allPurchases.filter(p =>
            (p.supplierName && p.supplierName.toLowerCase().includes(query)) ||
            (p.category && p.category.toLowerCase().includes(query)) ||
            (p.notes && p.notes.toLowerCase().includes(query))
        ));
    });
}

async function loadSuppliers() {
    const db = window.CoconutModule.getDb();
    const select = document.getElementById('pSupplier');
    try {
        const snap = await db.collection('coconut_suppliers')
            .where('businessId', '==', appCtx.businessId)
            .get();

        allSuppliers = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.isActive !== false);
        select.innerHTML = '<option value="">Select Supplier...</option>' +
            allSuppliers.map(s => `<option value="${s.id}">${window.CoconutModule.esc(s.name)} ${s.area ? '(' + window.CoconutModule.esc(s.area) + ')' : ''}</option>`).join('');
    } catch (e) {
        console.warn('Suppliers load error:', e);
    }
}

async function loadStockSummary() {
    const db = window.CoconutModule.getDb();
    const body = document.getElementById('stockSummaryBody');
    try {
        const snap = await db.collection('coconut_raw_coconuts')
            .doc(appCtx.businessId)
            .collection('items')
            .get();

        if (snap.empty) {
            body.innerHTML = '<tr><td colspan="4" class="text-center" style="color:var(--c-text-muted);">No stock recorded yet.</td></tr>';
            return;
        }

        let totalQty = 0;
        let totalVal = 0;
        let rows = '';

        snap.docs.forEach(doc => {
            const data = doc.data() || {};
            const q = Number(data.stockQty) || 0;
            const c = Number(data.avgCostPerUnit || data.lastUnitCost) || 0;
            const val = q * c;
            totalQty += q;
            totalVal += val;

            rows += `
                <tr>
                    <td><strong>${window.CoconutModule.esc(data.category || doc.id)}</strong></td>
                    <td class="text-right">${window.CoconutModule.fmt(q, 0)} nuts</td>
                    <td class="text-right">Rs. ${window.CoconutModule.fmt(c, 2)}</td>
                    <td class="text-right" style="font-weight:700;">${window.CoconutModule.fmtLKR(val)}</td>
                </tr>
            `;
        });

        rows += `
            <tr style="background:#f8fafc; font-weight:800; border-top:2px solid var(--c-border);">
                <td>TOTAL</td>
                <td class="text-right">${window.CoconutModule.fmt(totalQty, 0)} nuts</td>
                <td class="text-right">Avg Rs. ${window.CoconutModule.fmt(totalQty > 0 ? totalVal / totalQty : 0, 2)}</td>
                <td class="text-right" style="color:var(--c-primary);">${window.CoconutModule.fmtLKR(totalVal)}</td>
            </tr>
        `;

        body.innerHTML = rows;
    } catch (e) {
        body.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading stock summary</td></tr>';
    }
}

async function loadPurchasesHistory() {
    const db = window.CoconutModule.getDb();
    const body = document.getElementById('purchaseHistoryBody');
    try {
        const snap = await db.collection('coconut_raw_material_history')
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

        renderPurchasesTable(allPurchases);
    } catch (e) {
        console.error(e);
        body.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error loading purchase records</td></tr>';
    }
}

function renderPurchasesTable(list) {
    const body = document.getElementById('purchaseHistoryBody');
    if (!list || !list.length) {
        body.innerHTML = '<tr><td colspan="9" class="text-center" style="padding:24px; color:var(--c-text-muted);">No coconut purchases recorded yet.</td></tr>';
        return;
    }

    body.innerHTML = list.map(p => {
        const dt = window.CoconutModule.formatDate(p.date || p.createdAt);
        const qty = Number(p.quantity) || 0;
        const rate = Number(p.unitCost) || 0;
        const trans = Number(p.transportCost) || 0;
        const total = Number(p.totalCost || (qty * rate + trans)) || 0;

        let badge = 'c-badge-neutral';
        if (p.paymentMode === 'CASH') badge = 'c-badge-success';
        else if (p.paymentMode === 'CREDIT') badge = 'c-badge-warning';
        else if (p.paymentMode === 'CHEQUE') badge = 'c-badge-info';

        return `
            <tr>
                <td>${dt}</td>
                <td><strong>${window.CoconutModule.esc(p.supplierName || 'Unknown')}</strong></td>
                <td><span class="c-badge c-badge-neutral">${window.CoconutModule.esc(p.category || 'GOOD')}</span></td>
                <td class="text-right" style="font-weight:700;">${window.CoconutModule.fmt(qty, 0)}</td>
                <td class="text-right">Rs. ${window.CoconutModule.fmt(rate, 2)}</td>
                <td class="text-right">Rs. ${window.CoconutModule.fmt(trans, 2)}</td>
                <td class="text-right" style="font-weight:800; color:var(--c-primary);">${window.CoconutModule.fmtLKR(total)}</td>
                <td><span class="c-badge ${badge}">${window.CoconutModule.esc(p.paymentMode || 'CASH')}</span></td>
                <td class="text-center">
                    <button class="c-btn c-btn-danger c-btn-sm" onclick="handleDeletePurchase('${p.id}')" title="Soft-delete and reverse stock & ledger">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleSavePurchase(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSavePurchase');
    btn.disabled = true;
    btn.textContent = 'Saving & Posting Journal...';

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const dateVal = document.getElementById('pDate').value;
        const supplierId = document.getElementById('pSupplier').value;
        const supplierObj = allSuppliers.find(s => s.id === supplierId) || {};
        const supplierName = supplierObj.name || 'Direct Supplier';
        const category = document.getElementById('pCategory').value;
        const quantity = Number(document.getElementById('pQty').value) || 0;
        const unitCost = Number(document.getElementById('pUnitCost').value) || 0;
        const transportCost = Number(document.getElementById('pTransport').value) || 0;
        const totalCost = (quantity * unitCost) + transportCost;
        const paymentMode = document.getElementById('pPaymentMode').value;
        const chequeDetails = document.getElementById('pChequeDetails').value || '';
        const dueDate = document.getElementById('pDueDate').value || '';
        const notes = document.getElementById('pNotes').value || '';

        if (quantity <= 0 || unitCost <= 0) {
            alert('Quantity and Unit Cost must be greater than 0');
            btn.disabled = false;
            btn.textContent = '💾 Save Purchase & Update Stock';
            return;
        }

        const purchaseId = `CP_${window.CoconutModule.uid('raw')}`;
        const pDateObj = window.CoconutModule.parseDateAny(dateVal) || new Date();

        // 1. Fetch current Category Stock to recompute weighted average
        const catStockRef = db.collection('coconut_raw_coconuts').doc(bid).collection('items').doc(category);
        const catDoc = await catStockRef.get();
        let existingQty = 0;
        let existingAvgCost = 0;
        if (catDoc.exists) {
            const cd = catDoc.data() || {};
            existingQty = Number(cd.stockQty) || 0;
            existingAvgCost = Number(cd.avgCostPerUnit || cd.lastUnitCost) || 0;
        }

        const newStockQty = existingQty + quantity;
        const newTotalVal = (existingQty * existingAvgCost) + totalCost;
        const newAvgCost = newStockQty > 0 ? (newTotalVal / newStockQty) : unitCost;

        const batch = db.batch();

        // 2. Insert Purchase History Doc
        const purchaseRef = db.collection('coconut_raw_material_history').doc(purchaseId);
        batch.set(purchaseRef, {
            businessId: bid,
            purchaseId,
            supplierId,
            supplierName,
            category,
            quantity,
            unitCost,
            transportCost,
            totalCost,
            paymentMode,
            paymentStatus: paymentMode === 'CREDIT' ? 'UNPAID' : 'PAID',
            chequeDetails,
            dueDate,
            notes,
            date: window.CoconutModule.tsToFirestore(pDateObj),
            createdAt: window.CoconutModule.tsToFirestore(new Date()),
            isActive: true
        });

        // 3. Upsert Category Stock
        batch.set(catStockRef, {
            businessId: bid,
            category,
            stockQty: newStockQty,
            avgCostPerUnit: Number(newAvgCost.toFixed(4)),
            lastUnitCost: unitCost,
            updatedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        // 4. Update Supplier Payable & Ledger if Credit
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
                description: `Coconut Purchase: ${quantity} nuts (${category})`,
                date: window.CoconutModule.tsToFirestore(pDateObj),
                createdAt: window.CoconutModule.tsToFirestore(new Date())
            });
        }

        // 5. Post Balanced Double-Entry Journal
        const journalLines = [
            { accountCode: '1-1040-01', accountName: 'Inventory (Raw Coconuts)', debit: totalCost, credit: 0 }
        ];

        if (paymentMode === 'CASH') {
            journalLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: 0, credit: totalCost });
        } else if (paymentMode === 'BANK') {
            journalLines.push({ accountCode: '1-1020-01', accountName: 'Bank Account', debit: 0, credit: totalCost });
        } else {
            // CREDIT or CHEQUE
            journalLines.push({ accountCode: '2-2010-01', accountName: 'Accounts Payable (Suppliers)', debit: 0, credit: totalCost });
        }

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `Coconut Purchase #${purchaseId} — ${supplierName} (${quantity} nuts)`,
            referenceType: 'COCONUT_PURCHASE',
            ref: `coconut_raw_material_history/${purchaseId}`,
            date: pDateObj,
            lines: journalLines,
            batch
        });

        await batch.commit();

        window.CoconutModule.showToast('Coconut purchase saved and stock updated successfully!', 'success');
        document.getElementById('purchaseForm').reset();
        document.getElementById('pDate').value = window.CoconutModule.toLocalDateStr(new Date());
        document.getElementById('pTransport').value = '0';
        document.getElementById('prevBaseCost').textContent = 'Rs. 0.00';
        document.getElementById('prevTransport').textContent = 'Rs. 0.00';
        document.getElementById('prevTotalCost').textContent = 'Rs. 0.00';
        document.getElementById('prevEffectiveRate').textContent = 'Rs. 0.00';

        await loadStockSummary();
        await loadPurchasesHistory();

    } catch (err) {
        console.error('Save purchase error:', err);
        window.CoconutModule.showToast('Failed to save purchase: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save Purchase & Update Stock';
    }
}

async function handleDeletePurchase(purchaseId) {
    if (!confirm('⚠️ Are you sure you want to reverse this purchase?\n\nThis will reverse stock, recalculate supplier balance, and reverse journal entries.')) return;

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const pDocRef = db.collection('coconut_raw_material_history').doc(purchaseId);
        const pDoc = await pDocRef.get();
        if (!pDoc.exists) return;
        const p = pDoc.data();

        const qty = Number(p.quantity) || 0;
        const totalCost = Number(p.totalCost) || 0;
        const category = p.category || 'GOOD';
        const supplierId = p.supplierId;

        // 1. Revert Stock
        const catRef = db.collection('coconut_raw_coconuts').doc(bid).collection('items').doc(category);
        const catDoc = await catRef.get();
        if (catDoc.exists) {
            const curQty = Number(catDoc.data().stockQty) || 0;
            await catRef.set({
                stockQty: Math.max(0, curQty - qty),
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

        // 3. Mark Purchase Inactive
        await pDocRef.set({
            isActive: false,
            deletedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        // 4. Reverse Journal Entry
        const revLines = [
            { accountCode: '1-1040-01', accountName: 'Inventory (Raw Coconuts)', debit: 0, credit: totalCost }
        ];
        if (p.paymentMode === 'CASH') revLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: totalCost, credit: 0 });
        else if (p.paymentMode === 'BANK') revLines.push({ accountCode: '1-1020-01', accountName: 'Bank Account', debit: totalCost, credit: 0 });
        else revLines.push({ accountCode: '2-2010-01', accountName: 'Accounts Payable', debit: totalCost, credit: 0 });

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `[REVERSAL] Deleted Purchase #${purchaseId}`,
            referenceType: 'COCONUT_PURCHASE_REVERSAL',
            ref: `coconut_raw_material_history/${purchaseId}`,
            date: new Date(),
            lines: revLines
        });

        window.CoconutModule.showToast('Purchase reversed successfully!', 'success');
        await loadStockSummary();
        await loadPurchasesHistory();

    } catch (e) {
        console.error('Delete purchase error:', e);
        window.CoconutModule.showToast('Failed to delete purchase: ' + e.message, 'error');
    }
}

async function handleSaveQuickSupplier(e) {
    e.preventDefault();
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    const name = document.getElementById('supName').value.trim();
    const phone = document.getElementById('supPhone').value.trim();
    const area = document.getElementById('supArea').value.trim();
    const address = document.getElementById('supAddress').value.trim();

    try {
        const docRef = await db.collection('coconut_suppliers').add({
            businessId: bid,
            name,
            phone,
            area,
            address,
            balance: 0,
            isActive: true,
            createdAt: window.CoconutModule.tsToFirestore(new Date()),
            updatedAt: window.CoconutModule.tsToFirestore(new Date())
        });

        window.CoconutModule.showToast('Supplier added!', 'success');
        document.getElementById('quickSupplierForm').reset();
        document.getElementById('supplierModal').classList.remove('open');

        await loadSuppliers();
        document.getElementById('pSupplier').value = docRef.id;
    } catch (e) {
        window.CoconutModule.showToast('Failed to add supplier: ' + e.message, 'error');
    }
}
