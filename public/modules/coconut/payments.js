/**
 * Coconut Wholesale Module — Payments & Settlements Logic
 */

let appCtx = null;
let allCustomers = [];
let allSuppliers = [];
let allPaymentLogs = [];

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('payments');

    const todayStr = window.CoconutModule.toLocalDateStr(new Date());
    document.getElementById('cpDate').value = todayStr;
    document.getElementById('spDate').value = todayStr;

    setupEventHandlers();
    await loadParties();
    await loadPaymentLogs();
});

function setupEventHandlers() {
    const custSelect = document.getElementById('cpCustomer');
    const supSelect = document.getElementById('spSupplier');

    custSelect.addEventListener('change', () => {
        const c = allCustomers.find(x => x.id === custSelect.value);
        document.getElementById('cpCurBalance').textContent = window.CoconutModule.fmtLKR(c ? c.balance : 0);
    });

    supSelect.addEventListener('change', () => {
        const s = allSuppliers.find(x => x.id === supSelect.value);
        document.getElementById('spCurBalance').textContent = window.CoconutModule.fmtLKR(s ? s.balance : 0);
    });

    document.getElementById('customerPaymentForm').addEventListener('submit', handleSaveCustomerPayment);
    document.getElementById('supplierPaymentForm').addEventListener('submit', handleSaveSupplierPayment);
}

async function loadParties() {
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const [cSnap, sSnap] = await Promise.all([
            db.collection('coconut_customers').where('businessId', '==', bid).get(),
            db.collection('coconut_suppliers').where('businessId', '==', bid).get()
        ]);

        allCustomers = cSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.isActive !== false);
        allSuppliers = sSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.isActive !== false);

        document.getElementById('cpCustomer').innerHTML = '<option value="">Select Customer...</option>' +
            allCustomers.map(c => `<option value="${c.id}">${window.CoconutModule.esc(c.name)} [Bal: Rs.${window.CoconutModule.fmt(c.balance)}]</option>`).join('');

        document.getElementById('spSupplier').innerHTML = '<option value="">Select Supplier...</option>' +
            allSuppliers.map(s => `<option value="${s.id}">${window.CoconutModule.esc(s.name)} [Bal: Rs.${window.CoconutModule.fmt(s.balance)}]</option>`).join('');

    } catch (e) {
        console.warn(e);
    }
}

async function loadPaymentLogs() {
    const db = window.CoconutModule.getDb();
    const body = document.getElementById('paymentHistoryTableBody');

    try {
        const snap = await db.collection('coconut_payments')
            .where('businessId', '==', appCtx.businessId)
            .get();

        allPaymentLogs = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const ta = a.date ? (a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime()) : 0;
                const tb = b.date ? (b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) : 0;
                return tb - ta;
            });

        if (!allPaymentLogs.length) {
            body.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:20px; color:var(--c-text-muted);">No payment settlements recorded yet.</td></tr>';
            return;
        }

        body.innerHTML = allPaymentLogs.map(p => {
            const dt = window.CoconutModule.formatDateTime(p.date || p.createdAt);
            const isReceipt = p.type === 'CUSTOMER_RECEIPT';
            const badge = isReceipt ? '<span class="c-badge c-badge-success">📥 Customer Receipt</span>' : '<span class="c-badge c-badge-danger">📤 Supplier Payment</span>';

            return `
                <tr>
                    <td style="font-size:12px; color:var(--c-text-muted);">${dt}</td>
                    <td>${badge}</td>
                    <td><strong>${window.CoconutModule.esc(p.partyName)}</strong></td>
                    <td><span class="c-badge c-badge-info">${p.paymentMode}</span></td>
                    <td class="text-right" style="font-weight:800; color:${isReceipt ? '#166534' : 'var(--c-danger)'};">
                        ${isReceipt ? '+' : '-'}${window.CoconutModule.fmtLKR(p.amount)}
                    </td>
                    <td>${window.CoconutModule.esc(p.notes || '-')}</td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.warn(e);
    }
}

async function handleSaveCustomerPayment(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveCustPayment');
    btn.disabled = true;
    btn.textContent = 'Recording Receipt...';

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const dateVal = document.getElementById('cpDate').value;
        const customerId = document.getElementById('cpCustomer').value;
        const customer = allCustomers.find(c => c.id === customerId);
        if (!customer) { alert('Please select customer'); return; }

        const amount = Number(document.getElementById('cpAmount').value) || 0;
        const paymentMode = document.getElementById('cpPaymentMode').value;
        const notes = document.getElementById('cpNotes').value.trim();

        if (amount <= 0) { alert('Amount must be greater than 0'); return; }

        const pId = `PAY_${window.CoconutModule.uid('rec')}`;
        const pDateObj = window.CoconutModule.parseDateAny(dateVal) || new Date();
        const curBal = Number(customer.balance) || 0;
        const newBal = Math.max(0, curBal - amount);

        const batch = db.batch();

        // 1. Update Customer Balance & Sub-collection Ledger
        const cRef = db.collection('coconut_customers').doc(customerId);
        batch.set(cRef, { balance: newBal, updatedAt: window.CoconutModule.tsToFirestore(new Date()) }, { merge: true });

        const cLedgerRef = cRef.collection('ledger').doc(`LED_${pId}`);
        batch.set(cLedgerRef, {
            businessId: bid,
            type: 'PAYMENT_RECEIVED',
            referenceId: pId,
            amount: amount,
            balanceAfter: newBal,
            description: `Payment Received (${paymentMode})${notes ? ' — ' + notes : ''}`,
            date: window.CoconutModule.tsToFirestore(pDateObj),
            createdAt: window.CoconutModule.tsToFirestore(new Date())
        });

        // 2. Insert Payment Record
        const payRef = db.collection('coconut_payments').doc(pId);
        batch.set(payRef, {
            businessId: bid,
            type: 'CUSTOMER_RECEIPT',
            partyId: customerId,
            partyName: customer.name,
            amount,
            paymentMode,
            notes,
            date: window.CoconutModule.tsToFirestore(pDateObj),
            createdAt: window.CoconutModule.tsToFirestore(new Date())
        });

        // 3. Post Balanced Double-Entry Journal
        // Dr Cash (1-1010-01) / Bank (1-1020-01)
        // Cr Accounts Receivable (1-1030-01)
        const journalLines = [
            { accountCode: '1-1030-01', accountName: 'Accounts Receivable (Customers)', debit: 0, credit: amount }
        ];
        if (paymentMode === 'BANK' || paymentMode === 'CHEQUE') {
            journalLines.unshift({ accountCode: '1-1020-01', accountName: 'Bank Account', debit: amount, credit: 0 });
        } else {
            journalLines.unshift({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: amount, credit: 0 });
        }

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `Customer Receipt #${pId} — ${customer.name}`,
            referenceType: 'CUSTOMER_PAYMENT',
            ref: `coconut_payments/${pId}`,
            date: pDateObj,
            lines: journalLines,
            batch
        });

        await batch.commit();

        window.CoconutModule.showToast('Customer payment received and ledger updated!', 'success');
        document.getElementById('customerPaymentForm').reset();
        document.getElementById('cpDate').value = window.CoconutModule.toLocalDateStr(new Date());

        await loadParties();
        await loadPaymentLogs();

    } catch (err) {
        console.error(err);
        window.CoconutModule.showToast('Failed to record receipt: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '📥 Record Customer Receipt & Update Ledger';
    }
}

