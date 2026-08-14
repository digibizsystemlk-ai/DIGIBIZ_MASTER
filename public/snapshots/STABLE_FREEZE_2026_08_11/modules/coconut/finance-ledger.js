/**
 * Coconut Wholesale Module — Finance & Banking Ledger Logic
 */

let appCtx = null;
let allTx = [];

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('finance-ledger');
    document.getElementById('txDate').value = window.CoconutModule.toLocalDateStr(new Date());

    setupEventHandlers();
    await loadBalancesAndTransactions();
});

function setupEventHandlers() {
    const modal = document.getElementById('transferModal');
    document.getElementById('btnOpenNewTx').onclick = () => {
        document.getElementById('transferForm').reset();
        document.getElementById('txDate').value = window.CoconutModule.toLocalDateStr(new Date());
        modal.classList.add('open');
    };
    document.getElementById('btnCloseTxModal').onclick = () => modal.classList.remove('open');
    document.getElementById('btnCancelTx').onclick = () => modal.classList.remove('open');

    document.getElementById('transferForm').addEventListener('submit', handleSaveTransaction);
}

async function loadBalancesAndTransactions() {
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const [jSnap, txSnap] = await Promise.all([
            db.collection('journal').doc(bid).collection('entries').get(),
            db.collection('coconut_banks').doc(bid).collection('transactions').get()
        ]);

        const entries = jSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const cashBal = window.CoconutModule.calcAccountBalance(entries, '1-1010-01');
        const bankBal = window.CoconutModule.calcAccountBalance(entries, '1-1020-01');
        const totalLiquid = cashBal + bankBal;

        document.getElementById('liveCashBalance').textContent = window.CoconutModule.fmtLKR(cashBal);
        document.getElementById('liveBankBalance').textContent = window.CoconutModule.fmtLKR(bankBal);
        document.getElementById('liveTotalLiquid').textContent = window.CoconutModule.fmtLKR(totalLiquid);

        allTx = txSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const ta = a.date ? (a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime()) : 0;
                const tb = b.date ? (b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) : 0;
                return tb - ta;
            });

        renderTxTable(allTx);

    } catch (e) {
        console.error('Finance ledger load error:', e);
    }
}

function renderTxTable(list) {
    const body = document.getElementById('bankTxTableBody');
    if (!list || !list.length) {
        body.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:24px; color:var(--c-text-muted);">No finance transactions recorded yet.</td></tr>';
        return;
    }

    body.innerHTML = list.map(tx => {
        const dt = window.CoconutModule.formatDateTime(tx.date || tx.createdAt);
        const amt = Number(tx.amount) || 0;

        let cashImpact = '-';
        let bankImpact = '-';

        if (tx.type === 'CASH_DEPOSIT') {
            cashImpact = `<span style="color:var(--c-danger); font-weight:700;">-${window.CoconutModule.fmtLKR(amt)}</span>`;
            bankImpact = `<span style="color:#166534; font-weight:700;">+${window.CoconutModule.fmtLKR(amt)}</span>`;
        } else if (tx.type === 'CASH_WITHDRAWAL') {
            cashImpact = `<span style="color:#166534; font-weight:700;">+${window.CoconutModule.fmtLKR(amt)}</span>`;
            bankImpact = `<span style="color:var(--c-danger); font-weight:700;">-${window.CoconutModule.fmtLKR(amt)}</span>`;
        } else if (tx.type === 'CAPITAL_INJECTION') {
            cashImpact = `<span style="color:#166534; font-weight:700;">+${window.CoconutModule.fmtLKR(amt)}</span>`;
        } else if (tx.type === 'OWNER_DRAWING') {
            cashImpact = `<span style="color:var(--c-danger); font-weight:700;">-${window.CoconutModule.fmtLKR(amt)}</span>`;
        }

        return `
            <tr>
                <td style="font-size:12px; color:var(--c-text-muted);">${dt}</td>
                <td><span class="c-badge c-badge-neutral">${window.CoconutModule.esc(tx.type)}</span></td>
                <td><strong>${window.CoconutModule.esc(tx.description || tx.notes)}</strong></td>
                <td class="text-right">${cashImpact}</td>
                <td class="text-right">${bankImpact}</td>
                <td class="text-right" style="font-weight:800; color:var(--c-primary);">${window.CoconutModule.fmtLKR(amt)}</td>
            </tr>
        `;
    }).join('');
}

async function handleSaveTransaction(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveTx');
    btn.disabled = true;
    btn.textContent = 'Posting Transaction...';

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const dateVal = document.getElementById('txDate').value;
        const type = document.getElementById('txType').value;
        const amount = Number(document.getElementById('txAmount').value) || 0;
        const notes = document.getElementById('txNotes').value.trim();

        if (amount <= 0 || !notes) {
            alert('Please specify amount and description');
            btn.disabled = false;
            btn.textContent = 'Post Transaction';
            return;
        }

        const txId = `FTX_${window.CoconutModule.uid('fin')}`;
        const txDateObj = window.CoconutModule.parseDateAny(dateVal) || new Date();

        const batch = db.batch();

        // 1. Save Bank Transaction Doc
        const txRef = db.collection('coconut_banks').doc(bid).collection('transactions').doc(txId);
        batch.set(txRef, {
            businessId: bid,
            txId,
            type,
            amount,
            notes,
            description: notes,
            date: window.CoconutModule.tsToFirestore(txDateObj),
            createdAt: window.CoconutModule.tsToFirestore(new Date())
        });

        // 2. Post Balanced Journal Lines
        const journalLines = [];
        if (type === 'CASH_DEPOSIT') {
            // Dr Bank Account (1-1020-01), Cr Cash in Drawer (1-1010-01)
            journalLines.push({ accountCode: '1-1020-01', accountName: 'Bank Account', debit: amount, credit: 0 });
            journalLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: 0, credit: amount });
        } else if (type === 'CASH_WITHDRAWAL') {
            // Dr Cash in Drawer (1-1010-01), Cr Bank Account (1-1020-01)
            journalLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: amount, credit: 0 });
            journalLines.push({ accountCode: '1-1020-01', accountName: 'Bank Account', debit: 0, credit: amount });
        } else if (type === 'CAPITAL_INJECTION') {
            // Dr Cash in Drawer (1-1010-01), Cr Owner's Capital (3-3010-01)
            journalLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: amount, credit: 0 });
            journalLines.push({ accountCode: '3-3010-01', accountName: "Owner's Capital", debit: 0, credit: amount });
        } else if (type === 'OWNER_DRAWING') {
            // Dr Owner's Drawings (3-3020-01), Cr Cash in Drawer (1-1010-01)
            journalLines.push({ accountCode: '3-3020-01', accountName: "Owner's Drawings", debit: amount, credit: 0 });
            journalLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: 0, credit: amount });
        }

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `Finance Transaction: ${notes} [${type}]`,
            referenceType: 'FINANCE_MOVEMENT',
            ref: `coconut_banks/${bid}/transactions/${txId}`,
            date: txDateObj,
            lines: journalLines,
            batch
        });

        await batch.commit();

        window.CoconutModule.showToast('Transaction posted & GL updated!', 'success');
        document.getElementById('transferModal').classList.remove('open');

        await loadBalancesAndTransactions();

    } catch (err) {
        console.error(err);
        window.CoconutModule.showToast('Failed to post transaction: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Post Transaction';
    }
}
