/**
 * Coconut Wholesale Module — Activity History Logic
 */

let appCtx = null;
let allEvents = [];

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('history');

    setupEventHandlers();
    await loadConsolidatedHistory();
});

function setupEventHandlers() {
    const typeFilter = document.getElementById('historyTypeFilter');
    const searchInput = document.getElementById('historySearchInput');

    function applyFilter() {
        const type = typeFilter.value;
        const q = searchInput.value.toLowerCase().trim();

        let filtered = allEvents;
        if (type !== 'ALL') {
            filtered = filtered.filter(e => e.type === type);
        }
        if (q) {
            filtered = filtered.filter(e =>
                (e.ref && e.ref.toLowerCase().includes(q)) ||
                (e.description && e.description.toLowerCase().includes(q))
            );
        }
        renderHistoryTable(filtered);
    }

    typeFilter.addEventListener('change', applyFilter);
    searchInput.addEventListener('input', applyFilter);

    document.getElementById('btnExportCsv').onclick = handleExportCsv;
}

async function loadConsolidatedHistory() {
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const [cPurchases, hPurchases, prodRuns, sales, expenses, payments] = await Promise.all([
            db.collection('coconut_raw_material_history').where('businessId', '==', bid).get(),
            db.collection('coconut_husk_purchases').where('businessId', '==', bid).get(),
            db.collection('coconut_production_runs').where('businessId', '==', bid).get(),
            db.collection('coconut_sales').where('businessId', '==', bid).get(),
            db.collection('coconut_expenses').where('businessId', '==', bid).get(),
            db.collection('coconut_payments').where('businessId', '==', bid).get()
        ]);

        allEvents = [];

        // Coconut Purchases
        cPurchases.docs.forEach(d => {
            const p = d.data();
            if (p.isActive === false) return;
            allEvents.push({
                type: 'COCONUT_PURCHASE',
                categoryLabel: '🥥 Coconut Purchase',
                badgeClass: 'c-badge-primary',
                date: p.date || p.createdAt,
                ref: p.purchaseId || d.id,
                description: `${p.supplierName || 'Supplier'} — ${p.quantity} nuts (${p.category})`,
                amount: Number(p.totalCost) || 0
            });
        });

        // Husk Purchases
        hPurchases.docs.forEach(d => {
            const h = d.data();
            if (h.isActive === false) return;
            allEvents.push({
                type: 'HUSK_PURCHASE',
                categoryLabel: '🟤 Husk Purchase',
                badgeClass: 'c-badge-warning',
                date: h.date || h.createdAt,
                ref: h.purchaseId || d.id,
                description: `${h.supplierName || 'Supplier'} — ${h.quantityKg} kg @ Rs.${h.costPerKg}`,
                amount: Number(h.totalCost) || 0
            });
        });

        // Production Runs
        prodRuns.docs.forEach(d => {
            const r = d.data();
            if (r.isActive === false) return;
            allEvents.push({
                type: 'PRODUCTION',
                categoryLabel: '🏭 Production Run',
                badgeClass: 'c-badge-accent',
                date: r.runDate || r.createdAt,
                ref: r.runId || d.id,
                description: `${r.transformationName || 'Run'} — Produced ${r.producedQty} ${r.productName || 'units'}`,
                amount: Number(r.totalRunCost) || 0
            });
        });

        // Sales
        sales.docs.forEach(d => {
            const s = d.data();
            if (s.isActive === false) return;
            allEvents.push({
                type: 'SALE',
                categoryLabel: '🛒 Sales Invoice',
                badgeClass: 'c-badge-success',
                date: s.date || s.createdAt,
                ref: s.invoiceNo || s.saleId || d.id,
                description: `${s.customerName || 'Customer'} — Invoiced (${s.items ? s.items.length : 0} lines)`,
                amount: Number(s.amount) || 0
            });
        });

        // Expenses
        expenses.docs.forEach(d => {
            const e = d.data();
            if (e.isActive === false) return;
            allEvents.push({
                type: 'EXPENSE',
                categoryLabel: '🧾 Operational Expense',
                badgeClass: 'c-badge-danger',
                date: e.date || e.createdAt,
                ref: e.expId || d.id,
                description: `${e.category}: ${e.description}`,
                amount: Number(e.amount) || 0
            });
        });

        // Payments
        payments.docs.forEach(d => {
            const py = d.data();
            allEvents.push({
                type: 'PAYMENT',
                categoryLabel: py.type === 'CUSTOMER_RECEIPT' ? '📥 Customer Receipt' : '📤 Supplier Payment',
                badgeClass: 'c-badge-info',
                date: py.date || py.createdAt,
                ref: py.partyName || d.id,
                description: `${py.type}: ${py.notes || py.paymentMode}`,
                amount: Number(py.amount) || 0
            });
        });

        // Sort descending by date
        allEvents.sort((a, b) => {
            const ta = a.date ? (a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime()) : 0;
            const tb = b.date ? (b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) : 0;
            return tb - ta;
        });

        renderHistoryTable(allEvents);

    } catch (e) {
        console.error('History load error:', e);
    }
}

function renderHistoryTable(list) {
    const body = document.getElementById('historyTableBody');
    if (!list || !list.length) {
        body.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:24px; color:var(--c-text-muted);">No activity recorded.</td></tr>';
        return;
    }

    body.innerHTML = list.map(e => {
        const dt = window.CoconutModule.formatDateTime(e.date);

        return `
            <tr>
                <td style="font-size:12.5px; color:var(--c-text-muted);">${dt}</td>
                <td><span class="c-badge ${e.badgeClass}">${e.categoryLabel}</span></td>
                <td><span style="font-family:monospace; font-weight:600;">${window.CoconutModule.esc(e.ref)}</span></td>
                <td><strong>${window.CoconutModule.esc(e.description)}</strong></td>
                <td class="text-right" style="font-weight:800; color:var(--c-primary);">${window.CoconutModule.fmtLKR(e.amount)}</td>
            </tr>
        `;
    }).join('');
}

function handleExportCsv() {
    if (!allEvents.length) {
        alert('No events to export');
        return;
    }

    let csv = 'Date,Category,Reference,Description,Amount\n';
    allEvents.forEach(e => {
        const dt = window.CoconutModule.formatDateTime(e.date);
        const desc = `"${(e.description || '').replace(/"/g, '""')}"`;
        const ref = `"${(e.ref || '').replace(/"/g, '""')}"`;
        csv += `${dt},${e.type},${ref},${desc},${e.amount}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Coconut_Activity_Audit_${window.CoconutModule.toLocalDateStr(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
