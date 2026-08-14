/**
 * Coconut Wholesale Module — General Ledger & Financial Statements Logic
 */

let appCtx = null;
let allJournalEntries = [];

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('accounting');

    setupTabs();
    await loadJournalAndStatements();
});

function setupTabs() {
    const tabs = document.querySelectorAll('.c-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.tab;
            document.querySelectorAll('.c-tab-content').forEach(c => c.style.display = 'none');
            const targetEl = document.getElementById(`tab-${target}`);
            if (targetEl) targetEl.style.display = 'block';
        });
    });
}

async function loadJournalAndStatements() {
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const snap = await db.collection('journal')
            .doc(bid)
            .collection('entries')
            .get();

        allJournalEntries = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const ta = a.date ? (a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime()) : 0;
                const tb = b.date ? (b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) : 0;
                return tb - ta;
            });

        document.getElementById('journalCountBadge').textContent = `${allJournalEntries.length} Entries`;

        renderJournalTable(allJournalEntries);
        computeTrialBalance(allJournalEntries);
        computeFinancialStatements(allJournalEntries);

    } catch (e) {
        console.error('Accounting load error:', e);
    }
}

function renderJournalTable(entries) {
    const body = document.getElementById('journalTableBody');
    if (!entries.length) {
        body.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:24px; color:var(--c-text-muted);">No journal entries posted yet.</td></tr>';
        return;
    }

    body.innerHTML = entries.map(entry => {
        const dt = window.CoconutModule.formatDateTime(entry.date || entry.createdAt);
        const lines = Array.isArray(entry.lines) ? entry.lines : [];

        let accountsHtml = '<div style="font-size:12px;">';
        let drHtml = '<div style="font-size:12px; text-align:right;">';
        let crHtml = '<div style="font-size:12px; text-align:right;">';

        lines.forEach(l => {
            const isDr = (Number(l.debit) || 0) > 0;
            accountsHtml += `<div style="${isDr ? '' : 'padding-left:14px; color:#64748b;'}">${l.accountCode} ${l.accountName}</div>`;
            drHtml += `<div>${isDr ? window.CoconutModule.fmtLKR(l.debit) : '-'}</div>`;
            crHtml += `<div>${!isDr ? window.CoconutModule.fmtLKR(l.credit) : '-'}</div>`;
        });

        accountsHtml += '</div>';
        drHtml += '</div>';
        crHtml += '</div>';

        return `
            <tr>
                <td style="font-size:12px; color:var(--c-text-muted);">${dt}</td>
                <td><span style="font-family:monospace; font-weight:600;">${window.CoconutModule.esc(entry.referenceType || 'GL')}</span></td>
                <td><strong>${window.CoconutModule.esc(entry.description)}</strong></td>
                <td>${accountsHtml}</td>
                <td>${drHtml}</td>
                <td>${crHtml}</td>
            </tr>
        `;
    }).join('');
}

function computeTrialBalance(entries) {
    const accounts = [
        { code: '1-1010-01', name: 'Cash in Drawer', type: 'ASSET' },
        { code: '1-1020-01', name: 'Bank Account', type: 'ASSET' },
        { code: '1-1030-01', name: 'Accounts Receivable (Customers)', type: 'ASSET' },
        { code: '1-1040-01', name: 'Inventory (Raw & Finished Goods)', type: 'ASSET' },
        { code: '2-2010-01', name: 'Accounts Payable (Suppliers)', type: 'LIABILITY' },
        { code: '2-2030-01', name: 'Loans Payable (Borrowings)', type: 'LIABILITY' },
        { code: '3-3010-01', name: "Owner's Capital", type: 'EQUITY' },
        { code: '3-3020-01', name: "Owner's Drawings", type: 'EQUITY' },
        { code: '4-4010-01', name: 'Sales Revenue', type: 'REVENUE' },
        { code: '5-5010-01', name: 'Operational Expense & Spoilage', type: 'EXPENSE' },
        { code: '5-5020-01', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE' },
        { code: '5-5050-01', name: 'Loan Interest Expense', type: 'EXPENSE' }
    ];

    let totalDr = 0;
    let totalCr = 0;
    const body = document.getElementById('trialBalanceBody');
    let rows = '';

    accounts.forEach(acc => {
        const bal = window.CoconutModule.calcAccountBalance(entries, acc.code);
        let drBal = 0;
        let crBal = 0;

        // Normal balance rule:
        // Asset & Expense = Debit normal
        // Liability, Equity, Revenue = Credit normal
        if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
            if (bal >= 0) drBal = bal;
            else crBal = Math.abs(bal);
        } else {
            if (bal >= 0) crBal = bal;
            else drBal = Math.abs(bal);
        }

        totalDr += drBal;
        totalCr += crBal;

        rows += `
            <tr>
                <td><span style="font-family:monospace; font-weight:700;">${acc.code}</span></td>
                <td>${acc.name}</td>
                <td><span class="c-badge c-badge-neutral">${acc.type}</span></td>
                <td class="text-right">${drBal > 0 ? window.CoconutModule.fmtLKR(drBal) : '-'}</td>
                <td class="text-right">${crBal > 0 ? window.CoconutModule.fmtLKR(crBal) : '-'}</td>
            </tr>
        `;
    });

    const isBalanced = Math.abs(totalDr - totalCr) < 0.01;
    const statusBadge = document.getElementById('trialBalanceStatus');
    if (isBalanced) {
        statusBadge.textContent = '⚖️ Invariant Verified: Balanced';
        statusBadge.className = 'c-badge c-badge-success';
    } else {
        statusBadge.textContent = `⚠️ Imbalance Discrepancy: ${window.CoconutModule.fmtLKR(Math.abs(totalDr - totalCr))}`;
        statusBadge.className = 'c-badge c-badge-danger';
    }

    rows += `
        <tr style="background:#f8fafc; font-weight:900; font-size:14px; border-top:2px solid var(--c-border);">
            <td colspan="3">TOTAL TRIAL BALANCE</td>
            <td class="text-right" style="color:var(--c-primary);">${window.CoconutModule.fmtLKR(totalDr)}</td>
            <td class="text-right" style="color:var(--c-primary);">${window.CoconutModule.fmtLKR(totalCr)}</td>
        </tr>
    `;

    body.innerHTML = rows;
}