async function handleSaveSupplierPayment(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveSupPayment');
    btn.disabled = true;
    btn.textContent = 'Disbursing Payment...';

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const dateVal = document.getElementById('spDate').value;
        const supplierId = document.getElementById('spSupplier').value;
        const supplier = allSuppliers.find(s => s.id === supplierId);
        if (!supplier) { alert('Please select supplier'); return; }

        const amount = Number(document.getElementById('spAmount').value) || 0;
        const paymentMode = document.getElementById('spPaymentMode').value;
        const notes = document.getElementById('spNotes').value.trim();

        if (amount <= 0) { alert('Amount must be greater than 0'); return; }

        const pId = `PAY_${window.CoconutModule.uid('disb')}`;
        const pDateObj = window.CoconutModule.parseDateAny(dateVal) || new Date();
        const curBal = Number(supplier.balance) || 0;
        const newBal = Math.max(0, curBal - amount);

        const batch = db.batch();

        // 1. Update Supplier Balance & Sub-collection Ledger
        const sRef = db.collection('coconut_suppliers').doc(supplierId);
        batch.set(sRef, { balance: newBal, updatedAt: window.CoconutModule.tsToFirestore(new Date()) }, { merge: true });

        const sLedgerRef = sRef.collection('ledger').doc(`LED_${pId}`);
        batch.set(sLedgerRef, {
            businessId: bid,
            type: 'PAYMENT_DISBURSED',
            referenceId: pId,
            amount: amount,
            balanceAfter: newBal,
            description: `Payment Paid (${paymentMode})${notes ? ' — ' + notes : ''}`,
            date: window.CoconutModule.tsToFirestore(pDateObj),
            createdAt: window.CoconutModule.tsToFirestore(new Date())
        });

        // 2. Insert Payment Record
        const payRef = db.collection('coconut_payments').doc(pId);
        batch.set(payRef, {
            businessId: bid,
            type: 'SUPPLIER_PAYMENT',
            partyId: supplierId,
            partyName: supplier.name,
            amount,
            paymentMode,
            notes,
            date: window.CoconutModule.tsToFirestore(pDateObj),
            createdAt: window.CoconutModule.tsToFirestore(new Date())
        });

        // 3. Post Balanced Double-Entry Journal
        // Dr Accounts Payable (2-2010-01)
        // Cr Cash (1-1010-01) / Bank (1-1020-01)
        const journalLines = [
            { accountCode: '2-2010-01', accountName: 'Accounts Payable (Suppliers)', debit: amount, credit: 0 }
        ];
        if (paymentMode === 'BANK' || paymentMode === 'CHEQUE') {
            journalLines.push({ accountCode: '1-1020-01', accountName: 'Bank Account', debit: 0, credit: amount });
        } else {
            journalLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: 0, credit: amount });
        }

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `Supplier Payment #${pId} — ${supplier.name}`,
            referenceType: 'SUPPLIER_PAYMENT',
            ref: `coconut_payments/${pId}`,
            date: pDateObj,
            lines: journalLines,
            batch
        });

        await batch.commit();

        window.CoconutModule.showToast('Supplier payment disbursed and ledger updated!', 'success');
        document.getElementById('supplierPaymentForm').reset();
        document.getElementById('spDate').value = window.CoconutModule.toLocalDateStr(new Date());

        await loadParties();
        await loadPaymentLogs();

    } catch (err) {
        console.error(err);
        window.CoconutModule.showToast('Failed to disburse payment: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '📤 Record Supplier Payment & Update Ledger';
    }
}
