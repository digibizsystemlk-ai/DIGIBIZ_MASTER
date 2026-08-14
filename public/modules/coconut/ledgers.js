/**
 * Coconut Wholesale Module — Customer & Supplier Ledgers Logic
 */

let appCtx = null;
let allCustomers = [];
let allSuppliers = [];

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('ledgers');

    setupEventHandlers();
    await loadInitialParties();

    // Check URL query parameters (e.g. ?type=customer&id=XYZ)
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    const idParam = urlParams.get('id');
    if (typeParam && idParam) {
        document.getElementById('partyTypeSelect').value = typeParam;
        await populatePartyDropdown();
        document.getElementById('partySelect').value = idParam;
        await loadPartyStatement();
    }
});

function setupEventHandlers() {
    const typeSelect = document.getElementById('partyTypeSelect');
    const partySelect = document.getElementById('partySelect');
    const periodSelect = document.getElementById('periodFilter');

    typeSelect.addEventListener('change', async () => {
        await populatePartyDropdown();
        await loadPartyStatement();
    });

    partySelect.addEventListener('change', loadPartyStatement);
    periodSelect.addEventListener('change', loadPartyStatement);
}

async function loadInitialParties() {
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const [cSnap, sSnap] = await Promise.all([
            db.collection('coconut_customers').where('businessId', '==', bid).get(),
            db.collection('coconut_suppliers').where('businessId', '==', bid).get()
        ]);

        allCustomers = cSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.isActive !== false);
        allSuppliers = sSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.isActive !== false);

        await populatePartyDropdown();

    } catch (e) {
        console.error('Initial parties load error:', e);
    }
}

async function populatePartyDropdown() {
    const type = document.getElementById('partyTypeSelect').value;
    const select = document.getElementById('partySelect');

    if (type === 'customer') {
        select.innerHTML = '<option value="">Select Customer...</option>' +
            allCustomers.map(c => `<option value="${c.id}">${window.CoconutModule.esc(c.name)} ${c.area ? '(' + window.CoconutModule.esc(c.area) + ')' : ''} [Bal: Rs.${window.CoconutModule.fmt(c.balance)}]</option>`).join('');
    } else {
        select.innerHTML = '<option value="">Select Supplier...</option>' +
            allSuppliers.map(s => `<option value="${s.id}">${window.CoconutModule.esc(s.name)} ${s.area ? '(' + window.CoconutModule.esc(s.area) + ')' : ''} [Bal: Rs.${window.CoconutModule.fmt(s.balance)}]</option>`).join('');
    }
}

async function loadPartyStatement() {
    const type = document.getElementById('partyTypeSelect').value;
    const partyId = document.getElementById('partySelect').value;
    const period = document.getElementById('periodFilter').value;
    const body = document.getElementById('ledgerTableBody');

    if (!partyId) {
        body.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:24px; color:var(--c-text-muted);">Please select an account above.</td></tr>';
        document.getElementById('statementPartyName').textContent = '-';
        document.getElementById('statementPartyMeta').textContent = '-';
        document.getElementById('statementTotalBilled').textContent = 'Rs. 0.00';
        document.getElementById('statementTotalSettled').textContent = 'Rs. 0.00';
        document.getElementById('statementNetBalance').textContent = 'Rs. 0.00';
        return;
    }

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        let partyObj = null;
        let ledgerSnap = null;

        if (type === 'customer') {
            partyObj = allCustomers.find(x => x.id === partyId);
            ledgerSnap = await db.collection('coconut_customers').doc(partyId).collection('ledger').get();
        } else {
            partyObj = allSuppliers.find(x => x.id === partyId);
            ledgerSnap = await db.collection('coconut_suppliers').doc(partyId).collection('ledger').get();
        }

        if (partyObj) {
            document.getElementById('statementPartyName').textContent = partyObj.name || 'Account Statement';
            document.getElementById('statementPartyMeta').textContent = `Phone: ${partyObj.phone || '-'} | Location: ${partyObj.area || '-'}`;
            document.getElementById('statementNetBalance').textContent = window.CoconutModule.fmtLKR(partyObj.balance || 0);
        }

        let entries = ledgerSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Sort chronologically
        entries.sort((a, b) => {
            const ta = a.date ? (a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime()) : 0;
            const tb = b.date ? (b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) : 0;
            return ta - tb;
        });

        // Filter by period if needed
        const now = new Date();
        const startMonth = window.CoconutModule.startOfMonth();
        const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        if (period === 'this_month') {
            entries = entries.filter(e => {
                const dt = window.CoconutModule.parseDateAny(e.date || e.createdAt);
                return dt && dt >= startMonth;
            });
        } else if (period === 'last_month') {
            entries = entries.filter(e => {
                const dt = window.CoconutModule.parseDateAny(e.date || e.createdAt);
                return dt && dt >= startLastMonth && dt <= endLastMonth;
            });
        }

        if (!entries.length) {
            body.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:24px; color:var(--c-text-muted);">No ledger entries recorded for this period.</td></tr>';
            document.getElementById('statementTotalBilled').textContent = 'Rs. 0.00';
            document.getElementById('statementTotalSettled').textContent = 'Rs. 0.00';
            return;
        }

        let totalDr = 0;
        let totalCr = 0;
        let runningBal = 0;

        let rows = '';
        entries.forEach(e => {
            const dt = window.CoconutModule.formatDateTime(e.date || e.createdAt);
            const amt = Number(e.amount) || 0;
            const isPurchaseOrSale = e.type === 'SALE' || e.type === 'PURCHASE';

            let dr = 0;
            let cr = 0;

            if (type === 'customer') {
                // For customer: Sales increase receivable (Dr), Payments decrease receivable (Cr)
                if (isPurchaseOrSale) { dr = amt; totalDr += amt; runningBal += amt; }
                else { cr = amt; totalCr += amt; runningBal -= amt; }
            } else {
                // For supplier: Purchases increase payable (Cr), Payments decrease payable (Dr)
                if (isPurchaseOrSale) { cr = amt; totalCr += amt; runningBal += amt; }
                else { dr = amt; totalDr += amt; runningBal -= amt; }
            }

            rows += `
                <tr>
                    <td style="font-size:12px; color:var(--c-text-muted);">${dt}</td>
                    <td><span style="font-family:monospace; font-weight:600;">${window.CoconutModule.esc(e.invoiceNo || e.referenceId || '-')}</span></td>
                    <td><strong>${window.CoconutModule.esc(e.description || e.type)}</strong></td>
                    <td class="text-right" style="color:${dr > 0 ? 'var(--c-text)' : '#94a3b8'};">${dr > 0 ? window.CoconutModule.fmtLKR(dr) : '-'}</td>
                    <td class="text-right" style="color:${cr > 0 ? '#166534' : '#94a3b8'};">${cr > 0 ? window.CoconutModule.fmtLKR(cr) : '-'}</td>
                    <td class="text-right" style="font-weight:800; color:var(--c-primary);">${window.CoconutModule.fmtLKR(runningBal)}</td>
                </tr>
            `;
        });

        document.getElementById('statementTotalBilled').textContent = window.CoconutModule.fmtLKR(type === 'customer' ? totalDr : totalCr);
        document.getElementById('statementTotalSettled').textContent = window.CoconutModule.fmtLKR(type === 'customer' ? totalCr : totalDr);

        body.innerHTML = rows;

    } catch (err) {
        console.error('Party statement load error:', err);
    }
}