function computeFinancialStatements(entries) {
    const cash = window.CoconutModule.calcAccountBalance(entries, '1-1010-01');
    const bank = window.CoconutModule.calcAccountBalance(entries, '1-1020-01');
    const ar = window.CoconutModule.calcAccountBalance(entries, '1-1030-01');
    const inv = window.CoconutModule.calcAccountBalance(entries, '1-1040-01');

    const ap = window.CoconutModule.calcAccountBalance(entries, '2-2010-01');
    const loans = window.CoconutModule.calcAccountBalance(entries, '2-2030-01');

    const cap = window.CoconutModule.calcAccountBalance(entries, '3-3010-01');
    const draw = window.CoconutModule.calcAccountBalance(entries, '3-3020-01');
    const equityNet = cap - draw;

    const rev = window.CoconutModule.calcAccountBalance(entries, '4-4010-01');
    const cogs = window.CoconutModule.calcAccountBalance(entries, '5-5020-01');
    const opex = window.CoconutModule.calcAccountBalance(entries, '5-5010-01');
    const interest = window.CoconutModule.calcAccountBalance(entries, '5-5050-01');

    const grossProfit = rev - cogs;
    const netProfit = grossProfit - opex - interest;

    // P&L UI
    document.getElementById('pnlRevenue').textContent = window.CoconutModule.fmtLKR(rev);
    document.getElementById('pnlCogs').textContent = window.CoconutModule.fmtLKR(cogs);
    document.getElementById('pnlGrossProfit').textContent = window.CoconutModule.fmtLKR(grossProfit);
    document.getElementById('pnlOpex').textContent = window.CoconutModule.fmtLKR(opex);
    document.getElementById('pnlInterest').textContent = window.CoconutModule.fmtLKR(interest);
    document.getElementById('pnlNetProfit').textContent = window.CoconutModule.fmtLKR(netProfit);

    // Balance Sheet UI
    document.getElementById('bsCash').textContent = window.CoconutModule.fmtLKR(cash);
    document.getElementById('bsBank').textContent = window.CoconutModule.fmtLKR(bank);
    document.getElementById('bsReceivables').textContent = window.CoconutModule.fmtLKR(ar);
    document.getElementById('bsInventory').textContent = window.CoconutModule.fmtLKR(inv);

    const totalAssets = cash + bank + ar + inv;
    document.getElementById('bsTotalAssets').textContent = window.CoconutModule.fmtLKR(totalAssets);

    document.getElementById('bsPayables').textContent = window.CoconutModule.fmtLKR(ap);
    document.getElementById('bsLoans').textContent = window.CoconutModule.fmtLKR(loans);
    const totalLiab = ap + loans;
    document.getElementById('bsTotalLiabilities').textContent = window.CoconutModule.fmtLKR(totalLiab);

    document.getElementById('bsEquity').textContent = window.CoconutModule.fmtLKR(equityNet);
    document.getElementById('bsRetainedEarnings').textContent = window.CoconutModule.fmtLKR(netProfit);
    const totalEquity = equityNet + netProfit;
    document.getElementById('bsTotalEquity').textContent = window.CoconutModule.fmtLKR(totalEquity);

    const totalLiabAndEquity = totalLiab + totalEquity;
    document.getElementById('bsTotalLiabEquity').textContent = window.CoconutModule.fmtLKR(totalLiabAndEquity);
}
